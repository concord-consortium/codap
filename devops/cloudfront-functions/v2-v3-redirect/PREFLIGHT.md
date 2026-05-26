# Pre-flip pipeline -- CODAP V2 -> V3 cutover (CODAP-1323)

This is the ordered build-and-validate pipeline that stands up the cloned CloudFront
distribution at the temp subdomain `codap2to3.concord.org` and verifies it is ready for
flip day. Run every step here BEFORE following [`RUNBOOK.md`](RUNBOOK.md).

- This document = **how to stand things up** (one-time setup, all running scripts).
- [`RUNBOOK.md`](RUNBOOK.md) = **how to flip and roll back** (the day-of procedure),
  including the freshness re-check checklist to run within ~48h of flip.

If anything in this pipeline disagrees with a script's behavior, the script is
authoritative -- pause and reconcile before proceeding.

---

## Prerequisites

Confirm you have:

- AWS CLI v2 configured with credentials for the CC account that owns
  `E3H9X49AG3GYSO` (`PROD_DIST_ID`) and the `concord.org` Route 53 hosted zone
  (`Z2P4W3M7MDAUV6`).
- `jq` installed (`apt install jq` / `brew install jq`).
- Node 18+ and `npm` (used by the function's Jest suite and `build-function.sh`'s
  `terser`).
- `curl` and `dig`.

Confirm permissions cover (at minimum): `cloudfront:*`, `route53:ChangeResourceRecordSets`
+ `route53:ListResourceRecordSets` + `route53:GetDNSSEC` on the hosted zone,
`cloudwatch:*` and `logs:*` for the alarms / metric filter, `synthetics:*` and
`iam:PassRole` for the canaries, and read access to the V2/V3 S3 origins.

---

## 0. Configure

```bash
cd devops/cloudfront-functions/v2-v3-redirect/
cp config.env.example config.env
```

Open `config.env` and confirm the identifier values (`PROD_DIST_ID`,
`PROD_DIST_DOMAIN`, `HOSTED_ZONE_ID`, `ACM_CERT_ARN`, `TEMP_SUBDOMAIN`,
`FUNCTION_NAME`) match the requirements spec. The `CLONE_DIST_ID` /
`CLONE_DIST_DOMAIN` / `RHP_REQUIRED` / `RHP_ID` lines are filled in by
`clone-distribution.sh` below; leave them empty for now.

`config.env` is `.gitignore`-d; do not commit it. Also set up the optional
Synthetics variables if you intend `deploy-monitoring.sh` to automate canary
creation (otherwise create the canaries via the AWS console):

```bash
echo 'SYNTHETICS_ROLE_ARN=arn:aws:iam::612297603577:role/<your-synthetics-role>' >> config.env
echo 'SYNTHETICS_ARTIFACT_BUCKET=<your-bucket>' >> config.env
```

---

## 1. Build, size-check, and deploy the redirect function

`deploy-function.sh` chains `build-function.sh` -> `check-size.sh` and ends with
`publish-function` so the function lands in the LIVE stage (DO-J1; required for the
by-ARN attach in step 4).

```bash
./deploy-function.sh
```

**Verify**: `aws cloudfront describe-function --name codap-v2-v3-redirect --stage LIVE`
returns the expected ETag and the `Status` is `UNASSOCIATED` (a LIVE function is
`UNASSOCIATED` until a distribution attaches it; it becomes `READY` after step 4).

`npm install && npm test` (run from this folder) is a useful pre-deploy sanity check --
the Jest suite runs against both the committed source and `dist/v2-v3-redirect.js`.

---

## 2. Clone the production distribution

`clone-distribution.sh` captures the prod config, jq-transforms it (new
`CallerReference`, `Aliases` = `[$TEMP_SUBDOMAIN]`), creates the clone, persists
`CLONE_DIST_ID` and `CLONE_DIST_DOMAIN` back into `config.env`, and runs the DO-I1
RHP-required determination (writes `RHP_REQUIRED` and optionally `RHP_ID`).

```bash
./clone-distribution.sh
```

Wait for the clone to deploy:

```bash
source ./config.env
aws cloudfront wait distribution-deployed --id "$CLONE_DIST_ID"
```

---

## 3. Point the temp subdomain at the clone

`clone-distribution.sh` set the temp subdomain in the clone's CloudFront `Aliases` (so
the ACM cert validates). DNS still needs a Route 53 record so the temp subdomain
actually resolves over HTTPS.

