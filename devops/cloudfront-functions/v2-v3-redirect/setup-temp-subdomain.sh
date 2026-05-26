#!/usr/bin/env bash
# Pre-flip setup: create / update the Route 53 ALIAS record for the temp subdomain so
# https://$TEMP_SUBDOMAIN resolves to the clone distribution. Requires clone-distribution.sh
# to have run (so CLONE_DIST_DOMAIN is populated in config.env).
#
# The temp subdomain's certificate is already covered by the *.concord.org wildcard ACM
# cert (R27 / Technical Notes), and clone-distribution.sh has already added the temp
# subdomain to the clone's CloudFront Aliases -- so this DNS record is the last piece
# needed for the temp subdomain to be reachable over HTTPS.
#
# Idempotent: re-running when the record already targets the clone is a no-op.

set -euo pipefail
cd "$(dirname "$0")"
source ./config.env

if [ -z "${CLONE_DIST_DOMAIN:-}" ]; then
  echo "FAIL: CLONE_DIST_DOMAIN is empty -- run clone-distribution.sh first"
  exit 1
fi
if [ -z "${TEMP_SUBDOMAIN:-}" ]; then
  echo "FAIL: TEMP_SUBDOMAIN is empty -- check config.env"
  exit 1
fi

# Check current state for friendly logging (the underlying route53-change.sh is
# idempotent regardless).
CURRENT_TARGET=$(aws route53 list-resource-record-sets --hosted-zone-id "$HOSTED_ZONE_ID" \
  --query "ResourceRecordSets[?Name=='${TEMP_SUBDOMAIN}.' && Type=='A'].AliasTarget.DNSName | [0]" \
  --output text 2>/dev/null || echo "")
if [ "$CURRENT_TARGET" = "$CLONE_DIST_DOMAIN" ] || [ "$CURRENT_TARGET" = "${CLONE_DIST_DOMAIN}." ]; then
  echo "$TEMP_SUBDOMAIN already targets $CLONE_DIST_DOMAIN -- nothing to do"
  exit 0
fi

echo "Setting up $TEMP_SUBDOMAIN -> $CLONE_DIST_DOMAIN"
./route53-change.sh "$TEMP_SUBDOMAIN" "$CLONE_DIST_DOMAIN"

echo
echo "Done. DNS propagation typically completes within 60 seconds (Route 53 TTL = 60)."
echo "Verify with:"
echo "    dig $TEMP_SUBDOMAIN +short"
echo "    curl -sI https://$TEMP_SUBDOMAIN/app/"
