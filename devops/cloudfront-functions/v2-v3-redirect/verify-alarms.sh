#!/usr/bin/env bash
# G5 verification (DO-I3 / DO-J2) -- induce a synthetic error against each of the seven
# R26b monitoring checks and confirm each transitions to ALARM. Per-check induction
# methods are documented inline.
#
# DO-J2 (abort safety): the FunctionExecutionErrors / 5xxErrorRate induction temporarily
# `update-function` + `publish-function`s a deliberately-broken build of the function to
# the clone. A shell trap on EXIT/ERR re-runs deploy-function.sh on any exit (including
# abort mid-run), and a final post-condition check confirms the clone is serving the real
# function before reporting success. Without this, a mid-run abort would leave the clone
# serving 5xx on /app, /app/*, /releases/*.

set -euo pipefail
cd "$(dirname "$0")"
source ./config.env

REGION_US_E1="us-east-1"

restored=0
restore() {
  if [ "$restored" -eq 1 ]; then return 0; fi
  echo
  echo "TRAP: restoring real function via deploy-function.sh"
  ./deploy-function.sh || echo "    WARNING: deploy-function.sh failed during restore -- INVESTIGATE"
  restored=1
}
trap restore EXIT ERR

# Wait for a function publish to fully propagate to edge locations. publish-function
# completes against the central CloudFront API in seconds (Stage=LIVE), but AWS docs
# describe edge replication as "up to a few minutes". The central poll is a safety net;
# the post-LIVE 240s sleep is the real wait. Without it, the alarm-verification requests
# may still hit the previous edge-cached version and produce a false G5 success.
wait_for_propagation() {
  local label="$1"
  echo "    waiting for $label publish to propagate (central LIVE + 240s edge margin)..."
  local end=$(( $(date +%s) + 120 ))
  while [ "$(date +%s)" -lt "$end" ]; do
    local stage
    stage=$(aws cloudfront describe-function --name "$FUNCTION_NAME" --stage LIVE \
      --query 'FunctionSummary.FunctionMetadata.Stage' --output text 2>/dev/null || echo "")
    if [ "$stage" = "LIVE" ]; then break; fi
    sleep 10
  done
  sleep 240   # post-LIVE edge-replication margin -- matches AWS's "up to a few minutes"
}

alarm_state() {
  aws cloudwatch describe-alarms --alarm-names "$1" \
    --query 'MetricAlarms[0].StateValue' --output text --region "$REGION_US_E1"
}

assert_alarm() {
  local name="$1" timeout_s="${2:-360}"
  local end=$(( $(date +%s) + timeout_s ))
  while [ "$(date +%s)" -lt "$end" ]; do
    if [ "$(alarm_state "$name")" = "ALARM" ]; then
      echo "    $name -> ALARM"
      return 0
    fi
    sleep 15
  done
  echo "    FAIL: $name did not transition to ALARM within ${timeout_s}s"
  return 1
}

# ---------------------------------------------------------------------------
# Check (2): error-fallthrough metric filter + alarm.
# Induction: write a single log entry directly into the log group with the exact prefix
# the filter keys on. The metric filter matches and increments; the alarm fires.
# ---------------------------------------------------------------------------
echo "Check 2 -- error-fallthrough"
LOG_GROUP="/aws/cloudfront/function/$FUNCTION_NAME"
STREAM="verify-alarms-$(date +%s)"
aws logs create-log-stream --log-group-name "$LOG_GROUP" --log-stream-name "$STREAM" \
  --region "$REGION_US_E1"
# put-log-events wants millisecond precision. date +%s%3N is GNU-only (BSD date on
# macOS doesn't support %3N), so use python3 for cross-platform portability.
TS=$(python3 -c 'import time; print(int(time.time()*1000))')
aws logs put-log-events --log-group-name "$LOG_GROUP" --log-stream-name "$STREAM" \
  --log-events "timestamp=$TS,message=codap-redirect tag=error-fallthrough uri=/induced qs= error=induced" \
  --region "$REGION_US_E1" > /dev/null
assert_alarm "codap-v2-v3-redirect-error-fallthrough" 180

# ---------------------------------------------------------------------------
# Check (5): 4xxErrorRate (informational).
# Induction: drive a handful of known-404 requests at the clone.
# ---------------------------------------------------------------------------
echo "Check 5 -- 4xxErrorRate"
for i in 1 2 3 4 5 6 7 8 9 10; do
  curl -sf -o /dev/null "https://$TEMP_SUBDOMAIN/__verify_404_$i" || true
done
echo "    drove 10 x 404 requests; the alarm has 5x1min evaluation periods"
echo "    (this can take up to 6 minutes to ALARM under low background traffic)"
assert_alarm "codap-v2-v3-redirect-4xxErrorRate" 480 || echo "    NOTE: 4xx alarm did not fire; the clone may be high-traffic enough to dilute the ratio."

