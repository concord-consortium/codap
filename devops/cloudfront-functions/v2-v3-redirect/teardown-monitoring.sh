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
#  6. the canary code packages and run artifacts in the Synthetics bucket
#
# Scope boundary: the redirect itself stays up. This never touches the CloudFront
# function, the clone distribution, the temp subdomain, or Route 53. The function's
# own log group is kept because the live function still writes to it; only the
# metric filter on it is removed.
#
# The Synthetics artifact bucket and execution role are also kept. deploy-monitoring.sh
# does not create them (PREFLIGHT.md has the operator supply pre-existing ones, which may
# be shared with other CODAP canaries), so only the objects the deploy script writes are
# removed. Delete the bucket and role by hand if they were dedicated to this soak.
#
# Runs as a dry run unless passed --apply. Every delete tolerates an already-absent
# resource, so a run interrupted partway can be re-run to finish the job.

set -euo pipefail
cd "$(dirname "$0")"
source ./config.env

REGION_US_E1="us-east-1"
LOG_GROUP="/aws/cloudfront/function/$FUNCTION_NAME"

# These literals must match the names deploy-monitoring.sh creates.
DASHBOARD_NAME="codap-v2-v3-redirect"
CANARY_PREFIX="codap-v2-v3"
CANARY_LOG_PREFIX="/aws/lambda/cwsyn-$CANARY_PREFIX"
CANARIES=(v3-reachability redirect-correctness)
ALARMS=(
  "codap-v2-v3-redirect-FunctionExecutionErrors"
  "codap-v2-v3-redirect-error-fallthrough"
  "codap-v2-v3-redirect-FunctionThrottles"
  "codap-v2-v3-redirect-5xxErrorRate"
  "codap-v2-v3-redirect-4xxErrorRate"
)

# How long to wait for a canary to reach a state delete-canary accepts, and then for
# the delete itself to complete.
CANARY_WAIT_TIMEOUT_SECS=300

usage() {
  echo "usage: $(basename "$0") [--apply]" >&2
  exit 2
}

APPLY=false
case "${1:-}" in
  --apply) APPLY=true ;;
  "") ;;
  *) usage ;;
esac
[ "$#" -le 1 ] || usage

# Each service spells "it is not there" its own way. A delete that reports one of
# these has nothing left to do, which is what makes the script re-runnable.
NOT_FOUND_RE='ResourceNotFound|DashboardNotFound|NoSuchBucket|NoSuchKey|NoSuchEntity|NotFoundException'

_run() {
  local tolerate="$1"; shift
  if ! $APPLY; then
    echo "  [dry-run] $*"
    return 0
  fi
  echo "  + $*"
  local output status=0
  output=$("$@" 2>&1) || status=$?
  if [ "$status" -ne 0 ] && $tolerate && printf '%s' "$output" | grep -Eq "$NOT_FOUND_RE"; then
    echo "    already absent"
    return 0
  fi
  if [ -n "$output" ]; then
    printf '%s\n' "$output"
  fi
  return "$status"
}

run() { _run false "$@"; }
run_optional() { _run true "$@"; }

canary_state() {
  aws synthetics get-canary --name "$1" --region "$REGION_US_E1" \
    --query "Canary.Status.State" --output text
}