```bash
./setup-temp-subdomain.sh
```

**Verify**: `dig codap2to3.concord.org +short` should return CloudFront IPs, and
`curl -sI https://codap2to3.concord.org/app/` should return a valid HTTPS response
(it will still serve V2 content at this point -- the modify step is next).

---

## 4. Apply the V3 cutover cache-behavior changes

`modify-clone.sh` attaches the redirect function (by LIVE ARN) to `/app`, `/app/*`,
`/releases/*`, `/v3`, `/v3/*`; swaps the origin for the first three to the V3 S3 origin;
adds the V2-origin carve-outs (`/releases/.gapikey`, `/releases/staging[/*]`,
`/releases/zips/*`, `/releases/var/*`, `/releases/apple-touch-icon.png`) at higher
precedence than `/releases/*` (GR1); and attaches a response-headers policy if
`RHP_REQUIRED=true` (DO-I1).

```bash
./modify-clone.sh
aws cloudfront wait distribution-deployed --id "$CLONE_DIST_ID"
```

---

## 5. Verify the clone matches the expected config diff

`verify-clone.sh` is the **automated gate** (SE-J2). It computes the structural diff
between the production and clone configs, checks every difference against the
machine-readable allowlist in [`expected-diff.md`](expected-diff.md), and exits non-zero
on any unlisted difference. Part 2 confirms the security headers are present on both an
origin-served URL and a synthetic-response URL on the clone (DO-I1 confirmation).

```bash
./verify-clone.sh
```

If Part 1 reports unlisted differences, **stop** and reconcile: either fix the modify
step or extend `expected-diff.md` with explicit allowlist entries for the new expected
differences. Do NOT generalize allowlist entries broadly -- that defeats the gate.

---

## 6. DNS audit (R26c)

```bash
./dns-audit.sh
```

Open `dns-audit-record.md`, classify each row as `irrelevant` / `handled` /
`unhandled-action-required`, and resolve any `unhandled-action-required` rows before
flip day. Commit the completed record; it is the auditable R26c artifact.

---

## 7. Deploy monitoring (alarms + canaries + dashboard)

```bash
./deploy-monitoring.sh
```

This creates the seven R26b checks (5 alarms + 2 canaries) and a soak dashboard. Both
canaries are created targeting `$TEMP_SUBDOMAIN` so they monitor the redirect through
the pre-flip testing soak; they are re-pointed to `codap.concord.org` as part of
`RUNBOOK.md` (DO-F2).

`SYNTHETICS_ROLE_ARN` and `SYNTHETICS_ARTIFACT_BUCKET` must be set in `config.env`
for canary creation to be automated; if not set, create the role + bucket first (see
[`PLAYBOOK.md`](PLAYBOOK.md) for one CLI recipe) or create the canaries directly via
the AWS Synthetics console using the handler files in [`canaries/`](canaries/) and
the schedule `rate(1 minute)`.

---

## 8. Verify alarms (G5 gate)

`verify-alarms.sh` induces a synthetic error against each of the seven checks and
confirms each transitions to `ALARM`. Per-check induction methods are documented inline
(DO-I3); `FunctionExecutionErrors` is induced by a temporary broken-function publish to
the clone with a shell trap restoring the real function on any exit (DO-J2).

```bash
./verify-alarms.sh
```

Record which method verified each check in the RUNBOOK G5 row.

---

## 9. Function execution-time validation (G3 gate)

```bash
./test-function.sh
```

Runs `aws cloudfront test-function` over the JSON fixtures in [`test-events/`](test-events/)
and checks the R30a `ComputeUtilization` targets (median < 50 %, p99 < 100 %, max < 90 %).

---

## 10. Final size budget (G4 gate)

```bash
./check-size.sh
```

Already exercised by `deploy-function.sh`, but running it standalone produces a clean
artifact for the G4 evidence row.

---

## 11. Authorize the temp subdomain in Google OAuth (X1)

This step is **manual** (no script). In the Google Cloud Console, open the CODAP Drive
OAuth client and add `https://codap2to3.concord.org` to **Authorized JavaScript origins**.
Tick the matching box in the RUNBOOK's "Pre-flip manual prerequisites".

**Authorized redirect URIs do NOT need a new entry.** Two scenarios cover all of the
pre-flip Drive testing on the temp subdomain; only the JavaScript-origin path needs
authorization:

