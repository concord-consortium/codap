# Flip-day runbook -- CODAP V2 -> V3 cutover (CODAP-1323)

This runbook is the source of truth for **who does what and when** on flip day. The
requirements spec at [`../../../specs/CODAP-1323-redirect-v2-to-v3/requirements.md`](../../../specs/CODAP-1323-redirect-v2-to-v3/requirements.md)
is the source of truth for **what must be true**.

Keep this document open during flip and rollback. If anything in this runbook disagrees
with the script behavior, the script is authoritative -- pause and reconcile before
proceeding.

---

## G1 - G9 go / no-go checklist

Every row must be **signed** by a named human before `flip.sh --confirm` runs. Evidence
links should point at the matching script artifact.

| Gate | Description | Evidence | Signer | Date |
|---|---|---|---|---|
| G1 | Cypress R28 positive matrix passes against the temp subdomain | Cypress run report (`v2-v3-redirect.spec.ts`) | _______________ | __________ |
| G2 | Cypress R29 negative matrix passes against the temp subdomain (every row hits its expected origin) | Cypress run report | _______________ | __________ |
| G3 | `aws cloudfront test-function` ComputeUtilization targets met (median < 50%, p99 < 100%, no URI near 100%) | `test-function.sh` output | _______________ | __________ |
| G4 | Both 10 KB budgets satisfied (function and synthetic body) | `check-size.sh` output | _______________ | __________ |
| G5 | Each of the seven R26b alarms verified to fire on a synthetic error | `verify-alarms.sh` output + per-check method (table below) | _______________ | __________ |
| G6 | Drive double-click flow validated end-to-end on the temp subdomain (R27 Path A) OR a documented Path B acceptance | screenshot + brief notes | _______________ | __________ |
| G7 | The sibling CFM-18 / cloud-file-manager work is green and merged | PR / branch link | _______________ | __________ |
| G8 | The sibling CODAP-1322 / V3-deploy-at-`/app/` work is green and merged | PR / branch link | _______________ | __________ |
| G9 | Rollback authorities confirmed (R25c) -- names + contact below | filled in below | _______________ | __________ |

### G5 per-check verification method (DO-I3)

`verify-alarms.sh` exercises each alarm under a documented induction method. Record the
method used per check; this row reflects the actual run.

| Check | Method | Result |
|---|---|---|
| `FunctionExecutionErrors` | Temporary broken-function publish + drive 20 viewer requests at clone | _______________ |
| `error-fallthrough` log filter | `put-log-events` with the exact prefix the metric filter matches | _______________ |
| `FunctionThrottles` | Brief request burst against clone; G5 exception recorded if the alarm does not fire | _______________ |
| `5xxErrorRate` | Co-fires with `FunctionExecutionErrors` from the broken-function publish | _______________ |
| `4xxErrorRate` | 10x curl to known-404 paths against clone | _______________ |
| `v3-reachability` canary | Re-pointed at an unreachable host briefly | _______________ |
| `redirect-correctness` canary | Re-pointed at an unreachable host briefly | _______________ |

---

## Pre-flip manual prerequisites

Each item is a non-scripted action that must be completed (and the box ticked) before any
G-criterion is signed.

- [ ] **Authorize `codap2to3.concord.org` in the Google Cloud Console for the CODAP Drive
      OAuth client** (R27 clone step 6a / X1). Required so the G6 Drive double-click
      validation (Path A) can run pre-flip. Post-flip follow-up: remove the temp host from
      the authorized list (out of scope of this story).
- [ ] **DNS audit record classification complete** (`dns-audit-record.md`, R26c). Every
      row classified as `irrelevant` / `handled` / `unhandled-action-required`; no row
      remains `unhandled-action-required` at flip time.
- [ ] **Rollback authorities confirmed (R25c)** -- names and contact details filled into
      the "Rollback authorities" section below.
- [ ] **`LOG_ENABLED` review** -- confirm `v2-v3-redirect.js` has `LOG_ENABLED = false`
      in the committed source. Any temporary `true` from debugging must be reverted
      BEFORE the artifact is rebuilt for flip (see "LOG_ENABLED enable/revert protocol"
      below).
- [ ] **Synthetics canaries pointing at the temp subdomain** (`$TEMP_SUBDOMAIN`,
      `codap2to3.concord.org`). They are re-pointed to `codap.concord.org` *after* the
      flip (DO-F2; see the "Canary re-pointing" section below).

---

## Forward flip

Run from `devops/cloudfront-functions/v2-v3-redirect/`. **All G1 - G9 must be signed first.**

```bash
./flip.sh --confirm
```

`flip.sh` expands to three operations, executed sequentially with the mandated
`Deployed`-before-DNS wait (DO-F6):

