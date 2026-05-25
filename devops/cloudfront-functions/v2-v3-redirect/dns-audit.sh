#!/usr/bin/env bash
# R26c -- audit DNS state under *.codap.concord.org before flip.
#
# Produces dns-audit-record.md at the folder root (SEC-J1: this is the one R26c artifact
# meant to be committed; it lives outside the git-ignored artifacts/ directory). The
# script emits a Markdown skeleton with an empty Classification column; the operator
# fills it in (irrelevant / handled / unhandled-action-required) before the G-criteria
# sign-off.

set -euo pipefail
cd "$(dirname "$0")"
source ./config.env

OUT="dns-audit-record.md"

if ! command -v jq >/dev/null 2>&1; then
  echo "FAIL: jq is required (apt install jq / brew install jq)"
  exit 1
fi

{
  echo "# DNS audit record (CODAP-1323, R26c)"
  echo
  echo "Date captured: $(date -Is)"
  echo "Hosted zone:   $HOSTED_ZONE_ID  (concord.org)"
  echo
  echo "## Records at or under codap.concord.org"
  echo
  echo "| Name | Type | Target / values | Classification |"
  echo "|---|---|---|---|"
} > "$OUT"

aws route53 list-resource-record-sets --hosted-zone-id "$HOSTED_ZONE_ID" --output json \
  | jq -r '
      .ResourceRecordSets[]
      | select(.Name | endswith(".codap.concord.org.") or . == "codap.concord.org.")
      | {
          name: (.Name | sub("\\.$"; "")),
          type: .Type,
          target: (
            if .AliasTarget then "ALIAS -> " + .AliasTarget.DNSName
            else (.ResourceRecords // [] | map(.Value) | join(", "))
            end
          )
        }
      | "| `\(.name)` | \(.type) | `\(.target)` |  |"
  ' >> "$OUT"

{
  echo
  echo "## CAA records at concord.org (apex)"
  echo
  echo '```text'
  dig CAA concord.org +short | grep . \
    || echo "(no CAA records on apex -- any authorized CA may issue, no ACM-blocking risk)"
  echo '```'
  echo
  echo 'Any CAA value that does not authorize Amazon (`amazon.com`, `amazontrust.com`)'
  echo "would block ACM renewal of the wildcard certificate covering the temp subdomain."
  echo
  echo "## DNSSEC status"
  echo
  echo '```text'
  aws route53 get-dnssec --hosted-zone-id "$HOSTED_ZONE_ID" --output json \
    | jq '.Status' 2>/dev/null || echo "(get-dnssec failed)"
  echo '```'
  echo "Expected: DNSSEC is **NOT** signing this zone (Status.ServeSignature == NOT_SIGNING)."
  echo "A signed zone would complicate the flip-day ALIAS swap, since record changes propagate"
  echo "through the DNSSEC chain too. If signing is enabled, escalate before flip."
  echo
  echo "## Classification key"
  echo
  echo "- **irrelevant**          -- record is unrelated to the V2/V3 cutover."
  echo "- **handled**             -- record is the codap.concord.org A/AAAA flip target,"
  echo "                             or otherwise explicitly handled by flip.sh / rollback.sh."
  echo "- **unhandled-action-required** -- record needs operator attention before flip."
  echo
  echo "## Sign-off"
  echo
  echo "Auditor (name): _______________   Date: ____________"
  echo
  echo "Every row classified, no row remains \`unhandled-action-required\` at flip time:  [ ]"
} >> "$OUT"

echo "Wrote $OUT"
echo "Edit it to fill in the Classification column, then commit it as the R26c audit record."
