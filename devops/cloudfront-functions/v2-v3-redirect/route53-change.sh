#!/usr/bin/env bash
# Shared helper: UPSERT a Route 53 ALIAS A record to a given CloudFront distribution
# domain. Used by flip.sh / rollback.sh / setup-temp-subdomain.sh.
#
# Args:
#   $1 -- record name      (e.g. codap.concord.org or codap2to3.concord.org)
#   $2 -- target CloudFront DomainName (e.g. d13zmjbnp90bac.cloudfront.net)
#
# Idempotent: if the record already points to the target, AWS returns success without
# making a change.

set -euo pipefail
cd "$(dirname "$0")"
source ./config.env

RECORD_NAME="${1:-}"
TARGET_DOMAIN="${2:-}"
if [ -z "$RECORD_NAME" ] || [ -z "$TARGET_DOMAIN" ]; then
  echo "usage: $0 <record-name> <target-cloudfront-domain>"
  exit 2
fi

# Normalize the record name to its fully-qualified form (trailing dot).
case "$RECORD_NAME" in
  *.) ;;
  *)  RECORD_NAME="${RECORD_NAME}." ;;
esac

# CloudFront's fixed alias hosted zone id (same for every CloudFront distribution).
CLOUDFRONT_ZONE_ID="Z2FDTNDATAQYW2"

CHANGE_BATCH=$(cat <<JSON
{
  "Comment": "CODAP-1323 ALIAS $RECORD_NAME -> $TARGET_DOMAIN",
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "$RECORD_NAME",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "$CLOUDFRONT_ZONE_ID",
          "DNSName": "$TARGET_DOMAIN",
          "EvaluateTargetHealth": false
        }
      }
    }
  ]
}
JSON
)

aws route53 change-resource-record-sets \
  --hosted-zone-id "$HOSTED_ZONE_ID" \
  --change-batch "$CHANGE_BATCH"
