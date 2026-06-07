#!/usr/bin/env bash
# R26b -- create the seven monitoring checks for the V2->V3 redirect cutover:
#  1. FunctionExecutionErrors alarm           (AWS/CloudFront, high-severity)
#  2. error-fallthrough log metric filter + alarm (REL-F1 / SE-J1, high-severity)
#  3. FunctionThrottles alarm                 (AWS/CloudFront, high-severity)
#  4. 5xxErrorRate alarm  on the clone distribution (>1% sustained 2 min, high-severity)
#  5. 4xxErrorRate alarm  on the clone distribution (>5% sustained 5 min, informational)
#  6. CloudWatch Synthetics canaries: v3-reachability + redirect-correctness (1 min)
#  7. CloudWatch dashboard tiling all seven checks for the R25a soak
#
# Pre-flip both Synthetics canaries target $TEMP_SUBDOMAIN (DO-F2); re-pointing them to
# codap.concord.org is a flip-day runbook step. IR2 -- no alarm actions are set;
# monitoring is a manual console/CLI watch (high/info tags are severity classifications,
# not routing).

set -euo pipefail
cd "$(dirname "$0")"
source ./config.env

REGION_US_E1="us-east-1"
LOG_GROUP="/aws/cloudfront/function/$FUNCTION_NAME"
METRIC_NAMESPACE="CODAP/V2V3Redirect"
DASHBOARD_NAME="codap-v2-v3-redirect"

if [ -z "${CLONE_DIST_ID:-}" ]; then
  echo "FAIL: CLONE_DIST_ID is empty -- run clone-distribution.sh first"
  exit 1
fi

# ---------------------------------------------------------------------------
# 1) FunctionExecutionErrors alarm
#
# CloudFront publishes FunctionExecutionErrors only when value > 0 (no zero-fills).
# A plain `--namespace ... --metric-name ... --statistic Sum --treat-missing-data
# notBreaching` alarm on a sparse counter latches in ALARM after firing because there
# is no fresh datapoint that satisfies "<= 0" to clear it -- a documented AWS quirk.
# Use metric math with `FILL(m1, 0)` so missing periods become 0 and the alarm
# auto-recovers after errors stop.
# ---------------------------------------------------------------------------
echo "1) FunctionExecutionErrors alarm"
FN_EXEC_ERRORS_METRICS=$(cat <<JSON
[
  {
    "Id": "m1",
    "MetricStat": {
      "Metric": {
        "Namespace": "AWS/CloudFront",
        "MetricName": "FunctionExecutionErrors",
        "Dimensions": [
          {"Name": "FunctionName", "Value": "$FUNCTION_NAME"},
          {"Name": "Region", "Value": "Global"}
        ]
      },
      "Period": 60,
      "Stat": "Sum"
    },
    "ReturnData": false
  },
  {
    "Id": "filled",
    "Expression": "FILL(m1, 0)",
    "ReturnData": true
  }
]
JSON
)
aws cloudwatch put-metric-alarm \
  --alarm-name "codap-v2-v3-redirect-FunctionExecutionErrors" \
  --alarm-description "high-severity: redirect function uncaught exceptions" \
  --metrics "$FN_EXEC_ERRORS_METRICS" \
  --evaluation-periods 1 \
  --threshold 0 \
  --comparison-operator GreaterThanThreshold \
  --treat-missing-data notBreaching \
  --region "$REGION_US_E1"

# ---------------------------------------------------------------------------
# 2) error-fallthrough log metric filter + alarm
#    DO-I2 -- create the log group first so put-metric-filter doesn't ResourceNotFound
#    on a never-invoked function. All `aws logs` calls pin --region us-east-1 (CloudFront
#    Function logs always land there). The metric-filter pattern is the FULL log-line
#    prefix ("codap-redirect tag=error-fallthrough") -- SEC-I1, so a logged uri/qs value
#    cannot forge the contiguous token sequence (logSafe() strips whitespace from request-
#    derived values). The SE-J1 catch-block unit test pins this exact prefix.
# ---------------------------------------------------------------------------
echo "2) error-fallthrough log metric filter + alarm"
aws logs create-log-group --log-group-name "$LOG_GROUP" --region "$REGION_US_E1" \
  2>/dev/null || true   # idempotent: ignore ResourceAlreadyExistsException
aws logs put-metric-filter \
  --log-group-name "$LOG_GROUP" \
  --filter-name "codap-v2-v3-redirect-error-fallthrough" \
  --filter-pattern '"codap-redirect tag=error-fallthrough"' \
  --metric-transformations \
    "metricName=ErrorFallthroughCount,metricNamespace=$METRIC_NAMESPACE,metricValue=1,defaultValue=0" \
  --region "$REGION_US_E1"