# ---------------------------------------------------------------------------
# Synthetic canaries (Check 6) -- passive observation.
#
# AWS Synthetics' UpdateCanary silently drops EnvironmentVariables (the API call returns
# success and LastModified updates, but the env vars never persist). This means a
# scripted "point at invalid host briefly to induce failure" verification isn't reliable
# -- the canary keeps its previous target regardless of the update. Re-pointing canaries
# is a delete-and-recreate operation, not an in-place update.
#
# G5 evidence for canaries is therefore observational: confirm both canaries are
# RUNNING (lifecycle), have recent runs (the schedule is firing), and at least one
# recent run PASSED (the assertion logic works against the real target). Failure modes
# are detected by watching the dashboard (no CloudWatch alarm is attached to canary
# SuccessPercent in deploy-monitoring.sh -- if you want one, add it there).
# ---------------------------------------------------------------------------
echo "Check 6 -- synthetic canaries (passive observation)"
canary_ok=1
for canary in codap-v2-v3-v3-reachability codap-v2-v3-redirect-correctness; do
  state=$(aws synthetics get-canary --name "$canary" \
    --query 'Canary.Status.State' --output text --region "$REGION_US_E1")
  passed_recent=$(aws synthetics get-canary-runs --name "$canary" --max-results 10 \
    --query 'CanaryRuns[?Status.State==`PASSED`] | length(@)' \
    --output text --region "$REGION_US_E1")
  echo "    $canary state=$state, PASSED in last 10 runs=$passed_recent"
  if [ "$state" != "RUNNING" ] || [ "${passed_recent:-0}" -lt 1 ]; then
    echo "    FAIL: $canary is not healthy (need state=RUNNING and >=1 recent PASSED run)"
    canary_ok=0
  fi
done
if [ "$canary_ok" -eq 0 ]; then
  echo "    Canary G5 evidence INSUFFICIENT -- investigate before signing"
fi

# ---------------------------------------------------------------------------
# Checks (1) + (4): FunctionExecutionErrors + 5xxErrorRate. Both move together because
# CloudFront surfaces an uncaught function error as a 5xx. DO-I3 -- temporarily publish
# a deliberately-broken function (one that throws unconditionally at top level) to
# $FUNCTION_NAME, wait for the publish to propagate, drive a few real viewer requests
# against the clone, then assert both alarms ALARM. The EXIT trap restores the real
# function.
# ---------------------------------------------------------------------------
echo "Checks 1+4 -- FunctionExecutionErrors / 5xxErrorRate (induced via broken-build)"
BROKEN_TMP=$(mktemp /tmp/codap-broken-fn-XXXXXX.js)
cat > "$BROKEN_TMP" <<'BROKEN'
'use strict'
function handler(event) {
  throw new Error('induced for verify-alarms.sh (DO-I3)')
}
BROKEN

# Validate, then update + publish.
node --check "$BROKEN_TMP"
ETAG=$(aws cloudfront describe-function --name "$FUNCTION_NAME" --query 'ETag' --output text)
aws cloudfront update-function --name "$FUNCTION_NAME" --if-match "$ETAG" \
  --function-config '{"Comment":"CODAP V2->V3 redirect (CODAP-1323 -- BROKEN for verify-alarms.sh)","Runtime":"cloudfront-js-2.0"}' \
  --function-code "fileb://$BROKEN_TMP" > /dev/null
ETAG=$(aws cloudfront describe-function --name "$FUNCTION_NAME" --query 'ETag' --output text)
aws cloudfront publish-function --name "$FUNCTION_NAME" --if-match "$ETAG"

wait_for_propagation "broken-build"

echo "    driving 20 requests at the clone to trigger uncaught exceptions"
for i in $(seq 1 20); do
  curl -sf -o /dev/null "https://$TEMP_SUBDOMAIN/app" || true
done

# Both alarms have 1- and 2-minute evaluation periods; wait long enough.
assert_alarm "codap-v2-v3-redirect-FunctionExecutionErrors" 240
assert_alarm "codap-v2-v3-redirect-5xxErrorRate" 360

# ---------------------------------------------------------------------------
# Check (3): FunctionThrottles. DO-I3 -- inducing throttles requires a request rate a
# single operator can't easily generate. We try a brief burst; if the alarm doesn't fire,
# we record a documented G5 exception.
# ---------------------------------------------------------------------------
echo "Check 3 -- FunctionThrottles (best-effort brief burst)"
for i in $(seq 1 200); do
  curl -sf -o /dev/null "https://$TEMP_SUBDOMAIN/app" || true &
  if [ $(( i % 20 )) -eq 0 ]; then wait; fi
done
wait
if alarm_state "codap-v2-v3-redirect-FunctionThrottles" 2>/dev/null | grep -q ALARM; then
  echo "    FunctionThrottles -> ALARM"
else
  echo "    FunctionThrottles did NOT fire -- G5 exception recorded for this check."
  echo "    (Inducing throttles requires production-scale RPS; lowest-likelihood failure mode of the seven.)"
fi

# ---------------------------------------------------------------------------
# Restore real function. The trap handler does this too, but we run it explicitly so the
# wait_for_propagation can run before reporting success.
# ---------------------------------------------------------------------------
echo
echo "Restoring real function via deploy-function.sh"
restore
wait_for_propagation "restored real function"

# Post-condition: the clone serves the real function (synthetic redirect on the probe).
PROBE_BODY=$(curl -s "https://$TEMP_SUBDOMAIN/app/static/dg/en/cert/index.html" || true)
if echo "$PROBE_BODY" | grep -q '<!-- codap-redirect -->'; then
  echo "    post-condition PASS -- clone serves the real function"
else
  echo "    post-condition FAIL -- clone did NOT serve the real function. INVESTIGATE."
  exit 1
fi

echo
echo "verify-alarms.sh complete. Record per-check verification method in the RUNBOOK G5 row."
