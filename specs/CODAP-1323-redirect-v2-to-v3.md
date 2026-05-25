# Build CloudFront Function for V2 → V3 Redirects

**Jira**: https://concord-consortium.atlassian.net/browse/CODAP-1323

**Status**: **Closed**

## Overview

When CODAP cuts over from version 2 (V2) to version 3 (V3) on June 7, 2026, every existing V2 URL — bookmarks, embedded activities, Google Drive double-click links, and links inside Activity Player content — must continue to land users on a working CODAP experience. This story delivers that redirect entirely at the CDN layer: a single CloudFront Function rewrites each V2 URL to its V3 equivalent, preserving the language and document information the URL carries. The cutover is staged on a clone of the production distribution and activated by a DNS-level switch (with a CloudFront alias move), so it is fast to perform, fast to roll back, and leaves today's production setup untouched until the moment of the flip.

## Requirements

The numbered requirements below are the canonical set. Letter suffixes (`R20a`, `R19c`, etc.) mark items inserted during review; they are read in numerical-then-alphabetical order and were intentionally not renumbered (TW1 / Phase 5 finalization).

### Redirect mapping

V3 lives at `https://codap.concord.org/app/` post-flip. The redirect function attaches to the `/app`, `/app/*`, `/releases/*`, `/v3`, and `/v3/*` cache behaviors of the new cloned distribution. It does not attach to the default cache behavior (marketing site at WPEngine).

- **R1** — Redirect exact `/app` (no trailing slash) to `/app/` with no `?lang=`. Function MUST NOT redirect arbitrary `/app/...` deep paths; only R2/R3 V2-shape paths are intercepted. All other `/app/*` requests fall through to V3 S3 with the `/app` prefix stripped per R1a.
- **R1a** — The same viewer-request function strips the leading `/app` segment from every non-redirected `/app/*` request so the request resolves against V3's `codap3/`-rooted S3 layout. Path rewrite only (no synthetic response, invisible in the URL bar). Applies only to `/app/*` paths and only to GET/HEAD.
- **R2** — Redirect `/app/static/dg/en/cert/...` to `/app/` with no `?lang=`.
- **R3** — Redirect `/app/static/dg/{lang}/cert/...` for non-English `{lang}` to `/app/?lang={lang}`. `{lang}` MUST match `^[A-Za-z]{2,3}(-[A-Za-z]{2,4})?$` (BCP-47-shaped). English-detection: case-insensitive `en` or `en-US`.
- **R4** — Redirect `/releases/{name}` in all three shapes (bare, trailing-slash, with-further-path) to `/app/`, preserving query and hash. `{name}` MUST match `^[^/]+$`. Carve-outs in R9–R13 are routing-handled (cache-behavior topology), not function-handled.
- **R5** — Detect language under `/releases/{name}/static/dg/{lang}/cert/...` per R3 (English / non-English routing identical).
- **R6** — Bare `/static/dg/{lang}/cert/...` is not a real V2 surface on this distribution; no new `/static/*` behavior needed.
- **R6a** — Redirect `/v3`, `/v3/`, and `/v3/...` to `/app/` with no `?lang=`; path collapsed, query+hash preserved.

### Paths that must NOT be redirected

Routing-handled carve-outs (more-specific cache behaviors override `/releases/*`, function not attached):

- **R7** — `/v2`, `/v2/*` (already wired live by CODAP-1325).
- **R8** — `/~bfinzer/*`, `/~eireland/*`, `/~jsandoe/*` (existing behaviors; function not attached).
- **R9** — `/releases/.gapikey` exact-match → V2 origin.
- **R10** — `/releases/staging` AND `/releases/staging/*` (staging is a release tree, both behaviors required).
- **R11** — `/releases/zips/*` → V2 origin.
- **R12** — `/releases/var/*` → V2 origin.
- **R13** — `/releases/apple-touch-icon.png` → V2 origin.
- **R14** — `/releases/latest/extn/plugins/TP-Sampler/*` and `/app/extn/plugins/TP-Sampler/*` → S3 with existing TP-Sampler rewrite functions.

### Preservation invariants

- **R15** — Query strings preserved verbatim on every redirect (with `?lang=` appended per R3/R5 when applicable).
- **R16** — Hash fragments preserved verbatim.
- **R17** — Combined `?lang=` + existing query yields a valid URL (single `?`, `&`-separated).
- **R17a** — Path-detected `{lang}` is authoritative; incoming `lang` query param removed; remaining params preserved verbatim in original order, including duplicates. `URLSearchParams` MAY be used to iterate but its `.toString()` MUST NOT be used to rebuild (it percent-re-encodes, violating R15). Raw-string filter (split on `&`, drop `lang`, keep rest) satisfies both R17a and R15. Single-element output yields exactly `lang=<detected>` with no trailing `&`.

### Mechanism