ERROR_FALLTHROUGH_METRICS=$(cat <<JSON
[
  {
    "Id": "m1",
    "MetricStat": {
      "Metric": {
        "Namespace": "$METRIC_NAMESPACE",
        "MetricName": "ErrorFallthroughCount"
      },
      "Period": 60,
      "Stat": "Sum"
    },
    "ReturnData": false
  },
  {
    "Id": "filled",
    "Expression": "FILL(m1, 0)",
    "ReturnData": true
  }
]
JSON
)
aws cloudwatch put-metric-alarm \
  --alarm-name "codap-v2-v3-redirect-error-fallthrough" \
  --alarm-description "high-severity: redirect function caught-exception fallthrough (R18b)" \
  --metrics "$ERROR_FALLTHROUGH_METRICS" \
  --evaluation-periods 1 \
  --threshold 0 \
  --comparison-operator GreaterThanThreshold \
  --treat-missing-data notBreaching \
  --region "$REGION_US_E1"

# ---------------------------------------------------------------------------
# 3) FunctionThrottles alarm
# ---------------------------------------------------------------------------
echo "3) FunctionThrottles alarm"
FN_THROTTLES_METRICS=$(cat <<JSON
[
  {
    "Id": "m1",
    "MetricStat": {
      "Metric": {
        "Namespace": "AWS/CloudFront",
        "MetricName": "FunctionThrottles",
        "Dimensions": [
          {"Name": "FunctionName", "Value": "$FUNCTION_NAME"},
          {"Name": "Region", "Value": "Global"}
        ]
      },
      "Period": 60,
      "Stat": "Sum"
    },
    "ReturnData": false
  },
  {
    "Id": "filled",
    "Expression": "FILL(m1, 0)",
    "ReturnData": true
  }
]
JSON
)
aws cloudwatch put-metric-alarm \
  --alarm-name "codap-v2-v3-redirect-FunctionThrottles" \
  --alarm-description "high-severity: redirect function throttled" \
  --metrics "$FN_THROTTLES_METRICS" \
  --evaluation-periods 1 \
  --threshold 0 \
  --comparison-operator GreaterThanThreshold \
  --treat-missing-data notBreaching \
  --region "$REGION_US_E1"

# ---------------------------------------------------------------------------
# 4) 5xxErrorRate alarm on the clone distribution
# ---------------------------------------------------------------------------
echo "4) 5xxErrorRate alarm (>1% sustained 2 min, high-severity)"
aws cloudwatch put-metric-alarm \
  --alarm-name "codap-v2-v3-redirect-5xxErrorRate" \
  --alarm-description "high-severity: clone distribution 5xx rate" \
  --namespace "AWS/CloudFront" \
  --metric-name "5xxErrorRate" \
  --dimensions "Name=DistributionId,Value=$CLONE_DIST_ID" "Name=Region,Value=Global" \
  --statistic Average \
  --period 60 \
  --evaluation-periods 2 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --treat-missing-data notBreaching \
  --region "$REGION_US_E1"

# ---------------------------------------------------------------------------
# 5) 4xxErrorRate alarm on the clone distribution (informational)
# ---------------------------------------------------------------------------
echo "5) 4xxErrorRate alarm (>5% sustained 5 min, informational)"
aws cloudwatch put-metric-alarm \
  --alarm-name "codap-v2-v3-redirect-4xxErrorRate" \
  --alarm-description "informational: clone distribution 4xx rate" \
  --namespace "AWS/CloudFront" \
  --metric-name "4xxErrorRate" \
  --dimensions "Name=DistributionId,Value=$CLONE_DIST_ID" "Name=Region,Value=Global" \
  --statistic Average \
  --period 60 \
  --evaluation-periods 5 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --treat-missing-data notBreaching \
  --region "$REGION_US_E1"

# ---------------------------------------------------------------------------
# 6) CloudWatch Synthetics canaries -- one for V3 reachability, one for redirect.
#    Canaries probe $CANARY_TARGET_HOST (config.env), defaulting to $TEMP_SUBDOMAIN when
#    unset. Pre-flip leave it at the temp subdomain; post-flip set CANARY_TARGET_HOST=
#    codap.concord.org and delete+recreate so the soak monitors the real host (DO-F2).
#    Creating canaries requires an IAM role with the Synthetics policy and an S3 bucket
#    for artifacts; both must be provided via config.env (SYNTHETICS_ROLE_ARN /
#    SYNTHETICS_ARTIFACT_BUCKET). The canaries can also be created/edited from the
#    console -- this script automates the common path.
# ---------------------------------------------------------------------------
echo "6) CloudWatch Synthetics canaries"
if [ -z "${SYNTHETICS_ROLE_ARN:-}" ] || [ -z "${SYNTHETICS_ARTIFACT_BUCKET:-}" ]; then
  echo "    SYNTHETICS_ROLE_ARN / SYNTHETICS_ARTIFACT_BUCKET not set in config.env --"
  echo "    skipping canary creation. Create them via the AWS console or set the vars and re-run."
