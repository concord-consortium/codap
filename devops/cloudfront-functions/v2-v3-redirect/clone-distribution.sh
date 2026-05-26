#!/usr/bin/env bash
# R26a steps 1-3 plus DO-I1 step 4 -- clone the production CloudFront distribution
# ($PROD_DIST_ID = E3H9X49AG3GYSO) into a new distribution with the temp subdomain alias
# and the same V3-cutover-ready origins, then determine whether security headers are
# origin-emitted (the R20a/DO-I1 RHP-required decision).
#
# Writes the new Id/DomainName into config.env as CLONE_DIST_ID / CLONE_DIST_DOMAIN, and
# writes RHP_REQUIRED (true|false) and RHP_ID (if a policy already exists) for
# modify-clone.sh to consume.
#
# Idempotency: if config.env already has CLONE_DIST_ID set, the clone step is skipped.
# Re-running after a partial failure is safe.

set -euo pipefail
cd "$(dirname "$0")"
mkdir -p artifacts
source ./config.env

if ! command -v jq >/dev/null 2>&1; then
  echo "FAIL: jq is required (apt install jq / brew install jq)"
  exit 1
fi

# ---------------------------------------------------------------------------
# Step 1 -- capture the production distribution config + its ETag.
# ---------------------------------------------------------------------------
echo "Step 1 -- fetching prod distribution config for $PROD_DIST_ID"
aws cloudfront get-distribution-config --id "$PROD_DIST_ID" \
  > artifacts/prod-dist-config.json
PROD_ETAG=$(jq -r '.ETag' artifacts/prod-dist-config.json)
jq '.DistributionConfig' artifacts/prod-dist-config.json > artifacts/prod-config.json
echo "    prod ETag: $PROD_ETAG"
echo "    saved:      artifacts/prod-config.json (raw config -- artifacts/ is git-ignored, SEC-J1)"

