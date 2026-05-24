#!/usr/bin/env bash
# R25 -- rollback: reverse of flip.sh. Re-associate the codap.concord.org alias onto the
# production distribution ($PROD_DIST_ID), wait for it to be Deployed, then Route 53
# UPSERT the codap.concord.org ALIAS back to $PROD_DIST_DOMAIN.
#
# Resumable per DO-I4 -- each action is preceded by a state check. Idempotent re-run
# safe. R25's "propagation caveat" applies: declare rollback "complete" when
# error-rate metrics return to baseline, not when this script exits.

set -euo pipefail
cd "$(dirname "$0")"
source ./config.env

if [ "${1:-}" != "--confirm" ]; then
  cat <<USAGE
rollback.sh moves codap.concord.org from the clone CloudFront distribution
($CLONE_DIST_ID) back onto production ($PROD_DIST_ID).

WHO MAY RUN THIS (R25c): rollback authorities named in RUNBOOK.md. If you are not one of
those people, escalate before running.

Re-run with --confirm to proceed.
USAGE
  exit 0
fi

# ---------------------------------------------------------------------------
# Step 1 -- associate-alias from clone back to prod.
# ---------------------------------------------------------------------------
echo "Step 1 -- CloudFront associate-alias codap.concord.org -> $PROD_DIST_ID"

PROD_ALIASES=$(aws cloudfront get-distribution --id "$PROD_DIST_ID" \
  --query 'Distribution.DistributionConfig.Aliases.Items' --output json 2>/dev/null || echo "[]")
if echo "$PROD_ALIASES" | grep -q '"codap.concord.org"'; then
  echo "    already done: codap.concord.org is in prod's Aliases (resuming)"
else
  aws cloudfront associate-alias \
    --target-distribution-id "$PROD_DIST_ID" \
    --alias "codap.concord.org"
  echo "    associate-alias submitted"
fi

# ---------------------------------------------------------------------------
# Step 2 -- WAIT for distribution-deployed on prod.
# ---------------------------------------------------------------------------
echo "Step 2 -- waiting for prod distribution to be Deployed..."
aws cloudfront wait distribution-deployed --id "$PROD_DIST_ID"
echo "    prod is Deployed"

# ---------------------------------------------------------------------------
# Step 3 -- Route 53 UPSERT codap.concord.org ALIAS back to prod.
# ---------------------------------------------------------------------------
echo "Step 3 -- Route 53 ALIAS codap.concord.org -> $PROD_DIST_DOMAIN"

CURRENT_TARGET=$(aws route53 list-resource-record-sets --hosted-zone-id "$HOSTED_ZONE_ID" \
  --query "ResourceRecordSets[?Name=='codap.concord.org.' && Type=='A'].AliasTarget.DNSName | [0]" \
  --output text 2>/dev/null || echo "")
if [ "$CURRENT_TARGET" = "$PROD_DIST_DOMAIN" ] || [ "$CURRENT_TARGET" = "${PROD_DIST_DOMAIN}." ]; then
  echo "    already done: ALIAS already targets $PROD_DIST_DOMAIN (resuming)"
else
  ./route53-change.sh "$PROD_DIST_DOMAIN"
  echo "    Route 53 change submitted"
fi

echo
echo "ROLLBACK COMPLETE."
echo "  - DNS propagation typically completes within 60 seconds (Route 53 TTL = 60)."
echo "  - A brief 403 window between Steps 1 and 3 is expected and unavoidable."
echo "  - R25 propagation caveat: declare 'rollback complete' on error-rate metrics"
echo "    returning to baseline, not on this script exiting."
echo
echo "Mid-abort recovery (DO-I4): if this script aborts between Steps 1 and 3, re-run it"
echo "to continue, or run flip.sh to re-attempt the forward flip. Both are resumable."
