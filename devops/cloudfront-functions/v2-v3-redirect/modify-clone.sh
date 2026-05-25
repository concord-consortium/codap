#!/usr/bin/env bash
# R26 / IQ1 -- apply the V3 cutover cache-behavior changes to the clone distribution.
#
# Ordering dependency (X2): the function MUST already be deployed AND published to LIVE
# (deploy-function.sh), because this script attaches it by ARN. The clone-distribution.sh
# step must have run first so CLONE_DIST_ID is set in config.env.
#
# On the clone only:
# - `/app` and `/app/*`: target origin = S3-Website-models-resources-codap3
#   (the V3 S3 origin, content rooted at codap3/); function attached at viewer-request.
#   The one function both redirects V2-shape paths and strips `/app` on fall-through.
# - `/releases/*`: target origin = V3 S3 origin; function attached.
# - New carve-out behaviors -> V2 origin (codap server), no function attached:
#     /releases/.gapikey, /releases/staging, /releases/staging/*, /releases/zips/*,
#     /releases/var/*, /releases/apple-touch-icon.png
# - New `/v3` and `/v3/*` behaviors -> V3 S3 origin; function attached (always redirects).
# - All other behaviors (default WPEngine, /codap-resources/*, /v2, /v2/*, /~user/*,
#   /sage*, TP-Sampler precedence) left untouched.
# - Cache-behavior precedence: carve-outs + TP-Sampler patterns sit at HIGHER precedence
#   (earlier in CacheBehaviors.Items) than the general /app/* and /releases/* patterns.
# - Response-headers policy: if RHP_REQUIRED=true (DO-I1), attach a CloudFront-managed
#   SecurityHeadersPolicy to /app, /app/*, /releases/* on the clone.

set -euo pipefail
cd "$(dirname "$0")"
mkdir -p artifacts
source ./config.env

if [ -z "${CLONE_DIST_ID:-}" ]; then
  echo "FAIL: CLONE_DIST_ID is empty -- run clone-distribution.sh first"
  exit 1
fi

# Confirm the function exists in LIVE before we attempt to bind it (DO-J1).
FUNCTION_ARN=$(aws cloudfront describe-function --name "$FUNCTION_NAME" --stage LIVE \
  --query 'FunctionSummary.FunctionMetadata.FunctionARN' --output text 2>/dev/null || echo "")
if [ -z "$FUNCTION_ARN" ] || [ "$FUNCTION_ARN" = "None" ]; then
  echo "FAIL: $FUNCTION_NAME is not published to LIVE -- run deploy-function.sh (DO-J1, X2)"
  exit 1
fi
echo "Using function ARN: $FUNCTION_ARN"

# Fetch the clone's current config + ETag.
aws cloudfront get-distribution-config --id "$CLONE_DIST_ID" > artifacts/clone-current.json
CLONE_ETAG=$(jq -r '.ETag' artifacts/clone-current.json)
jq '.DistributionConfig' artifacts/clone-current.json > artifacts/clone-config-current.json