# ---------------------------------------------------------------------------
# Step 2 -- jq transform: new CallerReference, replace Aliases with only $TEMP_SUBDOMAIN.
# Keep all origins and all cache behaviors and their existing function associations
# unchanged. (modify-clone.sh applies the V3 cutover changes; this step keeps the clone
# byte-equivalent except for what CloudFront forces us to change.)
# ---------------------------------------------------------------------------
echo "Step 2 -- transforming config for clone (alias=$TEMP_SUBDOMAIN)"
CALLER_REF="codap-v2-v3-redirect-clone-$(date +%s)"
jq --arg ref "$CALLER_REF" --arg alias "$TEMP_SUBDOMAIN" \
  '.CallerReference = $ref
   | .Aliases = { Quantity: 1, Items: [$alias] }
   | .Comment = ((.Comment // "") + " [CODAP-1323 clone; pre-flip validation target]")' \
  artifacts/prod-config.json > artifacts/clone-config.json

# ---------------------------------------------------------------------------
# Step 3 -- create the clone (or detect an existing one created by a previous run).
# ---------------------------------------------------------------------------
if [ -n "${CLONE_DIST_ID:-}" ]; then
  echo "Step 3 -- CLONE_DIST_ID=$CLONE_DIST_ID already set in config.env; skipping create"
  CLONE_DIST_DOMAIN_VALUE="$CLONE_DIST_DOMAIN"
else
  echo "Step 3 -- creating clone distribution"
  CREATE_OUT=$(aws cloudfront create-distribution \
    --distribution-config "file://artifacts/clone-config.json")
  NEW_ID=$(echo "$CREATE_OUT" | jq -r '.Distribution.Id')
  NEW_DOMAIN=$(echo "$CREATE_OUT" | jq -r '.Distribution.DomainName')
  echo "    new distribution: Id=$NEW_ID  Domain=$NEW_DOMAIN"

  # Persist into config.env so re-runs and downstream scripts see it.
  python3 - "$NEW_ID" "$NEW_DOMAIN" <<'PY'
import os, sys, re
new_id, new_domain = sys.argv[1], sys.argv[2]
path = "config.env"
with open(path) as f:
    text = f.read()
def setvar(text, name, value):
    pat = re.compile(r"^" + re.escape(name) + r"=.*$", re.MULTILINE)
    if pat.search(text):
        return pat.sub(f"{name}={value}", text)
    return text + f"\n{name}={value}\n"
text = setvar(text, "CLONE_DIST_ID", new_id)
text = setvar(text, "CLONE_DIST_DOMAIN", new_domain)
with open(path, "w") as f:
    f.write(text)
PY
  CLONE_DIST_ID="$NEW_ID"
  CLONE_DIST_DOMAIN_VALUE="$NEW_DOMAIN"
  echo "    persisted CLONE_DIST_ID / CLONE_DIST_DOMAIN to config.env"
  echo "    when the new distribution finishes deploying, the temp subdomain becomes reachable;"
  echo "    use:  aws cloudfront wait distribution-deployed --id $NEW_ID"
fi

# ---------------------------------------------------------------------------
# Step 4 (DO-I1) -- determine RHP_REQUIRED before modify-clone.sh runs.
#
# Inspect the PROD config + a curl -I on codap.concord.org. If the V3-cutover cache
# behaviors (`/app`, `/app/*`, `/releases/*`) already carry a `ResponseHeadersPolicyId`,
# the clone has inherited it -- no action needed (RHP_REQUIRED=false; capture RHP_ID).
# Otherwise the headers must come from origin and an origin swap would drop them; the
# clone needs a policy attached (RHP_REQUIRED=true).
# ---------------------------------------------------------------------------
echo "Step 4 -- determining RHP_REQUIRED (DO-I1)"

# Look at the prod /app, /app/*, /releases/* behaviors for an existing ResponseHeadersPolicyId.
RHP_FROM_CONFIG=$(jq -r '
  .DistributionConfig.CacheBehaviors.Items[]?
  | select(.PathPattern == "/app" or .PathPattern == "/app/*" or .PathPattern == "/releases/*")
  | (.ResponseHeadersPolicyId // empty)
' artifacts/prod-dist-config.json | sort -u | grep -v '^$' || true)

# Sanity check: curl the live origin and confirm common security headers are present.
# Probe an /app/ URL (the cache behavior we're swapping), NOT `/` (WordPress default),
# so the headers we measure are the ones the swap could drop.
HEADERS=$(curl -sI "https://codap.concord.org/app/" || true)
HAS_HSTS=$(echo "$HEADERS" | grep -i '^strict-transport-security:' || true)

if [ -n "$RHP_FROM_CONFIG" ]; then
  RHP_ID_VALUE=$(echo "$RHP_FROM_CONFIG" | head -n1)
  RHP_REQUIRED_VALUE=false
  echo "    PROD already attaches ResponseHeadersPolicyId=$RHP_ID_VALUE to V3-cutover behaviors"
  echo "    -> clone inherits it; RHP_REQUIRED=false"
elif [ -n "$HAS_HSTS" ]; then
  RHP_ID_VALUE=""
  RHP_REQUIRED_VALUE=true
  echo "    PROD has no policy on V3-cutover behaviors, but live response has HSTS:"
  echo "      $HAS_HSTS"
  echo "    -> headers are origin-emitted; the origin swap would drop them. RHP_REQUIRED=true"
else
  RHP_ID_VALUE=""
  RHP_REQUIRED_VALUE=false
  echo "    PROD has no policy on V3-cutover behaviors and the live response has no HSTS."
  echo "    -> RHP_REQUIRED=false (no security headers to preserve; verify in verify-clone.sh)"
fi

python3 - "$RHP_REQUIRED_VALUE" "$RHP_ID_VALUE" <<'PY'
import sys, re
required, rhp_id = sys.argv[1], sys.argv[2]
path = "config.env"
with open(path) as f:
    text = f.read()
def setvar(text, name, value):
    pat = re.compile(r"^" + re.escape(name) + r"=.*$", re.MULTILINE)
    if pat.search(text):
        return pat.sub(f"{name}={value}", text)
    return text + f"\n{name}={value}\n"
text = setvar(text, "RHP_REQUIRED", required)
text = setvar(text, "RHP_ID", rhp_id)
with open(path, "w") as f:
    f.write(text)
PY

echo
echo "clone-distribution.sh done."
echo "    CLONE_DIST_ID=$CLONE_DIST_ID"
echo "    CLONE_DIST_DOMAIN=$CLONE_DIST_DOMAIN_VALUE"
echo "    RHP_REQUIRED=$RHP_REQUIRED_VALUE   RHP_ID=$RHP_ID_VALUE"
echo "Next: run modify-clone.sh (after the function has been deployed and PUBLISHED -- X2)."
