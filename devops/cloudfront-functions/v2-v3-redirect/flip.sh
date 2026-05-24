#!/usr/bin/env bash
# R24/R24a -- forward flip: CloudFront associate-alias from $PROD_DIST_ID onto
# $CLONE_DIST_ID, then Route 53 ALIAS for codap.concord.org swung from $PROD_DIST_DOMAIN
# to $CLONE_DIST_DOMAIN. DO-F6: the Route 53 swap MUST NOT be issued until the clone is
# Deployed (`distribution-deployed`).
#
# DO-I4 resumable: each of the three actions is preceded by a state check; the script
# detects where it is on startup and skips already-completed actions. Mid-abort recovery
# is documented in RUNBOOK.md and at the bottom of this script's output.

set -euo pipefail
cd "$(dirname "$0")"
source ./config.env

if [ "${1:-}" != "--confirm" ]; then
  cat <<USAGE
flip.sh moves codap.concord.org from the production CloudFront distribution
($PROD_DIST_ID) onto the clone ($CLONE_DIST_ID).

PRE-FLIP CHECKLIST (all G-criteria signed in RUNBOOK.md):
  G1 -- Cypress positive matrix green
  G2 -- Cypress negative matrix green
  G3 -- test-function.sh ComputeUtilization targets met
  G4 -- check-size.sh green
  G5 -- verify-alarms.sh ran successfully
  G6 -- Drive double-click validated (R27 Path A or B)
  G7 -- sibling-story green
  G8 -- CODAP-1322 green
  G9 -- rollback authorities confirmed (R25c)

Re-run with --confirm to proceed.
USAGE
  exit 0
fi

if [ -z "${CLONE_DIST_ID:-}" ] || [ -z "${CLONE_DIST_DOMAIN:-}" ]; then
  echo "FAIL: CLONE_DIST_ID or CLONE_DIST_DOMAIN is empty -- run clone-distribution.sh first"
  exit 1
fi

# ---------------------------------------------------------------------------
# Step 1 -- associate-alias from prod to clone.
# Idempotent: if codap.concord.org is already in the clone's Aliases, skip.
# ---------------------------------------------------------------------------
echo "Step 1 -- CloudFront associate-alias codap.concord.org -> $CLONE_DIST_ID"

CLONE_ALIASES=$(aws cloudfront get-distribution --id "$CLONE_DIST_ID" \
  --query 'Distribution.DistributionConfig.Aliases.Items' --output json 2>/dev/null || echo "[]")
if echo "$CLONE_ALIASES" | grep -q '"codap.concord.org"'; then
  echo "    already done: codap.concord.org is in the clone's Aliases (resuming)"
else
  aws cloudfront associate-alias \
    --target-distribution-id "$CLONE_DIST_ID" \
    --alias "codap.concord.org"
  echo "    associate-alias submitted"
fi

# ---------------------------------------------------------------------------
# Step 2 -- WAIT for distribution-deployed (DO-F6).
# Naturally idempotent: a re-run after success returns quickly.
# ---------------------------------------------------------------------------
echo "Step 2 -- waiting for clone distribution to be Deployed..."
aws cloudfront wait distribution-deployed --id "$CLONE_DIST_ID"
echo "    clone is Deployed"

# ---------------------------------------------------------------------------
# Step 3 -- Route 53 UPSERT codap.concord.org ALIAS to clone.
# UPSERT is idempotent; if the record already targets the clone, the API returns success.
# ---------------------------------------------------------------------------
echo "Step 3 -- Route 53 ALIAS codap.concord.org -> $CLONE_DIST_DOMAIN"

CURRENT_TARGET=$(aws route53 list-resource-record-sets --hosted-zone-id "$HOSTED_ZONE_ID" \
  --query "ResourceRecordSets[?Name=='codap.concord.org.' && Type=='A'].AliasTarget.DNSName | [0]" \
  --output text 2>/dev/null || echo "")
if [ "$CURRENT_TARGET" = "$CLONE_DIST_DOMAIN" ] || [ "$CURRENT_TARGET" = "${CLONE_DIST_DOMAIN}." ]; then
  echo "    already done: ALIAS already targets $CLONE_DIST_DOMAIN (resuming)"
else
  ./route53-change.sh codap.concord.org "$CLONE_DIST_DOMAIN"
  echo "    Route 53 change submitted"
fi

echo
echo "FLIP COMPLETE."
echo "  - DNS propagation typically completes within 60 seconds (Route 53 TTL = 60)."
echo "  - A brief 403 window between Step 1 and Step 3 is expected (R24a)."
echo "  - Post-flip steps (per RUNBOOK.md):"
echo "     * Re-point the two Synthetics canaries to codap.concord.org (R26b / DO-F2)."
echo "     * Run the 60-minute active-watch protocol (R31b)."
echo
echo "Mid-abort recovery (DO-I4): if this script aborts between Steps 1 and 3, re-run it"
echo "to continue forward, or run rollback.sh to revert. Both are resumable; either closes"
echo "the 403 window."
