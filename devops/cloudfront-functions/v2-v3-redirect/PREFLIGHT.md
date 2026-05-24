# Pre-flip pipeline -- CODAP V2 -> V3 cutover (CODAP-1323)

This is the ordered build-and-validate pipeline that stands up the cloned CloudFront
distribution at the temp subdomain `codap2to3.concord.org` and verifies it is ready for
flip day. Run every step here BEFORE following [`RUNBOOK.md`](RUNBOOK.md).

- This document = **how to stand things up** (one-time setup, all running scripts).
- [`RUNBOOK.md`](RUNBOOK.md) = **how to flip and roll back** (the day-of procedure).

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
returns the expected ETag and the `Status` is `READY`.

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
canaries are created targeting `$TEMP_SUBDOMAIN`; they are re-pointed to
`codap.concord.org` as part of `RUNBOOK.md` (DO-F2).

`SYNTHETICS_ROLE_ARN` and `SYNTHETICS_ARTIFACT_BUCKET` must be set in `config.env`
for canary creation to be automated; if not set, create them in the AWS console using
the handler files in [`canaries/`](canaries/) and the schedule `rate(1 minute)`.

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
OAuth client and add `https://codap2to3.concord.org` to the authorized JavaScript
origins / redirect URIs so the G6 Drive double-click validation (R27 Path A) can run
pre-flip. Tick the matching box in the RUNBOOK's "Pre-flip manual prerequisites".

The post-flip cleanup removes the temp subdomain from the authorized list (out of scope
of this story).

---

## 12. Run the Cypress conformance suite (G1 + G2 gates)

The conformance spec is excluded from the v3 default `specPattern`; run it on demand:

```bash
cd ../../../v3
npm install
npx cypress run --spec cypress/e2e/v2-v3-redirect.spec.ts \
  --env redirectBaseUrl=https://codap2to3.concord.org
```

Every R28 positive row and every R29 negative row must pass. The run report is the
G1/G2 evidence.

---

## 13. Drive double-click validation (G6 gate)

Manual end-to-end check (R27 Path A): in a browser, click a sample Drive double-click
URL pointing at the temp subdomain (`https://codap2to3.concord.org/app/static/dg/en/cert/index.html#file=googleDrive:<id>`).
Confirm the redirect lands at `https://codap.concord.org/app/#file=googleDrive:<id>` and
the document opens. Screenshot the URL bar after redirect + the loaded document for the
G6 evidence row.

---

## Done

All G1 - G6 evidence collected. Proceed to [`RUNBOOK.md`](RUNBOOK.md): fill in G7 / G8
(sibling stories) and G9 (rollback authorities), get every G-row signed, then run
`./flip.sh --confirm`.
