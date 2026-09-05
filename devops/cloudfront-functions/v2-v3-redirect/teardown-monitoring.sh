#!/usr/bin/env bash
# Reverse deploy-monitoring.sh: remove the seven monitoring checks created for the
# V2->V3 redirect cutover soak, plus the supporting resources that exist only to
# feed them.
#
#  1. CloudWatch dashboard
#  2. the five alarms
#  3. the error-fallthrough log metric filter
#  4. both Synthetics canaries, with their generated cwsyn-* Lambdas
#  5. the canary Lambda log groups (Synthetics does not remove these itself)
#  6. the canary artifact bucket
#  7. the canary execution role
#
# Scope boundary: the redirect itself stays up. This never touches the CloudFront
# function, the clone distribution, the temp subdomain, or Route 53. The function's
# own log group is kept because the live function still writes to it; only the
# metric filter on it is removed.
#
# Runs as a dry run unless passed --apply.

set -euo pipefail
cd "$(dirname "$0")"
source ./config.env

REGION_US_E1="us-east-1"
LOG_GROUP="/aws/cloudfront/function/$FUNCTION_NAME"

# These literals must match the names deploy-monitoring.sh creates.
DASHBOARD_NAME="codap-v2-v3-redirect"
CANARY_PREFIX="codap-v2-v3"
CANARY_LOG_PREFIX="/aws/lambda/cwsyn-$CANARY_PREFIX"
ALARMS=(
  "codap-v2-v3-redirect-FunctionExecutionErrors"
  "codap-v2-v3-redirect-error-fallthrough"
  "codap-v2-v3-redirect-FunctionThrottles"
  "codap-v2-v3-redirect-5xxErrorRate"
  "codap-v2-v3-redirect-4xxErrorRate"
)

# How long to wait for a canary to reach a state delete-canary accepts.
CANARY_SETTLE_TIMEOUT_SECS=300

APPLY=false
[ "${1:-}" = "--apply" ] && APPLY=true

run() {
  if $APPLY; then
    echo "  + $*"
    "$@"
  else
    echo "  [dry-run] $*"
  fi
}

canary_state() {
  aws synthetics get-canary --name "$1" --region "$REGION_US_E1" \
    --query "Canary.Status.State" --output text
}

# CanaryState is one of CREATING, READY, STARTING, RUNNING, UPDATING, STOPPING,
# STOPPED, ERROR, DELETING. delete-canary is only accepted once the canary has
# come to rest; every other state is either running or mid-transition.
canary_settled() {
  case "$1" in
    READY|STOPPED|ERROR) return 0 ;;
    *) return 1 ;;
  esac
}

$APPLY || echo "DRY RUN. Re-run with --apply to actually delete."
echo

echo "1) dashboard $DASHBOARD_NAME"
run aws cloudwatch delete-dashboards --dashboard-names "$DASHBOARD_NAME" \
  --region "$REGION_US_E1"

echo "2) alarms"
run aws cloudwatch delete-alarms --alarm-names "${ALARMS[@]}" --region "$REGION_US_E1"

echo "3) error-fallthrough metric filter (the log group itself is kept)"
run aws logs delete-metric-filter \
  --log-group-name "$LOG_GROUP" \
  --filter-name "codap-v2-v3-redirect-error-fallthrough" \
  --region "$REGION_US_E1"

