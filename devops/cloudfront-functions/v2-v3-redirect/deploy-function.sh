#!/usr/bin/env bash
# R18 / DO-J1 -- build the deployed artifact, gate on the 10 KB budgets, then
# create-or-update the CloudFront Function. Both paths end with `publish-function` so the
# function lands in the LIVE stage -- a CloudFront Function MUST be published to LIVE
# before it can be associated with a distribution's cache behavior (modify-clone.sh
# attaches it by ARN; without LIVE the attach has no version to bind). So even the first
# deploy publishes.
set -euo pipefail
cd "$(dirname "$0")"
source ./config.env

# Gate first: build dist/ and confirm both 10 KB budgets (R20c).
./check-size.sh

# Decide create vs update by probing for an existing function.
if aws cloudfront describe-function --name "$FUNCTION_NAME" >/dev/null 2>&1; then
  echo "function $FUNCTION_NAME exists -- updating"
  ETAG=$(aws cloudfront describe-function --name "$FUNCTION_NAME" \
    --query 'ETag' --output text)
  aws cloudfront update-function \
    --name "$FUNCTION_NAME" \
    --if-match "$ETAG" \
    --function-config '{"Comment":"CODAP V2->V3 redirect (CODAP-1323)","Runtime":"cloudfront-js-2.0"}' \
    --function-code "fileb://dist/v2-v3-redirect.js"
else
  echo "function $FUNCTION_NAME does not exist -- creating"
  aws cloudfront create-function \
    --name "$FUNCTION_NAME" \
    --function-config '{"Comment":"CODAP V2->V3 redirect (CODAP-1323)","Runtime":"cloudfront-js-2.0"}' \
    --function-code "fileb://dist/v2-v3-redirect.js"
fi

# Publish to LIVE so the function can be attached to a distribution (DO-J1).
ETAG=$(aws cloudfront describe-function --name "$FUNCTION_NAME" \
  --query 'ETag' --output text)
aws cloudfront publish-function --name "$FUNCTION_NAME" --if-match "$ETAG"

LIVE_STATUS=$(aws cloudfront describe-function --name "$FUNCTION_NAME" --stage LIVE \
  --query 'FunctionSummary.Status' --output text 2>/dev/null || echo "UNKNOWN")
echo "deploy-function: $FUNCTION_NAME -- LIVE stage status: $LIVE_STATUS"