else
  for canary in v3-reachability redirect-correctness; do
    zip_path="/tmp/codap-canary-$canary.zip"
    rm -f "$zip_path"
    # AWS Synthetics expects the handler at nodejs/node_modules/<name>.js
    pkgdir=$(mktemp -d)
    mkdir -p "$pkgdir/nodejs/node_modules"
    cp "canaries/$canary.js" "$pkgdir/nodejs/node_modules/$canary.js"
    (cd "$pkgdir" && zip -qr "$zip_path" .)
    rm -rf "$pkgdir"

    # Upload the code package to S3 and reference it by S3Bucket/S3Key. We do NOT pass
    # ZipFile=fileb://... inside the --code shorthand: the AWS CLI only expands fileb://
    # when it is the ENTIRE value of a parameter, not for a member of key=value shorthand,
    # so an inline ZipFile would upload the literal path string and Lambda fails with
    # "Could not unzip uploaded file". The S3 reference avoids blob handling entirely.
    code_key="code/codap-v2-v3-$canary.zip"
    aws s3 cp "$zip_path" "s3://$SYNTHETICS_ARTIFACT_BUCKET/$code_key" --region "$REGION_US_E1"

    # Check existence first. UpdateCanary silently drops EnvironmentVariables (the API
    # returns success and LastModified updates, but env vars never persist), so re-running
    # this script against an existing canary cannot reliably re-point CANARY_TARGET_HOST.
    # Re-pointing is delete+recreate; see RUNBOOK.md "Canary re-pointing (flip-day step)".
    # For idempotent re-runs we therefore skip when the canary already exists.
    if aws synthetics get-canary --name "codap-v2-v3-$canary" --region "$REGION_US_E1" \
        >/dev/null 2>&1; then
      echo "    canary codap-v2-v3-$canary already exists -- skipping (re-pointing requires"
      echo "    delete+recreate; see RUNBOOK.md 'Canary re-pointing (flip-day step)')"
      continue
    fi
    aws synthetics create-canary \
      --name "codap-v2-v3-$canary" \
      --code "Handler=$canary.handler,S3Bucket=$SYNTHETICS_ARTIFACT_BUCKET,S3Key=$code_key" \
      --artifact-s3-location "s3://$SYNTHETICS_ARTIFACT_BUCKET/codap-v2-v3-$canary/" \
      --execution-role-arn "$SYNTHETICS_ROLE_ARN" \
      --schedule "Expression=rate(1 minute)" \
      --runtime-version "syn-nodejs-puppeteer-15.1" \
      --run-config "EnvironmentVariables={CANARY_TARGET_HOST=${CANARY_TARGET_HOST:-$TEMP_SUBDOMAIN}}" \
      --region "$REGION_US_E1"
    echo "    canary codap-v2-v3-$canary created (target ${CANARY_TARGET_HOST:-$TEMP_SUBDOMAIN})"
  done
fi

# ---------------------------------------------------------------------------
# 7) CloudWatch dashboard tiling the seven checks for the R25a soak.
# ---------------------------------------------------------------------------
echo "7) CloudWatch dashboard ($DASHBOARD_NAME)"
DASHBOARD_BODY=$(cat <<JSON
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [["AWS/CloudFront", "FunctionExecutionErrors", "FunctionName", "$FUNCTION_NAME", "Region", "Global"]],
        "region": "$REGION_US_E1",
        "title": "FunctionExecutionErrors"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [["$METRIC_NAMESPACE", "ErrorFallthroughCount"]],
        "region": "$REGION_US_E1",
        "title": "error-fallthrough (R18b caught exceptions)"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [["AWS/CloudFront", "FunctionThrottles", "FunctionName", "$FUNCTION_NAME", "Region", "Global"]],
        "region": "$REGION_US_E1",
        "title": "FunctionThrottles"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/CloudFront", "5xxErrorRate", "DistributionId", "$CLONE_DIST_ID", "Region", "Global"],
          [".", "4xxErrorRate", ".", ".", ".", "."]
        ],
        "region": "$REGION_US_E1",
        "title": "Clone 4xx / 5xx error rates"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["CloudWatchSynthetics", "SuccessPercent", "CanaryName", "codap-v2-v3-v3-reachability"],
          [".", ".", ".", "codap-v2-v3-redirect-correctness"]
        ],
        "region": "$REGION_US_E1",
        "title": "Synthetics SuccessPercent"
      }
    }
  ]
}
JSON
)
aws cloudwatch put-dashboard \
  --dashboard-name "$DASHBOARD_NAME" \
  --dashboard-body "$DASHBOARD_BODY" \
  --region "$REGION_US_E1"

echo
echo "deploy-monitoring.sh complete."
echo "    Dashboard: https://console.aws.amazon.com/cloudwatch/home?region=$REGION_US_E1#dashboards:name=$DASHBOARD_NAME"
echo "    Run verify-alarms.sh to confirm each alarm transitions to ALARM under a synthetic error (G5)."