# A RUNNING canary cannot be deleted, so stop it and wait for the state to settle
# first. --delete-lambda removes the generated cwsyn-* Lambda and its layers, which
# are otherwise left orphaned.
echo "4) Synthetics canaries"
for canary in v3-reachability redirect-correctness; do
  name="$CANARY_PREFIX-$canary"
  if ! aws synthetics get-canary --name "$name" --region "$REGION_US_E1" >/dev/null 2>&1; then
    echo "    canary $name not present, skipping"
    continue
  fi
  state=$(canary_state "$name")
  if [ "$state" = "RUNNING" ]; then
    run aws synthetics stop-canary --name "$name" --region "$REGION_US_E1"
  fi
  # Any unsettled state has to be waited out, including a canary that was already
  # STOPPING or mid-transition before this script ran.
  if $APPLY && ! canary_settled "$state"; then
    echo -n "    waiting for $name to settle (was $state)"
    deadline=$((SECONDS + CANARY_SETTLE_TIMEOUT_SECS))
    while ! canary_settled "$state"; do
      if [ "$SECONDS" -ge "$deadline" ]; then
        echo
        echo "FAIL: canary $name is still $state after ${CANARY_SETTLE_TIMEOUT_SECS}s."
        echo "      delete-canary would be rejected. Re-run once it has settled."
        exit 1
      fi
      echo -n "."
      sleep 5
      state=$(canary_state "$name")
    done
    echo " $state"
  fi
  run aws synthetics delete-canary --name "$name" --delete-lambda --region "$REGION_US_E1"
done

# Deleting a Lambda leaves its log group behind, and a canary re-pointed by
# delete+recreate leaves a log group per generation. Discover by prefix so the
# orphans from earlier generations are caught too.
echo "5) canary Lambda log groups"
# mapfile succeeds whatever the command feeding it did, so a failed AWS listing
# would arrive here as "nothing to delete" and the teardown would report success
# with the resources still in place. Capture first so set -e sees the failure.
canary_log_groups=$(aws logs describe-log-groups \
  --log-group-name-prefix "$CANARY_LOG_PREFIX" \
  --region "$REGION_US_E1" \
  --query "logGroups[].logGroupName" --output text)
mapfile -t CANARY_LOG_GROUPS < <(printf '%s\n' "$canary_log_groups" | tr '\t' '\n')
for lg in "${CANARY_LOG_GROUPS[@]}"; do
  [ -z "$lg" ] && continue
  run aws logs delete-log-group --log-group-name "$lg" --region "$REGION_US_E1"
done

# The bucket is unversioned, so a recursive delete empties it completely. Deleting
# the bucket also releases the globally unique name.
echo "6) canary artifact bucket"
if [ -z "${SYNTHETICS_ARTIFACT_BUCKET:-}" ]; then
  echo "    SYNTHETICS_ARTIFACT_BUCKET not set in config.env, skipping"
else
  run aws s3 rm "s3://$SYNTHETICS_ARTIFACT_BUCKET" --recursive
  run aws s3api delete-bucket --bucket "$SYNTHETICS_ARTIFACT_BUCKET" \
    --region "$REGION_US_E1"
fi

echo "7) canary execution role"
if [ -z "${SYNTHETICS_ROLE_ARN:-}" ]; then
  echo "    SYNTHETICS_ROLE_ARN not set in config.env, skipping"
else
  role_name="${SYNTHETICS_ROLE_ARN##*/}"
  inline_policies=$(aws iam list-role-policies --role-name "$role_name" \
    --query "PolicyNames" --output text)
  mapfile -t INLINE_POLICIES < <(printf '%s\n' "$inline_policies" | tr '\t' '\n')
  for policy in "${INLINE_POLICIES[@]}"; do
    [ -z "$policy" ] && continue
    run aws iam delete-role-policy --role-name "$role_name" --policy-name "$policy"
  done
  attached_policies=$(aws iam list-attached-role-policies --role-name "$role_name" \
    --query "AttachedPolicies[].PolicyArn" --output text)
  mapfile -t ATTACHED_POLICIES < <(printf '%s\n' "$attached_policies" | tr '\t' '\n')
  for arn in "${ATTACHED_POLICIES[@]}"; do
    [ -z "$arn" ] && continue
    run aws iam detach-role-policy --role-name "$role_name" --policy-arn "$arn"
  done
  run aws iam delete-role --role-name "$role_name"
fi

echo
if $APPLY; then
  echo "teardown-monitoring.sh complete."
else
  echo "Dry run complete. Nothing was deleted."
fi
