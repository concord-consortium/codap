# DNS audit record (CODAP-1323, R26c)

Date captured: 2026-05-25T09:02:44-04:00
Hosted zone:   Z2P4W3M7MDAUV6  (concord.org)

## Records at or under codap.concord.org

| Name | Type | Target / values | Classification |
|---|---|---|---|
| `codap.concord.org` | A | `ALIAS -> d13zmjbnp90bac.cloudfront.net.` | handled (the record flip.sh repoints; rollback.sh restores) |
| `codap.concord.org` | TXT | `"_cf-custom-hostname.codap.concord.org=2355ad85-efde-4b03-971e-982ef16ca1ae"` | irrelevant (CloudFront custom-hostname ownership-verification; untouched by the flip) |
| `cf-custom-hostname.codap.concord.org` | TXT | `"2355ad85-efde-4b03-971e-982ef16ca1ae"` | irrelevant (same purpose -- ownership verification, not consumed by the cutover) |
| `is.codap.concord.org` | CNAME | `codap-server.concord.org` | irrelevant (separate interactive-server hostname; not part of v2/v3 routing) |
| `wiki.codap.concord.org` | CNAME | `codap.wiki.concord.org` | irrelevant (CODAP wiki -- separate site, unrelated to the cutover) |

## CAA records at concord.org (apex)

```text
(no CAA records on apex -- any authorized CA may issue, no ACM-blocking risk)
```

Any CAA value that does not authorize Amazon (`amazon.com`, `amazontrust.com`)
would block ACM renewal of the wildcard certificate covering the temp subdomain.

## DNSSEC status

```text
{
  "ServeSignature": "NOT_SIGNING"
}
```
Expected: DNSSEC is **NOT** signing this zone (Status.ServeSignature == NOT_SIGNING).
A signed zone would complicate the flip-day ALIAS swap, since record changes propagate
through the DNSSEC chain too. If signing is enabled, escalate before flip.

## Classification key

- **irrelevant**          -- record is unrelated to the V2/V3 cutover.
- **handled**             -- record is the codap.concord.org A/AAAA flip target,
                             or otherwise explicitly handled by flip.sh / rollback.sh.
- **unhandled-action-required** -- record needs operator attention before flip.

## Sign-off

Auditor (name): _______________   Date: ____________

Every row classified, no row remains `unhandled-action-required` at flip time:  [ ]
