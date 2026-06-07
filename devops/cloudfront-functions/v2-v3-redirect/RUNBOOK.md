# Flip-day runbook -- CODAP V2 -> V3 cutover (CODAP-1323)

This runbook is the source of truth for **who does what and when** on flip day. The
requirements spec at [`../../../specs/CODAP-1323-redirect-v2-to-v3.md`](../../../specs/CODAP-1323-redirect-v2-to-v3.md)
is the source of truth for **what must be true**.

> **Run [`PREFLIGHT.md`](PREFLIGHT.md) first.** It walks through every script in the
> correct order to stand up the cloned distribution at the temp subdomain, deploy
> monitoring (5 alarms + 2 canaries + dashboard), and collect G1 - G6 evidence. This
> RUNBOOK assumes that pipeline is done and only handles the flip itself + everything
> after -- but the "Freshness re-checks (within 48h of flip)" subsection below re-runs
> the freshness-sensitive parts so the operator isn't trusting weeks-old signatures.

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
| `v3-reachability` canary | Passive observation: state=RUNNING + >=1 PASSED in last 10 runs (UpdateCanary drops EnvironmentVariables, so re-pointing for failure induction is delete+recreate -- not scripted in G5) | _______________ |
| `redirect-correctness` canary | Passive observation: state=RUNNING + >=1 PASSED in last 10 runs (same UpdateCanary limitation as above) | _______________ |

---

## Freshness re-checks (within 48h of flip)

PREFLIGHT may have run weeks ago. Before signing the G-rows below, re-run the
freshness-sensitive checks so the signatures reflect current reality:

- [x] **`./verify-clone.sh`** -- both parts PASS. Catches any drift on prod or the
      clone since PREFLIGHT step 5.
- [x] **Cypress G1/G2** -- `npx cypress run --spec cypress/e2e/v2-v3-redirect.spec.ts --config excludeSpecPattern=**/__none__.ts --env redirectBaseUrl=https://codap2to3.concord.org
` from `v3/`. Every R28
      positive and R29 negative row still passes against the current v3 build. This
      run report supersedes the PREFLIGHT step 12 report as G1/G2 evidence.
- [x] **G6 Drive double-click** -- click a sample Drive double-click URL pointing at
      the temp subdomain (`https://codap2to3.concord.org/app/static/dg/en/cert/index.html#file=googleDrive:<id>`);
      per R21 host-preserving, the redirect lands at `codap2to3.concord.org/app/#file=googleDrive:<id>`
      (same temp origin) and V3 + Drive OAuth open the document. New screenshot
      supersedes the PREFLIGHT step 13 evidence.
- [x] **Canary health** -- both `codap-v2-v3-v3-reachability` and
      `codap-v2-v3-redirect-correctness` canaries report `SuccessPercent` at or near
      100 over the last hour (CloudWatch console -> Synthetics or the soak dashboard).
- [x] **`source ./config.env`** -- `CLONE_DIST_ID`, `CLONE_DIST_DOMAIN`, and
      `TEMP_SUBDOMAIN` still match the clone in CloudFront and the A record in
      Route 53 (sanity check).

---

## Pre-flip manual prerequisites

Each item is a non-scripted action that must be completed (and the box ticked) before any
G-criterion is signed.

- [x] **Authorize `codap2to3.concord.org` in the Google Cloud Console for the CODAP Drive
      OAuth client** (R27 clone step 6a / X1). Required so the G6 Drive double-click
      validation (Path A) can run pre-flip. Post-flip follow-up: remove the temp host from
      the authorized list (out of scope of this story).
- [x] **DNS audit record classification complete** (`dns-audit-record.md`, R26c). Every
      row classified as `irrelevant` / `handled` / `unhandled-action-required`; no row
      remains `unhandled-action-required` at flip time.
- [x] **`associate-alias` ownership-verification TXT record staged.** `flip.sh` Step 1
      calls `aws cloudfront associate-alias`, which refuses to move an in-use alias unless
      a domain-ownership TXT record exists -- otherwise it fails with
      `IllegalUpdate: Invalid or missing alias DNS TXT records`. (CloudFront requires this
      on the CLI path even for same-account moves; the console does not.) The record is
      named `_<alias>` and its value is the **target** distribution's CloudFront domain.
      For the forward flip the target is the clone, so create:

      ```bash
      aws route53 change-resource-record-sets \
        --hosted-zone-id Z2P4W3M7MDAUV6 \
        --change-batch '{
          "Comment": "CODAP-1323 associate-alias ownership verification for codap.concord.org -> clone",
          "Changes": [{
            "Action": "UPSERT",
            "ResourceRecordSet": {
              "Name": "_codap.concord.org",
              "Type": "TXT",
              "TTL": 60,
              "ResourceRecords": [{ "Value": "\"dh9ebe3cljnnu.cloudfront.net\"" }]
            }
          }]
        }'
      ```

      Then wait for the change to reach `INSYNC` (`aws route53 wait
      resource-record-sets-changed --id <change-id>`) and confirm it resolves on public
      DNS (`dig +short TXT _codap.concord.org @8.8.8.8`) before running `flip.sh` --
      CloudFront verifies against public DNS, so allow ~60s for propagation. The record is
      only consumed at associate-alias time and may be removed after the flip lands.
      **Rollback note (R25):** `rollback.sh` Step 1 issues the same `associate-alias` back
      to prod and needs the same record pointing at the **prod** domain
      (`_codap.concord.org TXT "d13zmjbnp90bac.cloudfront.net"`). Before relying on
      rollback, UPSERT the record to the prod value (or carry both values on the record).
