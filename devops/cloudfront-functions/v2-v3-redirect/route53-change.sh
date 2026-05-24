#!/usr/bin/env bash
# Shared helper: UPSERT the codap.concord.org ALIAS A record to a given CloudFront
# distribution domain. Used by flip.sh / rollback.sh.
#
# Args:
#   $1 -- target CloudFront DomainName (e.g. d13zmjbnp90bac.cloudfront.net)
#
# Idempotent: if the record already points to the target, AWS returns success without
# making a change.

set -euo pipefail
cd "$(dirname "$0")"
source ./config.env

TARGET_DOMAIN="${1:-}"
if [ -z "$TARGET_DOMAIN" ]; then
  echo "usage: $0 <target-cloudfront-domain>"
  exit 2
fi

# CloudFront's fixed alias hosted zone id (same for every CloudFront distribution).
CLOUDFRONT_ZONE_ID="Z2FDTNDATAQYW2"

CHANGE_BATCH=$(cat <<JSON
{
  "Comment": "CODAP-1323 ALIAS swap to $TARGET_DOMAIN",
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "codap.concord.org.",
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
