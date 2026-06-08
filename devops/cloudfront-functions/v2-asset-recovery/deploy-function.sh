#!/usr/bin/env bash
# Build the deployed artifact, gate on the 10 KB budget, then create-or-update the
# CloudFront Function and publish it to LIVE. A CloudFront Function MUST be published to
# LIVE before modify-clone.sh can attach it by ARN, so even the first deploy publishes.
# Mirrors v2-v3-redirect/deploy-function.sh.
#
# Function name: $FUNCTION_NAME, defaulting to codap-app-v2-recovery. Keep this in sync with
# RECOVERY_FUNCTION_NAME in v2-v3-redirect/config.env (the value modify-clone.sh looks up).
set -euo pipefail
cd "$(dirname "$0")"
FUNCTION_NAME="${FUNCTION_NAME:-codap-app-v2-recovery}"

./check-size.sh

if aws cloudfront describe-function --name "$FUNCTION_NAME" >/dev/null 2>&1; then
  echo "function $FUNCTION_NAME exists -- updating"
  ETAG=$(aws cloudfront describe-function --name "$FUNCTION_NAME" --query 'ETag' --output text)
  aws cloudfront update-function \
    --name "$FUNCTION_NAME" \
    --if-match "$ETAG" \
    --function-config '{"Comment":"CODAP V2 cached-launch recovery (CODAP-1323, temporary)","Runtime":"cloudfront-js-2.0"}' \
    --function-code "fileb://dist/v2-asset-recovery.js"
else
  echo "function $FUNCTION_NAME does not exist -- creating"
  aws cloudfront create-function \
    --name "$FUNCTION_NAME" \
    --function-config '{"Comment":"CODAP V2 cached-launch recovery (CODAP-1323, temporary)","Runtime":"cloudfront-js-2.0"}' \
    --function-code "fileb://dist/v2-asset-recovery.js"
fi

ETAG=$(aws cloudfront describe-function --name "$FUNCTION_NAME" --query 'ETag' --output text)
aws cloudfront publish-function --name "$FUNCTION_NAME" --if-match "$ETAG"

LIVE_STATUS=$(aws cloudfront describe-function --name "$FUNCTION_NAME" --stage LIVE \
  --query 'FunctionSummary.Status' --output text 2>/dev/null || echo "UNKNOWN")
echo "deploy-function: $FUNCTION_NAME -- LIVE stage status: $LIVE_STATUS"
