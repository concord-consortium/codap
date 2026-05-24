# V2 → V3 redirect CloudFront Function

CODAP-1323. Redirects legacy CODAP **V2** URLs on `codap.concord.org` to **V3** at
`https://codap.concord.org/app/`, preserving the URL hash (a server-side 301/302 cannot —
browsers never send the hash to the server). See
[`specs/CODAP-1323-redirect-v2-to-v3/`](../../../specs/CODAP-1323-redirect-v2-to-v3/) for the
requirements and this implementation plan.

## How the redirect works

`v2-v3-redirect.js` is a **CloudFront Function** (`cloudfront-js-2.0` runtime) attached at the
**viewer-request** stage. For a V2-shape URL it returns a synthetic `200` HTML page whose
inline JavaScript reads `window.location.search` / `.hash` and calls
`window.location.replace()` with the V3 URL. A non-V2 path under `/app/*` has its `/app`
prefix stripped so it resolves against the V3 S3 origin (content rooted at `codap3/`); other
non-matching paths fall through to origin unchanged.

## Cutover model

The function is **never** attached to the live production distribution `E3H9X49AG3GYSO`.
Instead a clone of that distribution is stood up with the V3 cutover changes, validated at the
temp subdomain `codap2to3.concord.org`, and made live on flip day by a CloudFront
`associate-alias` move followed by a Route 53 ALIAS swap. Rollback reverses both.

## Where to start

This folder has **two** operational documents that should be read in order:

1. **[`PREFLIGHT.md`](PREFLIGHT.md)** — the ordered pre-flip pipeline. Run every step
   here to stand up the cloned distribution at the temp subdomain, deploy monitoring,
   and collect the G1 – G6 gate evidence. Run this **before** flip day.
2. **[`RUNBOOK.md`](RUNBOOK.md)** — the flip-day operational runbook. The G1 – G9 go /
   no-go checklist, the forward flip and rollback procedures, mid-abort recovery, the
   post-flip active-watch protocol, and the post-soak old-distribution disposition.

The script table below lists every script alphabetically; `PREFLIGHT.md` gives the
correct execution order, and each row points back at its requirement.

## Scripts

| Script | Purpose | Requirement |
|---|---|---|
| `v2-v3-redirect.js`        | The CloudFront Function — committed, fully-commented source         | R18–R21a |
| `v2-v3-redirect.test.js`   | Jest unit tests for the function logic                              | R28/R29  |
| `build-function.sh`        | Strip comments → `dist/v2-v3-redirect.js` (deployed artifact)       | R20b     |
| `check-size.sh`            | Verify both 10 KB budgets                                           | R20c     |
| `test-function.sh`         | Execution-time validation via `aws cloudfront test-function`        | R30a     |
| `deploy-function.sh`       | Create/update the function in CloudFront                            | R18      |
| `clone-distribution.sh`    | Clone `E3H9X49AG3GYSO`                                              | R26a     |
| `setup-temp-subdomain.sh`  | Route 53 ALIAS `$TEMP_SUBDOMAIN` → clone (makes temp subdomain resolvable) | R27 |
| `modify-clone.sh`          | Apply the V3 cutover cache-behavior changes                         | R26      |
| `verify-clone.sh`          | Structured config diff + response-header checks                     | R26a     |
| `dns-audit.sh`             | Audit `*.codap.concord.org` records                                 | R26c     |
| `deploy-monitoring.sh`     | CloudWatch alarms, log metric filter, synthetic canaries            | R26b     |
| `verify-alarms.sh`         | Induce a synthetic error against each R26b check; confirm ALARM     | G5 / DO-I3 |
| `flip.sh` / `rollback.sh`  | Flip-day forward / reverse                                          | R24/R24a/R25 |
| `route53-change.sh`        | Shared helper: UPSERT a Route 53 ALIAS A record                     | shared   |
| `PREFLIGHT.md`             | Pre-flip pipeline (run this first)                                  | this folder |
| `RUNBOOK.md`               | Flip-day operational runbook                                        | R31      |

All scripts are idempotent where practical and read identifiers from `config.env` (see
`config.env.example`). Run from this directory.