canary_exists() {
  aws synthetics get-canary --name "$1" --region "$REGION_US_E1" >/dev/null 2>&1
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
run_optional aws cloudwatch delete-dashboards --dashboard-names "$DASHBOARD_NAME" \
  --region "$REGION_US_E1"

# delete-alarms is silent about names that do not exist.
echo "2) alarms"
run aws cloudwatch delete-alarms --alarm-names "${ALARMS[@]}" --region "$REGION_US_E1"

echo "3) error-fallthrough metric filter (the log group itself is kept)"
run_optional aws logs delete-metric-filter \
  --log-group-name "$LOG_GROUP" \
  --filter-name "codap-v2-v3-redirect-error-fallthrough" \
  --region "$REGION_US_E1"

# A RUNNING canary cannot be deleted, so stop it and wait for the state to settle
# first. --delete-lambda removes the generated cwsyn-* Lambda and its layers, which
# are otherwise left orphaned.
echo "4) Synthetics canaries"
for canary in "${CANARIES[@]}"; do
  name="$CANARY_PREFIX-$canary"
  if ! canary_exists "$name"; then
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
    deadline=$((SECONDS + CANARY_WAIT_TIMEOUT_SECS))
    while ! canary_settled "$state"; do
      if [ "$SECONDS" -ge "$deadline" ]; then
        echo
        echo "FAIL: canary $name is still $state after ${CANARY_WAIT_TIMEOUT_SECS}s."
        echo "      delete-canary would be rejected. Re-run once it has settled."
        exit 1
      fi
      echo -n "."
      sleep 5
      state=$(canary_state "$name")
      # A canary that was STARTING when this ran was never sent a stop: it reaches
      # RUNNING on its own and would sit there until the timeout. Re-issuing the stop
      # is harmless once it is already STOPPING.
      if [ "$state" = "RUNNING" ]; then
        aws synthetics stop-canary --name "$name" --region "$REGION_US_E1" >/dev/null 2>&1 || true
      fi
    done
    echo " $state"
  fi
  run aws synthetics delete-canary --name "$name" --delete-lambda --region "$REGION_US_E1"
  # delete-canary is asynchronous. Wait for the canary to go before step 6 empties its
  # artifact prefix, so a run still in flight cannot write objects after the delete.
  if $APPLY; then
    echo -n "    waiting for $name to disappear"
    deadline=$((SECONDS + CANARY_WAIT_TIMEOUT_SECS))
    while canary_exists "$name"; do
      if [ "$SECONDS" -ge "$deadline" ]; then
        echo
        echo "FAIL: canary $name still exists ${CANARY_WAIT_TIMEOUT_SECS}s after delete-canary."
        echo "      Re-run once it has finished deleting."
        exit 1
      fi
      echo -n "."
      sleep 5
    done
    echo " gone"
  fi
done

# Deleting a Lambda leaves its log group behind, and a canary re-pointed by
# delete+recreate leaves a log group per generation. Discover by prefix so the
# orphans from earlier generations are caught too.
echo "5) canary Lambda log groups"
# Captured rather than piped into the loop: pipefail makes a failed listing abort the
# script here, instead of reaching the loop as "nothing to delete" and letting the
# teardown report success with the log groups still standing.
canary_log_groups=$(aws logs describe-log-groups \
  --log-group-name-prefix "$CANARY_LOG_PREFIX" \
  --region "$REGION_US_E1" \
  --query "logGroups[].logGroupName" --output text | tr '\t' '\n')
while IFS= read -r lg; do
  [ -z "$lg" ] && continue
  run_optional aws logs delete-log-group --log-group-name "$lg" --region "$REGION_US_E1"
done <<< "$canary_log_groups"

# The prefixes deploy-monitoring.sh writes: one code package per canary under code/,
# and one run-artifact prefix per canary. Nothing else in the bucket is touched.
echo "6) canary code packages and run artifacts"
if [ -z "${SYNTHETICS_ARTIFACT_BUCKET:-}" ]; then
  echo "    SYNTHETICS_ARTIFACT_BUCKET not set in config.env, skipping"
else
  for canary in "${CANARIES[@]}"; do
    run_optional aws s3 rm "s3://$SYNTHETICS_ARTIFACT_BUCKET/$CANARY_PREFIX-$canary/" --recursive
    run_optional aws s3 rm "s3://$SYNTHETICS_ARTIFACT_BUCKET/code/$CANARY_PREFIX-$canary.zip"
  done
fi

echo
if $APPLY; then
  echo "teardown-monitoring.sh complete."
  echo "The Synthetics artifact bucket and execution role were left in place."
else
  echo "Dry run complete. Nothing was deleted."
fi