# CloudFront's "S3 website" origins are typically named after the bucket; the V3 origin id
# is fixed by R21/R26. We assume it already exists on the production clone (since the
# clone inherits all of prod's origins). If not, jq will fail loudly below.
V3_S3_ORIGIN_ID="S3-Website-models-resources-codap3"
V2_ORIGIN_ID=$(jq -r '
  .Origins.Items[]
  | select((.Id | ascii_downcase | contains("codap server")) or (.Id | ascii_downcase | startswith("codap-server")))
  | .Id
' artifacts/clone-config-current.json | head -n1)
if [ -z "$V2_ORIGIN_ID" ] || [ "$V2_ORIGIN_ID" = "null" ]; then
  # Fall back to the first non-S3-named origin (best-effort -- the operator should
  # cross-check the resulting modified config before update-distribution).
  V2_ORIGIN_ID=$(jq -r '.Origins.Items[] | select(.Id | startswith("S3-") | not) | .Id' \
    artifacts/clone-config-current.json | head -n1)
fi
echo "V3 S3 origin id: $V3_S3_ORIGIN_ID"
echo "V2 origin id:    $V2_ORIGIN_ID"

# Build the JSON transform. The strategy:
# 1. Define helper objects in jq for: a viewer-request FunctionAssociation, the cache-
#    policy-id and origin-request-policy-id of the existing /app behavior (so the new
#    behaviors inherit consistent policy ids), and a `make_behavior` function.
# 2. Mutate existing /app, /app/*, /releases/* in place to swap origin and attach function.
# 3. Append the new carve-outs and the /v3, /v3/* behaviors at the head of the items
#    array so they take precedence over the general /app/* and /releases/* patterns.
# 4. Optionally attach the response-headers policy when RHP_REQUIRED=true.

# Use the AWS-managed SecurityHeadersPolicy id (it always exists).
MANAGED_SECURITY_HEADERS_POLICY_ID="67f7725c-6f97-4210-82d7-5512b31e9d03"
RHP_TO_USE=""
if [ "${RHP_REQUIRED:-false}" = "true" ]; then
  RHP_TO_USE="${RHP_ID:-$MANAGED_SECURITY_HEADERS_POLICY_ID}"
  echo "RHP_REQUIRED=true -- attaching ResponseHeadersPolicyId=$RHP_TO_USE to V3-cutover behaviors"
elif [ -n "${RHP_ID:-}" ]; then
  echo "RHP_REQUIRED=false but RHP_ID=$RHP_ID is set -- clone inherits the existing policy"
else
  echo "RHP_REQUIRED=false -- no response-headers policy attached"
fi

jq --arg fnArn "$FUNCTION_ARN" \
   --arg v3Origin "$V3_S3_ORIGIN_ID" \
   --arg v2Origin "$V2_ORIGIN_ID" \
   --arg rhpId   "$RHP_TO_USE" \
   '
   # Cache-policy id used by the existing /app behavior (so new behaviors stay consistent).
   (.CacheBehaviors.Items[]? | select(.PathPattern == "/app/*") | .CachePolicyId // "") as $cpid
   | (.CacheBehaviors.Items[]? | select(.PathPattern == "/app/*") | .ViewerProtocolPolicy // "redirect-to-https") as $vpp

   # Template for new behaviors: clone the existing /app/* behavior so new behaviors
   # inherit whatever shape (modern CachePolicyId, legacy ForwardedValues+MinTTL/DefaultTTL/
   # MaxTTL, etc.) prod actually uses. PathPattern / TargetOriginId / FunctionAssociations
   # are set per-behavior below; everything else (AllowedMethods, ViewerProtocolPolicy,
   # caching fields) is inherited verbatim.
   | (
       .CacheBehaviors.Items[]
       | select(.PathPattern == "/app/*")
       | del(.PathPattern, .TargetOriginId, .FunctionAssociations)
     ) as $template

   # Attach a function association to a behavior.
   | def attach_fn(b):
       b
       | .FunctionAssociations = {
           Quantity: 1,
           Items: [{ FunctionARN: $fnArn, EventType: "viewer-request" }]
         } ;

   # Optionally set the response-headers policy id (only if $rhpId is non-empty).
   def maybe_rhp(b):
       if ($rhpId | length) > 0 then b + { ResponseHeadersPolicyId: $rhpId } else b end ;

   # Build a brand-new behavior with a given path, origin, and whether to attach the function.
   def new_behavior(path; origin; with_fn):
       ($template + { PathPattern: path, TargetOriginId: origin })
       | (if with_fn then attach_fn(.) else . + { FunctionAssociations: { Quantity: 0 } } end)
       | maybe_rhp(.) ;

   # Mutate existing /app, /app/*, /releases/* behaviors.
   .CacheBehaviors.Items |= map(
       if .PathPattern == "/app" or .PathPattern == "/app/*" or .PathPattern == "/releases/*"
       then attach_fn(. + { TargetOriginId: $v3Origin }) | maybe_rhp(.)
       else .
       end
     )

   # New carve-outs (V2 origin, no function attached) -- inserted at the head of the array.
   | .CacheBehaviors.Items =
       [
         new_behavior("/releases/.gapikey";        $v2Origin; false),
         new_behavior("/releases/staging";         $v2Origin; false),
         new_behavior("/releases/staging/*";       $v2Origin; false),
         new_behavior("/releases/zips/*";          $v2Origin; false),
         new_behavior("/releases/var/*";           $v2Origin; false),
         new_behavior("/releases/apple-touch-icon.png"; $v2Origin; false),
         new_behavior("/v3";                       $v3Origin; true),
         new_behavior("/v3/*";                     $v3Origin; true)
       ] + .CacheBehaviors.Items
   | .CacheBehaviors.Quantity = (.CacheBehaviors.Items | length)
   ' artifacts/clone-config-current.json > artifacts/clone-config-modified.json

echo "Modified config written to artifacts/clone-config-modified.json"
echo "Diff preview (high-level):"
diff <(jq -S '.CacheBehaviors.Items[].PathPattern' artifacts/clone-config-current.json) \
     <(jq -S '.CacheBehaviors.Items[].PathPattern' artifacts/clone-config-modified.json) \
     | head -30 || true

echo
echo "Applying via update-distribution (Id=$CLONE_DIST_ID, ETag=$CLONE_ETAG)"
aws cloudfront update-distribution \
  --id "$CLONE_DIST_ID" \
  --if-match "$CLONE_ETAG" \
  --distribution-config "file://artifacts/clone-config-modified.json" \
  > artifacts/clone-update-result.json
NEW_ETAG=$(jq -r '.ETag' artifacts/clone-update-result.json)
echo "update-distribution complete -- new ETag $NEW_ETAG"
echo "Next: run  aws cloudfront wait distribution-deployed --id $CLONE_DIST_ID  before verify-clone.sh"