1. **CloudFront `associate-alias`** -- moves `codap.concord.org` from `$PROD_DIST_ID`
   (`E3H9X49AG3GYSO`) onto `$CLONE_DIST_ID`:
   ```bash
   aws cloudfront associate-alias \
     --target-distribution-id "$CLONE_DIST_ID" \
     --alias "codap.concord.org"
   ```
2. **Wait for the clone to be Deployed** (mandatory wait, DO-F6):
   ```bash
   aws cloudfront wait distribution-deployed --id "$CLONE_DIST_ID"
   ```
3. **Route 53 ALIAS swap** -- UPSERT `codap.concord.org` A record in
   `$HOSTED_ZONE_ID` (`Z2P4W3M7MDAUV6`) to AliasTarget `$CLONE_DIST_DOMAIN`,
   `HostedZoneId=Z2FDTNDATAQYW2` (CloudFront's fixed alias zone),
   `EvaluateTargetHealth=false`.

Expect a **brief `403` window** between steps 1 and 3: the CNAME has moved off
`$PROD_DIST_ID` (which then `403`s every `codap.concord.org` request) while DNS still
resolves there. This is documented in R24a as expected.

`flip.sh` is **resumable** (DO-I4): each step is preceded by a state check; re-running
after a partial failure picks up where it stopped.

---

## Rollback

Run from `devops/cloudfront-functions/v2-v3-redirect/`. **Only a named rollback authority
(R25c) may run this.**

```bash
./rollback.sh --confirm
```

`rollback.sh` is the reverse of `flip.sh`:

1. `aws cloudfront associate-alias --target-distribution-id "$PROD_DIST_ID" --alias codap.concord.org`
2. `aws cloudfront wait distribution-deployed --id "$PROD_DIST_ID"`
3. Route 53 UPSERT `codap.concord.org` ALIAS back to `$PROD_DIST_DOMAIN`.

**R25 propagation caveat** -- declare rollback "complete" when error-rate metrics return
to baseline, NOT when this script exits. DNS propagation typically completes within 60
seconds (TTL = 60s) but ISP / corporate resolvers occasionally hold past TTL.

`rollback.sh` is **resumable** (DO-I4): each step is preceded by a state check.

---

## Mid-abort recovery (DO-I4)

The danger window is between Step 1 (`associate-alias`) and Step 3 (Route 53 swap). In
that window, the CNAME has already moved off the source distribution and DNS still
resolves there -- the source distribution `403`s every request.

If `flip.sh` aborts in this window, the window stays open **only while no one is acting**.
Recovery:

- **Re-run `flip.sh`** to continue forward -- DNS moves to the clone, closing the window.
- **OR** run `rollback.sh` to revert -- `associate-alias` returns to prod, closing the
  window.

Both scripts are resumable, so re-running after an abort is always safe. Pick whichever
direction the team agrees on; the symmetric statement is true for a `rollback.sh` abort.

---

## Canary re-pointing (flip-day step)

`deploy-monitoring.sh` created both Synthetics canaries with `CANARY_TARGET_HOST` set to
`$TEMP_SUBDOMAIN` (`codap2to3.concord.org`). After the flip lands, repoint both to
`codap.concord.org` so the post-flip soak monitors the real customer-facing host (DO-F2 /
R26b):

```bash
for canary in codap-v2-v3-v3-reachability codap-v2-v3-redirect-correctness; do
  aws synthetics update-canary --name "$canary" \
    --run-config "EnvironmentVariables={CANARY_TARGET_HOST=codap.concord.org}" \
    --region us-east-1
done
```

After the change, wait one canary tick (~60s) and confirm both canaries report
`PASSED` in the console.

---

## Alarm + monitor URLs (R26b)

- **Dashboard**: <https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=codap-v2-v3-redirect>
- **Alarms** (filter `codap-v2-v3-redirect`):
  <https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#alarmsV2:alarm-filter=codap-v2-v3-redirect>
- **Synthetics canaries**:
  <https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#synthetics:canary/list>

---

## Rollback authorities (R25c)

The two people on the rollback-decision list must be filled in before flip.

| Role | Name | Slack | Phone | Email |
|---|---|---|---|---|
| Primary (CODAP V3 engineering lead) | _______________ | _______________ | _______________ | _______________ |
| Secondary (on-call) | _______________ | _______________ | _______________ | _______________ |

Either may run `rollback.sh --confirm` without further consensus during the post-flip
active-watch window. Outside that window, follow the on-call escalation in
[Concord Consortium operational docs](#cc-operational-docs-pointer) below.

---

## CC operational docs pointer

Detection and rollback-response timing targets, on-call escalation, and incident-channel
routing live in Concord Consortium's existing operational documentation -- not this
runbook (IR3 / R31). Confirm the link with operations and paste it here before flip:

> _________________________________________________________________________

---

## Post-flip first-hour active-watch protocol (R31b)

For 60 minutes after the Route 53 swap completes:

1. **Dedicated attention** -- the primary rollback authority watches the dashboard
   continuously; no concurrent merge / deploy / on-call work.
2. **Alarm check every 5 minutes** -- explicit visual sweep of the dashboard at least
   every 5 minutes. Note alarm state at each check in a running log.
3. **Spot-check `cy.request`** -- once at the 30-minute mark, run `curl -I` against
   `https://codap.concord.org/app/static/dg/en/cert/index.html` and confirm the response
   body contains `<!-- codap-redirect -->` (RB3 spot-check).
4. **Synthetics review** -- both canaries should be reporting `PASSED` consistently
   against the new `codap.concord.org` target.

If anything trips during the 60 minutes, the rollback authority decides forward-fix vs.
rollback per the requirements rollback triggers (RB1 - RB6).

---

## Support tier-1 diagnosis path (CS2)

If a user reports a broken bookmark or LARA-launched URL during the post-flip window:

1. **Reproduce in an incognito / private window.** A non-incognito reproduction may
   reflect a stale `?lang=` from `URLSearchParams` history or a cached SW; incognito
   isolates the redirect path.
2. **Inspect the URL bar AFTER the redirect.**
   - If the URL is `https://codap.concord.org/app/...?lang=<some>#...` -- the redirect
     fired. The issue is **V3-app**, not the redirect. Escalate to the V3 on-call.
   - If the URL is still a V2-shape `/app/static/dg/.../cert/...` or `/releases/.../...`
     -- the redirect did **not** fire. Possible causes: cached V2 response (try hard
     reload), the redirect function failed (check FunctionExecutionErrors and
     error-fallthrough alarms), or the user is on a stale DNS cache (still resolves to
     the old distribution).
   - If the URL is `https://codap.concord.org/app/` (no query, no hash) -- the redirect
     fired but lost user data. This is the highest-severity case; escalate immediately.
3. **Escalation contact**: rollback authority on duty.

---

## LOG_ENABLED enable/revert protocol (Fin2)

`LOG_ENABLED = false` is the committed default (R23). To debug a specific incident, an
authorized operator may temporarily flip it to `true`:

1. **Enable**: edit `v2-v3-redirect.js`, set `LOG_ENABLED = true`, run
   `deploy-function.sh` to update + publish.
2. **Record**: write the date, time, operator, and reason into the incident log. Set a
   calendar reminder for **revert by date** (typically same day; max 48 hours).
3. **Revert**: restore `LOG_ENABLED = false`, run `deploy-function.sh` again.
4. **Verify**: confirm the committed source has `LOG_ENABLED = false` after the revert.
   The `error-fallthrough` log line is emitted unconditionally and is unaffected.

The catch-block log line stays observable regardless of `LOG_ENABLED` -- only the per-
match `redirect` / `no-match` lines are gated.

---

## Post-soak old-distribution disposition (R25a / XR1)

After the 14-day post-flip soak (R25a exit conditions: error-rate baseline, no open
RB-trigger incidents) -- approximately **2026-06-21** -- begin the lifecycle of the old
production distribution `E3H9X49AG3GYSO`:

```bash
# 1. Detach the (now unused) codap.concord.org alias.
aws cloudfront get-distribution-config --id "$PROD_DIST_ID" > /tmp/prod.json
ETAG=$(jq -r '.ETag' /tmp/prod.json)
jq '.DistributionConfig | .Aliases = { Quantity: 0, Items: [] } | .Enabled = false' \
  /tmp/prod.json > /tmp/prod-disabled.json
aws cloudfront update-distribution --id "$PROD_DIST_ID" --if-match "$ETAG" \
  --distribution-config file:///tmp/prod-disabled.json
```

Hold for 90 days (calendar reminder: ~2026-09). Until deletion, the disabled
distribution remains a **one-click re-enable for rollback** (R25a). After the 90-day
hold:

```bash
# 2. Delete the distribution permanently (no rollback possible after this).
ETAG=$(aws cloudfront get-distribution-config --id "$PROD_DIST_ID" --query 'ETag' --output text)
aws cloudfront delete-distribution --id "$PROD_DIST_ID" --if-match "$ETAG"
```

After deletion the V2 origin and S3 bucket(s) may also be retired -- coordinate with
operations before doing so.

---

## Reference

- Requirements: [`../../../specs/CODAP-1323-redirect-v2-to-v3/requirements.md`](../../../specs/CODAP-1323-redirect-v2-to-v3/requirements.md)
- Implementation plan: [`../../../specs/CODAP-1323-redirect-v2-to-v3/implementation.md`](../../../specs/CODAP-1323-redirect-v2-to-v3/implementation.md)
- Function source: [`v2-v3-redirect.js`](v2-v3-redirect.js)
- Folder README: [`README.md`](README.md)