- [x] **Rollback authorities confirmed (R25c)** -- names and contact details filled into
      the "Rollback authorities" section below.
- [x] **`LOG_ENABLED` review** -- confirm `v2-v3-redirect.js` has `LOG_ENABLED = false`
      in the committed source. Any temporary `true` from debugging must be reverted
      BEFORE the artifact is rebuilt for flip (see "LOG_ENABLED enable/revert protocol"
      below).
- [x] **Synthetics canaries pointing at the temp subdomain** (`$TEMP_SUBDOMAIN`,
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

### DNS prerequisite before rollback (do this NOW, not mid-incident)

Step 1 above (`associate-alias`) will fail with
`IllegalUpdate: Invalid or missing alias DNS TXT records` unless the
`_codap.concord.org` ownership-verification TXT record points at the **prod** distribution
domain. This is the mirror of the pre-flip TXT prerequisite, but with the *target* now
being prod instead of the clone (see "Pre-flip manual prerequisites").

The forward flip stages this record with the **clone** value
(`dh9ebe3cljnnu.cloudfront.net`). That value does **not** satisfy a rollback -- a rollback
moves the alias back to prod, so the record must carry the **prod** domain
(`d13zmjbnp90bac.cloudfront.net`). If you wait until you actually need to roll back, you
will hit this error at the worst possible moment.

**Mitigation -- stage the prod value before the flip window opens.** Either:

- UPSERT the record to carry **both** values, so flip and rollback both verify:

  ```bash
  aws route53 change-resource-record-sets \
    --hosted-zone-id Z2P4W3M7MDAUV6 \
    --change-batch '{
      "Comment": "CODAP-1323 associate-alias ownership verification (clone + prod)",
      "Changes": [{
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "_codap.concord.org",
          "Type": "TXT",
          "TTL": 60,
          "ResourceRecords": [
            { "Value": "\"dh9ebe3cljnnu.cloudfront.net\"" },
            { "Value": "\"d13zmjbnp90bac.cloudfront.net\"" }
          ]
        }
      }]
    }'
  ```

- **or**, if you prefer a single value, swap the record to the prod value as the first
  action of a rollback (before `rollback.sh`):

  ```bash
  aws route53 change-resource-record-sets \
    --hosted-zone-id Z2P4W3M7MDAUV6 \
    --change-batch '{
      "Changes": [{
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "_codap.concord.org",
          "Type": "TXT",
          "TTL": 60,
          "ResourceRecords": [{ "Value": "\"d13zmjbnp90bac.cloudfront.net\"" }]
        }
      }]
    }'
  ```

Either way, wait for `INSYNC` and confirm public resolution
(`dig +short TXT _codap.concord.org @8.8.8.8`) before running `rollback.sh`; CloudFront
verifies against public DNS, so allow ~60s for propagation. The single-value path adds a
DNS change (plus its propagation wait) to the rollback critical path, which is why staging
both values up front is preferred.

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
R26b).

**Re-pointing is delete + recreate, not update-canary.** AWS Synthetics' `UpdateCanary`
silently drops `EnvironmentVariables` (the API returns success and LastModified updates,
but env vars never persist), so the target host can only be changed by recreating the
canary.

`deploy-monitoring.sh` sets the canary's `CANARY_TARGET_HOST` environment variable from the
`CANARY_TARGET_HOST` value in `config.env` (falling back to `$TEMP_SUBDOMAIN` when unset).
That injected env var takes precedence over the `process.env.CANARY_TARGET_HOST || '...'`
fallback hard-coded in [`canaries/v3-reachability.js`](canaries/) and
[`canaries/redirect-correctness.js`](canaries/) -- so the **only** thing that controls the
target is `config.env`; editing the source fallback has no effect on a canary created by
the script.

The reliable procedure is to set the target in `config.env`, then delete and recreate:

```bash
# 1. Point future canaries at the production host.
#    Edit config.env:  CANARY_TARGET_HOST=codap.concord.org

# 2. Delete both canaries (recreating preserves the alarms + dashboard which only
#    reference canary names, not their lifecycle).
for canary in codap-v2-v3-v3-reachability codap-v2-v3-redirect-correctness; do
  aws synthetics stop-canary --name "$canary" --region us-east-1 || true
  aws synthetics delete-canary --name "$canary" --region us-east-1
done

# 3. Wait until both fully delete (DELETING -> 404).
for canary in codap-v2-v3-v3-reachability codap-v2-v3-redirect-correctness; do
  until ! aws synthetics get-canary --name "$canary" --region us-east-1 >/dev/null 2>&1; do
    sleep 5
  done
done

# 4. Recreate via deploy-monitoring.sh -- it reads CANARY_TARGET_HOST from config.env
#    and creates fresh canaries pointing at codap.concord.org.
./deploy-monitoring.sh

# 5. Start the freshly-created canaries (create leaves them in READY, not RUNNING).
for canary in codap-v2-v3-v3-reachability codap-v2-v3-redirect-correctness; do
  aws synthetics start-canary --name "$canary" --region us-east-1
done
```

After ~90 seconds, confirm both canaries report `PASSED` in the console and are hitting
`https://codap.concord.org/...` in their CloudWatch artifact screenshots.

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

- Spec (requirements + decisions): [`../../../specs/CODAP-1323-redirect-v2-to-v3.md`](../../../specs/CODAP-1323-redirect-v2-to-v3.md)
- Function source: [`v2-v3-redirect.js`](v2-v3-redirect.js)
- Folder README: [`README.md`](README.md)