- **R18** — CloudFront Function attached at viewer-request on the new (cloned) distribution. MUST NOT be attached to `E3H9X49AG3GYSO` (the existing prod distribution) at any point pre-flip. Returns a synthetic HTML+JS response, not an HTTP 301/302 (because browsers don't send the hash to the server).
- **R18a** — Function intercepts only GET and HEAD; other methods fall through to origin.
- **R18b** — Top-level try/catch wraps the entire match-and-construct logic. A caught error returns the original `request` (CloudFront counts this as a successful execution; does NOT register on `FunctionExecutionErrors`). The catch block MUST emit one `console.log`/`console.error` line per caught exception **unconditionally** regardless of `LOG_ENABLED`, tagged `"error-fallthrough"`. R26b alarms on this log line.
- **R19** — Client-side JS reads `window.location.search`/`hash`, constructs the V3 URL, and calls `window.location.replace(v3Url)`.
- **R19a** — Synthetic page body content MUST be static (compiled-in constants). Request-derived values may only flow to `window.location.replace()`; never to DOM via `innerHTML`/`document.write`/etc.
- **R19b** — Static `<noscript>` block with a plain anchor to `/app/` (non-preserving fallback). Sandboxed iframes without `allow-scripts` fall into the same non-preserving path; post-flip LARA/AP library update (out of scope) eliminates the case.
- **R19c** — `<title>CODAP`, body `Loading CODAP…` with `role="status"`, `<noscript>` reads "This page needs JavaScript to send you to CODAP automatically. Use the link above to continue. (Your link's saved settings may not carry over.)" English-only by decision (EDU1). `<html lang="en">` required (WCAG 2.1 SC 3.1.1).
- **R20** — Synthetic-response body ≤ 10 KB (CloudFront limit).
- **R20b** — Function source ≤ 10 KB, measured as the exact byte count of the artifact submitted to `create-function`/`update-function`. Minification optional. `LOG_ENABLED` branch counts.
- **R20c** — Build verifies both budgets before deploy. Failure gates G4 as build failure, not runtime.
- **R20a** — Synthetic response is `200 OK` with `Content-Type: text/html; charset=utf-8`, `Cache-Control: no-store`, `Content-Security-Policy: default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'`, and `X-Content-Type-Options: nosniff`. `script-src 'unsafe-inline'` is required because the inline script carries per-request `{lang}` (per R21a) and so has no build-time-stable hash. HSTS contingency (CR8): if R26a's synthetic-response check finds the response-headers policy doesn't reach function-generated responses, the function adds HSTS itself.
- **R21** — Canonical post-flip V3 URL is `https://codap.concord.org/app/`. Function emits a **host-preserving relative** destination — `V3_BASE_URL = "/app"` — so the browser resolves it against the request origin. Post-flip on prod that's `https://codap.concord.org/app/`; on the pre-flip clone at `codap2to3.concord.org` it's `https://codap2to3.concord.org/app/`. Pre-flip testing therefore actually reaches V3 on the temp subdomain instead of being bounced to prod (which is still V2). The template `${V3_BASE_URL}/${queryString}${original_hash}` uses `queryString` of either `""` or a `?`-prefixed string (the `?` is part of `queryString`).
- **R21a** — URI-extracted values embedded into the synthetic body MUST be HTML- + JS-string-escaped at the construction site. In practice the only such value is `{lang}` from R3/R5 — embedded only as a JS string literal inside the inline `<script>`, never into user-visible DOM content.

### Gating, activation, and infrastructure

- **R22** — Gating is DNS-based, not function-based. The new distribution exists at the temp subdomain throughout the pre-flip period; `codap.concord.org` keeps pointing at `E3H9X49AG3GYSO` until flip day. The only flip-day change to `E3H9X49AG3GYSO` is the R24a CNAME alias move (reversed on rollback).
- **R23** — Top-of-file `LOG_ENABLED` boolean; default `false`. When `true`, per-match `console.log` per R30. When `false`, no per-match logging; the sole exception is the R18b error-fallthrough line, which is unconditional.
- **R24** — Flip-day = two ordered steps: (1) CloudFront alias move per R24a; then — once step 1 reaches `Deployed` — (2) one `aws route53 change-resource-record-sets` against zone `Z2P4W3M7MDAUV6`, ALIAS `codap.concord.org` → new distribution domain. ALIAS TTL = 60s.
- **R24a** — `aws cloudfront associate-alias --target-distribution-id <new> --alias codap.concord.org` moves the CNAME from `E3H9X49AG3GYSO` to the new distribution in one operation. Step 1 MUST precede step 2 AND step 2 MUST NOT issue until step 1 reaches `Deployed` on the new distribution (otherwise the inconsistency window is bounded by CloudFront config propagation, not DNS). A brief `403` window between the two steps is unavoidable and accepted; flip is scheduled in a low-traffic window.
- **R25** — Rollback reverses both flip steps in the same order, with the same `Deployed`-before-DNS wait. Propagation caveat: ~60s is the floor (AWS-managed TTL), not the ceiling. Resolver caches can extend the tail to 1+ hour. Rollback "complete" MUST be declared on error-rate metrics returning to baseline, not on elapsed time.
- **R25a** — Soak window ≥ 14 calendar days. Exit conditions: no RB1–RB6 event, no new redirect-related tickets in the final 7 days, joint sign-off by engineering lead + at least one distinct second signer (R25c secondary or release coordinator). Old distribution `E3H9X49AG3GYSO` archived (not deleted) for 90 days; only then can it be deleted.
- **R25b** — Story is "Done" when R25a exit conditions are met and authorities sign off.
- **R25c** — Primary rollback authority = CODAP V3 engineering lead; secondary on-call confirmed before flip (G9). Either can roll back unilaterally; consensus not required.
- **R26** — Cache-behavior changes on the new distribution: `/app/*` and `/app` to V3 S3 with function attached; `/releases/*` to V3 S3 with function attached; new carve-out behaviors (R9–R13) to V2 origin, no function; new `/v3`, `/v3/*` to V3 S3 origin with function attached (function intercepts; origin never reached). All other behaviors unchanged. None of these changes happen on `E3H9X49AG3GYSO`.
- **R26 cache-behavior precedence (GR1)** — CloudFront evaluates behaviors in configured **list order** (first-match), not by specificity. Carve-outs (R9–R13) and TP-Sampler behaviors (R14) MUST be ordered ahead of the `/releases/*` / `/app/*` general behaviors they overlap. `/v3` / `/v3/*` are disjoint — no precedence constraint.
- **R26a** — Clone procedure is a checked-in script under `devops/cloudfront-functions/v2-v3-redirect/`. Structured diff between source and modified clone configs MUST match an explicit allowlist (CallerReference, Aliases, origin swaps, function attachments, carve-outs, precedence). Verification additionally confirms HSTS and other security headers are response-headers-policy-based (not origin-emitted) and that the policy applies to the function's synthetic response.
- **R26b** — Monitoring: five CloudWatch alarms (`FunctionExecutionErrors`, `"error-fallthrough"` log-metric-filter, `FunctionThrottles`, `5xxErrorRate` >1% sustained 2 min, `4xxErrorRate` >5% sustained 5 min) + two Synthetics canaries (v3-reachability on `/app/`, redirect-correctness on a V2-shape URL asserting the synthetic-response body marker `<!-- codap-redirect -->`). Pre-flip the canaries target the temp subdomain; re-pointed during the flip. All seven MUST be verified to fire on a synthetic error before flip (G5).
- **R26c** — Pre-flip DNS audit: every record under `*.codap.concord.org` classified as irrelevant / handled / unhandled-action-required; CAA + DNSSEC apex checks.
- **R31** — Checked-in flip-day runbook at `devops/cloudfront-functions/v2-v3-redirect/RUNBOOK.md` containing G1–G9 sign-off slots, the exact forward/rollback commands (including the `aws cloudfront wait distribution-deployed` step between alias-move and Route 53), URLs for alarms/dashboards, rollback-authority contacts, the support tier-1 diagnosis path, and the `LOG_ENABLED` enable/revert protocol.
- **R31b** — 60-minute post-flip active watch by R25c primary or delegate — dedicated attention, alarm checks ≥ every 5 min.

### Testing and verification

- **R27** — Pre-flip validation runs against the temp subdomain `codap2to3.concord.org` (name locked, CR12). Drive double-click validation Path A (temp subdomain authorized in Drive OAuth client; recommended) or Path B (deferred to post-flip with formal contingency invocation).
- **R28** — Positive test matrix: every R1/R2/R3/R4/R5/R6a shape with English / sample non-English / unknown-but-shaped codes + V3-shipped-only codes + named-release builds + Drive double-click + combined query+hash + R17a collision + lang-only-query case + iframe-embed (English and non-English).
- **R29** — Negative test matrix: `/` (marketing), routing-handled carve-outs (`/releases/.gapikey`, staging tree, zips, var, apple-touch-icon, `/v2/...`, tilde, TP-Sampler), malformed `{lang}` (script-tag, digits, empty), `/app/static/js/bundle.js` and other V3 asset shapes, `/app/favicon.ico` and `/app/manifest.json` (root-level V3 assets — GR4), and **redirect-destination loop-safety** (`/app/`, `/app/?lang=fr`, `/app/?lang=fr&foo=bar` must fall through with no further redirect — QA-F5), plus `/releases/` (empty `{name}`).
- **R30** — `LOG_ENABLED=true` per-match log line: source path (`request.uri`) + query (reconstructed from `request.querystring` — CloudFront exposes them separately), action taken (for redirects: `V3_BASE_URL` + R17a-processed query, no hash since hash is client-side), short rule tag. The R18b error-fallthrough line is emitted unconditionally with the fixed tag `"error-fallthrough"` (independent of `LOG_ENABLED`).
- **R30a** — Function execution-time validation via `aws cloudfront test-function`. `ComputeUtilization` (percentage of CloudFront's max per-invocation budget) is the operative measured quantity: median < 50%, p99 < 100%, no URI at or near 100% (≈ 1ms budget). Failure gates G3.

### Flip-day go/no-go criteria

All MUST be true before the Route 53 swap:

- **G1** — R28 positive matrix passes against the temp subdomain.
- **G2** — R29 negative matrix serves the expected origin (V2, V3 SPA or V3 asset from V3 S3, V3 S3 404, or marketing) without the redirect function firing.
- **G3** — R30a ComputeUtilization within budget.
- **G4** — R20 / R20b / R20c 10 KB budgets satisfied.
- **G5** — All seven R26b checks verified to fire on a synthetic error.
- **G6** — Drive double-click validated, or Path B contingency formally invoked (R27).
- **G7** — Sibling stories (CODAP-1325, CODAP-1324, CODAP-1326, CODAP-1319 if not waived) merged and verified.
- **G8** — Stakeholder communication owned by CODAP-1322 sent on schedule.
- **G9** — Primary + secondary rollback authorities (R25c) confirmed available.

Each criterion signed off by a named individual before the swap.

### Rollback triggers (RB1–RB6)

- **RB1** — Distribution 5xx rate >1% sustained ≥ 2 min (baseline ≪ 0.1%).
- **RB2** — Spot-check of `/app/` from ≥ 2 geographic locations returns anything other than V3.
- **RB3** — Any R28 positive matrix URL fails post-swap.
- **RB4** — Google Drive double-click flow fails to reach V3 with document loaded.
- **RB5** — Function execution-error rate above 0.5%.
- **RB6** — Support tickets reporting "CODAP won't load" exceed 5 in first 30 min post-flip.

Borderline conditions (individual broken URLs caused by V3 bugs, V3 application errors, slow loads not tied to redirect) are fix-forward defaults unless they compound.

## Technical Notes

### CloudFront Function constraints

Synchronous, no network/disk/state. ~1ms max execution; 10 KB max function source; 10 KB max synthetic-response body. Runtime: `cloudfront-js-2.0` (modern syntax including template literals). Other CC distributions in the same account already use `cloudfront-js-2.0`; this story follows that convention.

### Current CloudFront topology

Production distribution: **`E3H9X49AG3GYSO`**, default behavior → `codap.wpengine.com` (marketing). Existing relevant behaviors: `/app`, `/app/*`, `/releases/*` → `codap server` (V2); `/v2`, `/v2/*` → `codap server`; `/app/extn/plugins/TP-Sampler/*` and `/releases/latest/extn/plugins/TP-Sampler/*` → S3 with rewrite functions; `/~bfinzer/*` / `/~eireland/*` / `/~jsandoe/*` → V2. No `/static/*` behavior (so bare `/static/dg/...` 404s today). Exceptions (`/releases/.gapikey`, `staging`, `zips/*`, `var/*`, `apple-touch-icon.png`) are all currently served by the single `/releases/*` behavior; the new distribution gives each its own more-specific cache behavior (Q14=B / R26) so the function performs no in-code carve-out matching.

Reference function patterns already in the account: `RedirectInsideConcord` (minimal 301), `StripCodapResourcesPrefix` (regex URI rewrite), TP-Sampler rewrites — useful as shape references.

### Flip mechanism

Clone `E3H9X49AG3GYSO` into a new distribution (encoded in checked-in script under `devops/cloudfront-functions/v2-v3-redirect/`). Apply V3 cutover changes per R26 (origin swaps, function attachments, new carve-out behaviors, precedence ordering). Expose at temp subdomain `codap2to3.concord.org` (covered by the existing `*.concord.org` wildcard ACM cert `arn:aws:acm:us-east-1:612297603577:certificate/2b62511e-ccc8-434b-ba6c-a8c33bbd509e`). Pre-flip validation runs against the temp subdomain.

Flip day = two ordered steps: (1) `aws cloudfront associate-alias --target-distribution-id <new> --alias codap.concord.org`; wait until `Deployed` on the new distribution; (2) `aws route53 change-resource-record-sets` updating the `codap.concord.org` ALIAS in zone `Z2P4W3M7MDAUV6` from `d13zmjbnp90bac.cloudfront.net.` to the new distribution's domain. Brief `403` window between steps is expected. Rollback reverses both with the same wait.

Soak: 14-day minimum post-flip; `E3H9X49AG3GYSO` archived (not deleted) for 90 days after soak passes.

### V3 language handling

V3 (`v3/src/utilities/translation/languages.ts`) bundles 18 codes: `de, el, en-US, es, fa, fr, he, ja, ko, nb, nl, nn, pl, pt-BR, th, tr, zh-Hans, zh-TW`. V2 historically shipped 13. The function passes the path-detected `{lang}` through verbatim (case preserved) without hard-coding a whitelist; V3's language module falls back safely on unknown codes, and `en`/`en-US` are aliased.

### V3 S3 origin layout (IF1)

The V3 S3 origin is `S3-Website-models-resources-codap3` with `OriginPath: /codap3`. V3 is rooted at `codap3/` (index `codap3/index.html`, hashed assets `codap3/version/{tag}/...`) — the same layout `codap3.concord.org` (distribution `E7WVRGISCR2VR`) serves. A `/app/*` request against this origin would otherwise resolve to non-existent S3 key `codap3/app/...`; the function's R1a strip rewrites `/app/...` to `/.../` before origin so the request resolves to a valid `codap3/...` key.

## Out of Scope

Items unrelated to this story:
- Changes to V2 SproutCore code or V2 release process.
- Changes to V3 application code (sibling stories own these).
- The `/v2` symlink on the EC2 origin — CODAP-1325.
- SageModeler-side CloudFront updates — CODAP-1325.
- V3 release switch flips (log destination, save extension, V2-doc auto-save) — CODAP-1326.
- "Launch CODAP" marketing-site button update — content team.

Post-flip follow-ups (tracked separately; not blocking R25b completion):
- Google Drive Open URL config change (CODAP-1094 Option B) — ticket TBD.
- LARA / Activity Player library entries — update embedded V2 URLs to V3 form; ticket TBD.
- Post-flip observability work (Rollbar, telemetry beyond R26b) — ticket TBD.
- Remove temp-subdomain authorization from Google Cloud Console — ticket TBD.
- Remove the temp subdomain (Route 53 record + new distribution's `Aliases` entry) — ticket TBD.
- Delete archived `E3H9X49AG3GYSO` after the 90-day archive window — calendar reminder ~2026-09.

## Not Yet Implemented

The following are explicitly deferred:

- **`/v3` version-pinning** — `/v3` and `/v3/*` currently *redirect* to `/app/` (R6a). True version-pinning (freezing `/v3` at a build once `/app` advances to a future `/v4`) is deferred to the V3→V4 cutover that will actually need it. (Q13 / IQ4 / IF2 — Phase 2 implementation simplification; no version-pinned origin or build/deploy plumbing is in scope here.)
- **iframe-phone re-handshake assertion in the Cypress conformance suite** — the R28 iframe-embed test asserts only the post-redirect URL in an iframe context. The iframe-phone re-handshake between CODAP and its embedder is a property of V3 and the LARA/AP integration; the redirect function only navigates the iframe. (QA-I3 / Phase 3 — re-handshake testing belongs in the V3 / LARA / AP test suites.)
- **Localization of the synthetic redirect page** — the page is English-only by decision (EDU1). Localizing would expand source toward R20b's 10 KB budget and complicate R19a's static-content-only constraint. Revisit if user reports indicate the brief English flash is confusing in classroom contexts.

## Decisions

Resolved decisions from nine review passes, two external review rounds (GitHub Copilot, Google Gemini), and Phase 2 implementation planning. Grouped thematically; the source spec retains full Context / Options / Decision narrative.

### Destination, paths, and routing model

#### Q1 — V3 destination URL
**Context**: V3 serves on `codap.concord.org` (not `codap3.concord.org`); current-version always at `/app/`, version-pinned URLs (`/v3/`, future `/v4/`, etc.) coexist for cross-cutover continuity.
**Options considered**: explicit URL (A) vs. defer (B).
**Decision**: A — `https://codap.concord.org/app/`. `V3_BASE_URL` constant in the function source; R21 codifies. (Subsequently rewritten as a host-preserving relative `"/app"` — see R21 entry below.)

#### Q6 — Test/cutover distribution
**Context**: Originally a path-prefix carve-out (`/2v2/*`); design shifted to a full distribution clone so pre-flip testing exercises a configuration identical to post-flip prod.
**Options considered**: (A) ephemeral temp distribution, (B) reuse staging, (C) test against `codap3.concord.org`, (D) prefix-carve-out (previously chosen), (E) clone-and-DNS-swap.
**Decision**: E — clone `E3H9X49AG3GYSO`, apply V3 changes, expose at `codap2to3.concord.org`. Flip = Route 53 ALIAS swap; rollback = same call reversed. Captured in R22–R26 plus the Technical Notes flip-mechanism section.

#### Q8 — Trailing slash before `?`
**Decision**: A — always include the slash. Destination is `${V3_BASE_URL}/${queryString}${hash}`, so a no-query no-hash redirect yields exactly `/app/` (CR4 clarified that `queryString` is `""` or a `?`-prefixed string).

#### Q11 — Does the function intercept `/`?
**Decision**: A — leave `/` alone. Marketing site at WPEngine continues to serve at `/`. The "Launch CODAP" button on marketing is updated by the content team separately.

#### Q12 — Bare `/static/dg/{lang}/cert/...`?
**Decision**: A — do nothing. The Jira mapping table's `/static/...` rows are shorthand for `/app/static/...` (user clarified); covered by R2/R3.

#### Q13 / IQ4 / IF2 — `/v3` and `/v3/*`
**Context**: Original Q13 added `/v3` cache behaviors that *served* V3 from a version-pinned S3 path with no function attached. Phase 2 planning found a simpler design: post-flip `/app/` *is* current V3, so `/v3` is just another name for it.
**Decision**: `/v3` and `/v3/*` **redirect** to `/app/` via the redirect function (R6a). No version-pinned origin; no `/v3`-specific deploy step. Version-pinning machinery is deferred to the V3→V4 cutover.

#### Q14 — `/releases/*` routing on the new distribution
**Options considered**: (A) keep on V2, function intercepts launchable subpaths; (B) swap to V3, each carve-out gets a more-specific cache behavior; (C) swap to V3, function URI-rewrites deep paths (URL bar stays V2-shape).
**Decision**: B — `/releases/*` swaps to V3 S3; carve-outs (`.gapikey`, `staging`, `staging/*`, `zips/*`, `var/*`, `apple-touch-icon.png`) get their own more-specific behaviors routing to V2 origin. Function performs zero in-code carve-out matching (R9–R13 are routing-handled). Q3's earlier "hybrid" in-function carve-out check (CR7) is partially superseded by this.

#### IQ1 / IF1 — `/app`-prefix strip
**Context**: Origin-swapping `/app/*` to the V3 S3 origin alone is insufficient — the V3 origin is rooted at `codap3/` (not `codap3/app/`), so `/app/version/{tag}/main.js` would resolve to a non-existent S3 key.
**Decision**: The same viewer-request function strips the leading `/app` from every non-redirected `/app/*` request (R1a). No separate strip function — CloudFront permits only one function per event type per cache behavior. Discovered during Phase 2 planning; six self-review passes had reasoned about origin choice without tracing a path through to its S3 key.

#### R21 — Host-preserving relative destination
**Context**: V3_BASE_URL was originally `'https://codap.concord.org/app'` (absolute). That worked on prod but bounced every V2-shape redirect on the pre-flip clone over to prod (still V2 pre-flip), so pre-flip testing on the temp subdomain couldn't actually reach V3.
**Decision**: Change `V3_BASE_URL = '/app'` (relative). Browser resolves against current origin; post-flip prod behavior is identical; pre-flip testing on `codap2to3.concord.org` now actually reaches V3 on the temp subdomain. (Decision made during PREFLIGHT pipeline execution, 2026-05-25; spec updated in the same change.)

#### GR1 — Cache-behavior precedence
**Context**: Spec previously asserted CloudFront "picks the most-specific match". It does not — it uses configured **list order (first-match)**.
**Decision**: Cache-behavior list order is load-bearing. Carve-outs (R9–R13) and TP-Sampler behaviors (R14) MUST be ordered ahead of the general `/app/*` / `/releases/*` behaviors they overlap. `/v3` / `/v3/*` are disjoint — no precedence constraint. R26 made this explicit; R26a's verification confirms the ordering.

### Function behavior

#### Q7 — Logging
**Decision**: D — top-of-file `LOG_ENABLED` boolean; default `false`. When `true`, one `console.log` per match (R30: source path+query, action, rule tag). Edit-and-republish workflow (no runtime toggle).

#### PEN1 / R18b — Exception safety
**Decision**: Top-level try/catch wraps the match-and-construct logic; uncaught errors fall through to origin instead of producing a CloudFront-default 5xx.

#### REL-F1 — Error-fallthrough observability
**Context**: A try/catch that catches and returns a valid `request` is recorded by CloudFront as a *successful* execution — `FunctionExecutionErrors` stays at 0 for caught errors. R18b had assumed otherwise. Combined with R23 (no logging when `LOG_ENABLED=false`), a caught exception in production would be entirely silent.
**Decision**: (1) R18b's prose corrected. (2) The catch block emits a `console.log` line per caught exception **unconditionally** (independent of `LOG_ENABLED`), tagged `"error-fallthrough"` — extended to R30. (3) R26b gains a fifth CloudWatch alarm: a Logs metric filter on the `"error-fallthrough"` tag.

#### SEC-F1 — CSP for inline script
**Context**: Sec4 had proposed `script-src 'sha256-<hash>'` on the rationale that the script was byte-stable. SEC-F1 found this misread R19a: the inline script carries the per-request `{lang}` (R21a) and so has no build-time-stable hash.
**Decision**: R20a specifies `script-src 'unsafe-inline'`. The `'sha256-'` preference is withdrawn for the script (residual XSS defense via `default-src 'none'`, R19a's static-body rule, R21a's escaping is adequate). `style-src 'sha256-<hash>'` remains a valid stricter alternative for the (genuinely static) styles.

#### GR2 — Empty-remainder query reconstruction
**Decision**: R17a reworded as an explicit join over the ordered parameter list. Single-element list yields exactly `lang=<detected>` with no trailing `&`. R28 gains a `lang`-only row covering this case.

#### GR3 / SE3 — `lang` collision and duplicate query keys
**Decision**: R17a treats the original query as an ordered list of `name=value` pairs: every `lang` pair removed; all others (including duplicates `foo=1&foo=2`) preserved in original order and multiplicity. `URLSearchParams` MAY parse but its `.toString()` MUST NOT be used to rebuild (it percent-re-encodes, violating R15 — XR2).

#### SEC-F2 / CR8 — HSTS and response-headers policy
**Context**: R20a originally omitted HSTS "because CloudFront sets it for the domain". But (1) HSTS could be origin-emitted rather than policy-emitted — origin swap to V3 S3 would silently drop it; (2) even if policy-emitted, the policy may not reach the function's synthetic responses.
**Decision**: R26a verifies HSTS (and other security headers) is response-headers-policy-based by running `curl -I` against both an origin-served URL and a synthetic-response URL on the clone. If origin-emitted today, adding the policy is in scope. R20a gains an HSTS contingency: if the synthetic-response check fails, the function adds HSTS itself.

#### SE2 / SE-F1 — `{lang}` shape and English detection
**Decision**: `{lang}` matches `^[A-Za-z]{2,3}(-[A-Za-z]{2,4})?$` (BCP 47-shaped). English detection is case-insensitive `en` or `en-US`; all other shaped codes are non-English (R3 path).

#### SE4 — `{name}` shape
**Decision**: `^[^/]+$`. Maximally permissive because Q14=B's routing-handled carve-outs already exclude `/releases/*` paths that should not redirect.

### Infrastructure, cutover, monitoring

#### Q4 — Function source location
**Decision**: B — `devops/cloudfront-functions/v2-v3-redirect/` at repo root.

#### Q5 — Distribution IDs
**Decision**: A — production distribution `E3H9X49AG3GYSO` (Route 53 zone `Z2P4W3M7MDAUV6`; ACM cert `arn:aws:acm:us-east-1:612297603577:certificate/2b62511e-ccc8-434b-ba6c-a8c33bbd509e`, `*.concord.org` wildcard).

#### DO-F1 — Flip is not DNS-only
**Context**: Initial framing was "single Route 53 swap; E3H9X49AG3GYSO untouched". CloudFront requires the host to be in the distribution's `Aliases` to serve it (a domain not on the distribution returns 403). Therefore flip needs a CNAME alias move from `E3H9X49AG3GYSO` to the new distribution AS WELL AS the Route 53 swap.
**Decision**: R24a — flip-day step 1 is `aws cloudfront associate-alias`, step 2 is the Route 53 swap. Step 1 modifies `E3H9X49AG3GYSO` (the only such modification in this story). Rollback reverses both.

#### DO-F6 — `Deployed`-before-DNS wait
**Context**: R24a's "step 1 precedes step 2" was ambiguous between *submitted* and *deployed*. `associate-alias` modifies `Aliases` on both distributions; each transitions to `InProgress` and must redeploy. Issuing step 2 early would expose the longer CloudFront-config-propagation window — exactly the failure R24a's ordering claims to avoid.
**Decision**: R24a + R25 + R31 + Technical Notes flip-mechanism all require step 2 NOT to fire until step 1 reaches `Deployed`. R31's runbook command list includes an `aws cloudfront wait distribution-deployed` step between alias-move and Route 53.

#### DO-F3 — `/releases/staging` is a tree, not a file
**Decision**: Two carve-out behaviors required — `/releases/staging` exact AND `/releases/staging/*` — both routing to V2 origin. Verified live 2026-05-22.

#### Ops3 / R26b — Monitoring
**Decision**: Five CloudWatch alarms + two Synthetics canaries (V3-reachability + redirect-correctness). All seven verified to fire on a synthetic error before flip (G5). Synthetic monitors target the temp subdomain pre-flip; re-pointed during the flip.

#### IR2 / CR1 — Alarm routing
**Decision**: No automated routing to Slack/PagerDuty/email. Primary monitoring mode is manual CLI/console watch by R25c authority during the flip and the R31b active-watch window. "High-severity" / "informational" tags on alarm bullets are severity classifications for the manual watcher, not automated-routing instructions.

#### Ops4 — Drive OAuth temp-subdomain authorization
**Decision**: Step 6a of the clone procedure — authorize `codap2to3.concord.org` in the Google Cloud Console for the CODAP Drive OAuth client — makes Path A (Drive double-click validated pre-flip) the default. Removal during post-flip cleanup tracked under CC4.

#### Ops5 / R26c — DNS audit
**Decision**: Pre-flip audit of every record under `*.codap.concord.org`, CAA at the zone apex, DNSSEC disabled confirmation.

### Soak, rollback, runbook

#### Ops2 / R25a — Soak duration and disposition
**Decision**: 14-day minimum soak; exit conditions and joint sign-off (engineering lead + distinct second signer — DO-F5); `E3H9X49AG3GYSO` archived (disabled, not deleted) for 90 days.

#### QA3 — Rollback triggers
**Decision**: RB1–RB6 enumerated. Borderline conditions (individual broken URLs from V3 bugs, V3 app errors not caused by the redirect) are fix-forward.

#### CC3 / R25c — Rollback authority
**Decision**: Primary = CODAP V3 engineering lead; secondary on-call confirmed before flip (G9). Either may roll back unilaterally.

#### REL3 — DNS propagation caveat
**Decision**: R25 amended — ~60s is the propagation floor, not the ceiling; resolvers commonly hold past TTL. Rollback "complete" declared on error-rate metrics, not elapsed time.

#### IR1 / R31 — Flip-day runbook
**Decision**: Checked-in artifact at `devops/cloudfront-functions/v2-v3-redirect/RUNBOOK.md`. Required content enumerated; runbook must exist before G1–G9 sign-off begins.

#### IR4 / R31b — Post-flip active watch
**Decision**: 60 minutes of dedicated attention by R25c primary or delegate post-swap; alarm checks ≥ every 5 min.

### Test, validation, content

#### Q2 / Q9 — Gating and bypass
**Decisions**: Q2 — superseded by Q6 (DNS-based gating, no in-function `ENABLED` constant). Q9 — no `?noredirect=1` escape hatch; support uses `/v2/...` for V2 access.

#### Q3 — `/releases/*` matcher
**Decision**: Hybrid (in-function carve-out check + shape-based rule), partially superseded by Q14=B which moved carve-outs to routing. Only R4's shape-based `^[^/]+$` rule remains live in-function.

#### Q10 — Which cache behaviors carry the function
**Decision**: A — minimum set `/app`, `/app/*`, `/releases/*` (later extended to add `/v3`, `/v3/*` per IQ4). Other V2 sub-paths (`/migration-test/*` etc.) left alone.

#### QA1 / R28 — Positive matrix coverage
**Decision**: 12 V2 non-English codes enumerated + V3-only `fa` + unknown-but-shaped `xx` + R17a collision + representative `/releases/{name}` builds + Drive double-click + iframe-embed (English + non-English). Loop-safety rows added by QA-F5 (see below).

#### QA-F5 — Redirect-loop safety
**Context**: The function is attached to `/app/*`. Every destination it emits is itself an `/app/*` path, so the post-redirect request re-invokes the function. A regression that re-redirects `/app/` would produce an infinite client-side loop — the function's highest-severity failure mode.
**Decision**: R29 gains explicit rows for the redirect destinations (`/app/`, `/app/?lang=fr`, `/app/?lang=fr&foo=bar`) — each MUST fall through to V3 S3 with no synthetic redirect.

#### GR4 — Root-level V3 assets
**Decision**: R29 gains `/app/favicon.ico` and `/app/manifest.json` — single-segment root-level V3 assets that must pass through to V3 S3 (not captured by R1's exact-`/app` rule).

#### QA-I1 — Cypress origin signals
**Decision**: R29 negative tests assert origin-identifying signals — `Server: nginx` for marketing, `Server: Apache` for V2 origin, `Server: AmazonS3` for V3 S3, `<title>Sampler</title>` for TP-Sampler. (Markers tightened during PREFLIGHT pipeline execution, 2026-05-25; `SC.Page` and `TP-Sampler` body-marker assertions corrected to ones that actually appear in current origin responses.)

#### QA-I2 — HEAD-method unit test
**Decision**: Added unit test confirming HEAD requests reach the same matcher and produce the same synthetic response shape (CloudFront strips the body per RFC 9110 §9.3.2; the function doesn't branch).

#### QA-I3 — iframe-phone re-handshake
**Decision**: Descoped. R28's iframe-embed test asserts only the post-redirect URL; iframe-phone behavior belongs in the V3 / LARA / AP test suites.

#### IQ2 — Jest test location
**Decision**: Jest tests live alongside the function under `devops/cloudfront-functions/v2-v3-redirect/`. Run with `npm test` from that folder. Out of v3's main Jest project to keep the redirect's tests independent of the v3 app's test config.

#### IQ3 — Cypress conformance suite placement
**Decision**: Cypress spec lives at `v3/cypress/e2e/v2-v3-redirect.spec.ts`, excluded from the default `specPattern` AND added to `excludeSpecPattern` (so it doesn't run in CI regression — the temp subdomain only exists pre-flip). Run on demand with explicit `--config 'excludeSpecPattern=[]'` and `--env redirectBaseUrl=...`.

#### IQ-Note — `URLSearchParams` for query reconstruction
**Decision**: Function uses a raw-string filter to satisfy both R17a's ordered-pair preservation and R15's verbatim preservation. `URLSearchParams.prototype.toString()` is rejected because it percent-re-encodes parameter values. (XR2 clarified R17a's parenthetical that `URLSearchParams` MAY be used to parse/iterate but not to rebuild.)

#### Q1 (R26b) / REL1 — Synthetic-monitor design
**Decision**: Two probes (V3-reachability on `/app/` + redirect-correctness on a V2-shape URL asserting `<!-- codap-redirect -->` body marker). The second probe is the only continuous check that catches silent wrong-destination logic regressions.

### Synthetic-page content, accessibility, security

#### R19c / CS1 / CS-F3 — Page content
**Decision**: `<title>CODAP`; body `Loading CODAP…` with `role="status"`; trivial inline styling. `<noscript>`: `<a href="/app/">Open CODAP</a>` plus the rewording from CS-F3: "This page needs JavaScript to send you to CODAP automatically. Use the link above to continue. (Your link's saved settings may not carry over.)" English-only by decision (EDU1).

#### WCAG1 / WCAG-I1 — Accessibility
**Decision**: `<html lang="en">` (SC 3.1.1). Body message carries `role="status"` so assistive tech may announce it.

#### Sec1 / R21a — XSS defense for embedded `{lang}`
**Decision**: BCP-47 shape constraint (primary), HTML- + JS-string-escape at construction site (belt-and-suspenders). `{lang}` is embedded only as a JS string literal inside the inline `<script>`; never into user-visible DOM content (CR9 reconciliation with R19a).

#### Sec2 / R19a — Hash XSS via DOM sinks
**Decision**: Body content static; request-derived values may only flow to `window.location.replace()`. `innerHTML` / `document.write` / `outerHTML` forbidden for request-derived data.

#### Sec3 / Sec5 — Security headers
**Decisions**: Sec3 — R20a mandates `Content-Type`, `Cache-Control: no-store`, CSP, and `X-Content-Type-Options: nosniff`. Sec5 — clickjacking headers NOT added (synthetic page is purely navigational, no interactive controls beyond the noscript link).

### Performance and operational hygiene

#### Perf1 / R30a / PERF-F3 — Execution-time validation
**Decision**: `aws cloudfront test-function` against R28/R29 sample. Pass/fail in `ComputeUtilization` percentage (the unit the tool emits): median < 50%, p99 < 100%, no URI at or near 100%. Failure gates G3.

#### Perf2 / R20 / R20b / R20c — Size budgets
**Decision**: Two separate 10 KB budgets — synthetic-response body AND function source artifact submitted to `create-function`/`update-function`. CR10 fixed R20b's measurement basis (exact deployed bytes, minification optional). Build-time verification gates G4.

#### Fin1 / Fin2 — Cost
**Decisions**: Fin1 — cost documentation skipped (well-understood within the CC account). Fin2 — `LOG_ENABLED` enable/revert protocol lives in the R31 runbook, not in requirements.

#### CS2 — Support tier-1 diagnosis
**Decision**: Diagnosis steps (reproduce in anonymous window, inspect URL bar after redirect, classify redirect-didn't-fire vs V3-app-failure, escalation) live in R31 runbook, not in requirements.

### Decisions made during PREFLIGHT pipeline execution (2026-05-25)

These were uncovered while actually running the pipeline end-to-end and are captured in their corresponding commits on the branch:

- **modify-clone.sh** had three real jq bugs (invalid `$.` root prefix; stray `|` before `def`s; assumption that prod's `/app/*` already used a modern `CachePolicyId` — it uses the legacy `ForwardedValues` shape). Fixed by patching the script to clone the existing /app/* behavior as the template for new behaviors.
- **modify-clone.sh** also needed `Headers={Quantity:0, Items:[]}` on V3-pointing behaviors (S3-website uses the Host header for bucket resolution; forwarding the temp-subdomain Host would make S3 look up a non-existent bucket).
- **modify-clone.sh** wasn't idempotent on re-runs — fixed with a `reduce`-based dedup keeping first occurrence by PathPattern.
- **deploy-monitoring.sh** had three issues: deprecated Synthetics runtime `syn-nodejs-puppeteer-7.0` (bumped to `15.1`); FunctionExecutionErrors/FunctionThrottles alarms missing `Region=Global` dimension (so they sat in INSUFFICIENT_DATA forever); sparse counter metrics need `FILL(m1, 0)` metric math to auto-recover from ALARM state (otherwise the alarm latches indefinitely after firing).
- **verify-alarms.sh** canary "point at invalid host" verification doesn't work because AWS Synthetics' `UpdateCanary` silently drops `EnvironmentVariables`. Replaced with passive observation of canary state + recent run history. **Flip-day canary re-pointing is therefore delete + recreate** (with the canary handler's fallback target updated in source first), not `update-canary` — RUNBOOK reflects this.
- **dns-audit.sh** had unescaped backticks inside `echo "..."` (shell tried to exec `amazon.com` as a command) and `dig CAA … +short || echo "(empty)"` didn't fire on the empty-but-zero-exit case. Fixed.
- **expected-diff.md** allowlist needed entries for: the S3-CORS-1 → S3-CORS cache-policy substitution on `sensor-interactive/*` and `multidata-plugin/*` (S3-CORS-1 is at the AWS per-policy distribution quota of 100); the `+FunctionAssociations.Items` additions; and the `~/-ForwardedValues.Headers` mutations on V3-pointing behaviors.
- **Coverage tooling**: `nyc.all=true` with no `include` walked into `cypress/screenshots/`, treating screenshot files as source and trying to generate `<test-name>.png.html` reports — exceeded the 255-byte filesystem filename limit. Fixed with `include: ["src/**/*.{ts,tsx,js,jsx}"]` in package.json's nyc config.

These were all documented during the PREFLIGHT-execution session; commits listed at the tail end of the branch.