- **V3-on-temp (any path that lands at `https://codap2to3.concord.org/app/...`)** --
  whether the tester arrives by the function's redirect (G6 Test A: V2-shape URL that
  the function intercepts and redirects to the same origin's `/app/` per R21
  host-preserving) or directly (G6 Test B: `https://codap2to3.concord.org/app/...`),
  the V3 SPA loads at the **temp origin** and the GIS popup runs from
  `codap2to3.concord.org`. **This is the case that requires the new Authorized
  JavaScript origin.**
- **V2 SproutCore via the temp subdomain** -- impossible. Every V2-shape URL on the temp
  subdomain is intercepted by the function and redirected away; V2's redirect-based OAuth
  flow never starts there. So no V2-style redirect URI mirror is needed.

CODAP's V3 flow uses Google's GIS popup with `postMessage`, so it sends no `redirect_uri`
parameter -- the Authorized redirect URIs list is consulted only by V2's redirect flow.
The prod V2 redirect URI (`https://codap.concord.org/releases/latest/static/dg/en/cert/index.html`)
becomes dead post-flip because the function intercepts `/releases/latest/...` on prod too;
cleaning it up is a separate post-flip task, out of CODAP-1323's scope.

The post-flip cleanup removes `https://codap2to3.concord.org` from Authorized JavaScript
origins (out of scope of this story).

---

## 12. Run the Cypress conformance suite (G1 + G2 gates)

The conformance spec is excluded from the v3 default `specPattern` AND `excludeSpecPattern`;
both must be overridden on the command line. Also requires `npm start` to be running
(some tests use a local harness page that iframes the temp subdomain):

```bash
cd ../../../v3
npm install
# In a separate terminal, leave this running:
#   npm start    # webpack dev server at http://localhost:8080
npx cypress run \
  --spec cypress/e2e/v2-v3-redirect.spec.ts \
  --config 'excludeSpecPattern=[]' \
  --env redirectBaseUrl=https://codap2to3.concord.org
```

Every R28 positive row and every R29 negative row must pass. The run report is the
G1/G2 evidence.

---

## 13. Drive double-click validation (G6 gate)

Manual end-to-end check (R27 Path A). Per R21 the function uses a host-preserving
relative `/app/` destination, so a V2-shape URL on `codap2to3.concord.org` redirects
to V3 on `codap2to3.concord.org` (not bounced to prod), and the Drive OAuth flow runs
against the JS origin authorized in Step 11.

Do **both** of these to fully exercise the path:

**Test A -- V2-shape URL exercises the function intercept + redirect**:
1. Open `https://codap2to3.concord.org/app/static/dg/en/cert/index.html#file=googleDrive:<id>`.
2. Confirm the URL bar redirects to `https://codap2to3.concord.org/app/#file=googleDrive:<id>`
   (same temp origin, `/app/` canonical, hash preserved).
3. Confirm the V3 SPA loads (page title "CODAP V3").
4. Confirm Drive OAuth runs (popup) and the document opens.
5. Screenshot URL bar after redirect + loaded document.

This proves: the function fires on V2-shape URLs, the hash is preserved, the relative
destination resolves to the temp origin, and V3 + Drive OAuth work end-to-end.

**Test B -- V3-direct URL skips the function**:
1. Open `https://codap2to3.concord.org/app/#file=googleDrive:<id>` (no V2-shape prefix,
   so the function falls through; V3 SPA loads directly from the V3 S3 origin).
2. Confirm the URL bar does not change (no redirect).
3. Confirm the V3 SPA loads and the Drive OAuth + document open as in Test A.

This proves: V3 itself works on the temp origin without involving the function at all.
A failure of Test B with Test A passing would point at a function bug; a failure of
both points at V3 or OAuth.

Post-flip, both tests end up on `codap.concord.org/app/`. Both screenshots together
form the G6 evidence row in RUNBOOK.

---

## Done

All G1 - G6 evidence collected. Proceed to [`RUNBOOK.md`](RUNBOOK.md): re-run the
"Freshness re-checks (within 48h of flip)" subsection so the G1/G2/G6 evidence reflects
the current v3 build and current prod state, fill in G7 / G8 (sibling stories) and G9
(rollback authorities), get every G-row signed, then run `./flip.sh --confirm`.
