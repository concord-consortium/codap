# Build CloudFront Function for V2 → V3 Redirects

**Jira**: https://concord-consortium.atlassian.net/browse/CODAP-1323
**Repo**: https://github.com/concord-consortium/codap
**Implementation Spec**: [implementation.md](implementation.md)
**Status**: **Finalized — Ready for Implementation**

## Overview

When CODAP cuts over from version 2 (V2) to version 3 (V3) on June 7, 2026, every existing V2 URL — bookmarks, embedded activities, Google Drive double-click links, and links inside Activity Player content — must continue to land users on a working CODAP experience. This story delivers that redirect entirely at the CDN layer: a single CloudFront Function rewrites each V2 URL to its V3 equivalent, preserving the language and document information the URL carries. The cutover is staged on a clone of the production distribution and activated by a DNS-level switch, so it is fast to perform, fast to roll back, and leaves today's production setup untouched until the moment of the flip.

## Project Owner Overview

CODAP version 3 has been in public beta for a long stretch, and the team has committed to a single "big bang" cutover: on June 7, 2026, the `codap.concord.org` domain begins serving V3 instead of V2. The risk this story addresses is **link continuity**. Years of V2 URLs are in circulation — teacher bookmarks, activities embedded in the Activity Player, Google Drive "open with" links, and curriculum content — and on flip day every one of them must still open a working CODAP. Historically that redirect was handled by static HTML files shipped with each V2 release, an approach that is brittle and tightly coupled to the (soon-retired) V2 release process. This story replaces it with a single redirect program owned entirely at the CDN layer, decoupled from any application release.

To keep flip day low-risk, the redirect and all cutover configuration are staged on a clone of the live production setup and validated ahead of time against a temporary address, so the thing being tested is configuration-identical to what production becomes after the flip. The flip itself, and its rollback, are quick DNS-level switches; the existing production distribution is preserved untouched and archived afterward, so reverting the cutover is a known, rehearsed operation rather than an emergency rebuild. The story is considered complete only after a 14-day post-flip soak with no rollback-triggering incidents.

## Background

CODAP V3 has been in public beta for a long stretch and the team has agreed on a "big bang" cutover: on Sunday, June 7, 2026, every V2 URL on `codap.concord.org` starts redirecting to V3. The strategy for which paths redirect where comes from [PR #2340](https://github.com/concord-consortium/codap/pull/2340) and is informed by traffic data from [CODAP-1090](https://concord-consortium.atlassian.net/browse/CODAP-1090) (CloudFront log analysis) and [CODAP-1091](https://concord-consortium.atlassian.net/browse/CODAP-1091) (Activity Player URL stats). The full release context lives in [v3/doc/v3-release-plan.md](../../v3/doc/v3-release-plan.md) ([CODAP-1322](https://concord-consortium.atlassian.net/browse/CODAP-1322)).

PR #2340 originally proposed deploying static HTML redirect files via the V2 release process. That mechanism was selected before the CloudFront-Functions-returning-HTML approach was on the table. This story replaces it with a single CloudFront Function — no V2 release-process coupling, no symlink choreography, fully owned at the CloudFront layer.

**Why client-side, not 301/302.** Browsers do not send URL hash fragments to the server, so any redirect computed server-side (HTTP 301/302) drops the hash. CODAP URLs use hash fragments heavily for document references (`#shared=…`, `#file=googleDrive:…`, etc.), so hash preservation is non-negotiable. A CloudFront Function that returns inline HTML+JS gets the HTML to the browser, where JavaScript can read the hash and assemble the destination URL. The HTML body (roughly 50 lines) fits well inside CloudFront's 10 KB response-size limit for synthetic responses from a viewer-request function.

**Sibling cutover work** (separate stories; this story does not depend on them in any particular order, but flip-day readiness does — see G7).

Status vocabulary: `✅ Done` / `⏳ In progress` / `❓ Confirm` / `🚫 Blocking`.

- [CODAP-1325](https://concord-consortium.atlassian.net/browse/CODAP-1325) — `/v2/` URL setup so SageModeler and other V2-pinned clients keep working after cutover. **Gating: must be done before flip. Status: ✅ Done — verified live 2026-05-19** (`https://codap.concord.org/v2/` serves an HTML page that detects browser language, preserves query + hash, and redirects into `/v2/static/dg/{lang}/cert/index.html` on the V2 EC2 origin).
- [CODAP-1324](https://concord-consortium.atlassian.net/browse/CODAP-1324) — V3 `launchFromLara` / `lara` parameter recognition. **Gating: must be done before flip (redirected LARA URLs depend on V3 honoring the param). Status: ✅ Done — merged f58ead30e.**
- [CODAP-1319](https://concord-consortium.atlassian.net/browse/CODAP-1319) — V3 welcome banner. **Gating: SHOULD be done before flip; not strictly blocking (the banner is communication, not functionality). Status: ❓ Confirm before flip.**
- [CODAP-1326](https://concord-consortium.atlassian.net/browse/CODAP-1326) — Flip V3 release switches (log destination, save extension, V2-doc auto-save). **Gating: must be done before/at flip — these V3-app behaviors are exposed to real users immediately post-flip. Status: ❓ Confirm before flip.**
- [CODAP-1322](https://concord-consortium.atlassian.net/browse/CODAP-1322) — Umbrella release plan. **Gating: not gating; this story contributes to it. Status: ⏳ In progress (umbrella; tracks all sibling work).**

## Requirements

> **Numbering note**: Requirement IDs include letter suffixes (e.g., `R20a`, `R20b`, `R19c`) for items inserted during review. Read in numerical-then-alphabetical order. Renumbering to a clean gapless sequence was considered at Phase 5 finalization and **declined** (2026-05-22): the IDs are referenced hundreds of times across the decision log and may already be cited in CODAP-1323 / PR comments, so the stable letter-suffixed scheme is retained deliberately. (Supersedes the earlier TW1 "deferred to finalization" note, 2026-05-19.)

### Redirect mapping

V3 lives at `https://codap.concord.org/app/` (Q1, resolved 2026-05-19). The redirect function attaches to specific cache behaviors on the *new* cloned distribution (per Q6) at `/app`, `/app/*`, and `/releases/*`. It does *not* attach to the default cache behavior (which targets `codap.wpengine.com`, the marketing site). All redirect destinations below are paths under `https://codap.concord.org/app/`.

**Path-matching precision (SE-F2, fifth-pass review)**: The `{lang}` capture-group pattern (R3) and the `{name}` capture-group pattern (R4) are fixed by this spec and MUST NOT be loosened in implementation. The full multi-segment path-match patterns for R2/R3/R4/R5 — the literal `static/dg/…/cert` frame, start-anchoring, and trailing-slash/trailing-path handling — are delegated to implementation.md; R28 and R29 enumerate the concrete paths those patterns MUST accept and MUST reject, and serve as the conformance bar for whatever patterns implementation chooses.

- **R1** — Redirect exact `/app` (no trailing slash) to `https://codap.concord.org/app/` with no `?lang=` (don't force English over browser preference). This handles the bare-`/app` case that V2's Apache previously served via a server-side 301. The function MUST NOT redirect arbitrary `/app/...` deep paths; only the V2-shape paths enumerated in R2 and R3 are intercepted under `/app/*`. All other `/app/*` requests fall through to the V3 S3 origin (per R26), with the `/app` path prefix stripped per R1a so the request resolves against V3's `codap3/`-rooted S3 layout. The function does *not* intercept `/` (which continues to serve the WordPress marketing site).
- **R1a** — A request under `/app/*` that the function does **not** redirect — a V3 application asset, the V3 index at `/app/`, or one of the function's own redirect destinations (`/app/`, `/app/?lang=…`) — must still reach V3 content on the S3 origin. The V3 S3 origin (`S3-Website-models-resources-codap3`, `OriginPath: /codap3`) serves V3 rooted at `codap3/` (index `codap3/index.html`, hashed assets `codap3/version/{tag}/…`) — the same layout `codap3.concord.org` (distribution `E7WVRGISCR2VR`) serves. A `/app/...` request against that origin would otherwise resolve to the non-existent S3 key `codap3/app/...`. The function therefore strips the leading `/app` segment from the request path on every non-redirected `/app/*` request before returning the request to origin: `/app/` → `/` (→ `codap3/index.html`), `/app/version/{tag}/main.js` → `/version/{tag}/main.js`. This strip is a path rewrite, not a redirect — it produces no synthetic response and is invisible in the URL bar. It is performed by the **same** viewer-request function as the redirect (R18): CloudFront permits only one function per event type per cache behavior, so a separate strip function on `/app/*` is not possible. The strip applies only to paths beginning `/app/` — `/releases/*` requests that reach the function are returned unchanged — and only to the GET/HEAD requests the function processes (R18a; non-GET/HEAD requests are returned unmodified). The `/app` exact-match request of R1 is a redirect and is unaffected. (Discovered during Phase 2 implementation planning — IQ1; see [implementation.md](implementation.md). R21/R26 named the V3 S3 origin but did not account for the `/app`-prefix-vs-S3-key mismatch.)
- **R2** — Redirect `/app/static/dg/en/cert/...` (the historical Drive double-click path and other English V2 deep links) to `https://codap.concord.org/app/` with no `?lang=` (English was typically the default users landed on, not an explicit choice). Includes the specific `/app/static/dg/en/cert/index.html#file=googleDrive:{id}` Google Drive "Open URL" — [CODAP-1094](https://concord-consortium.atlassian.net/browse/CODAP-1094) confirmed end-to-end Drive double-click works through this redirect chain.
- **R3** — Redirect `/app/static/dg/{lang}/cert/...` for non-English `{lang}` to `https://codap.concord.org/app/?lang={lang}`. Pass the matched code through verbatim rather than maintaining a whitelist — V3's [languages.ts](../../v3/src/utilities/translation/languages.ts) handles unknown codes safely and `en` ↔ `en-US` are already aliased. The `{lang}` capture group MUST match `^[A-Za-z]{2,3}(-[A-Za-z]{2,4})?$` (BCP 47-shaped: 2–3 letter language subtag, optionally followed by a 2–4 letter region/script subtag). Paths whose `{lang}` segment does not match this pattern MUST NOT be redirected — the function falls through to origin (which on the new distribution will 404 from V3 S3, the same as today's WPEngine 404 for unknown deep paths). Case is preserved verbatim in the `?lang=` query value. **English detection**: the function treats a path `{lang}` segment as English — routed per R2, with no `?lang=` appended — iff it case-insensitively equals `en` or `en-US`; every other BCP-47-shaped `{lang}` is non-English and routed per R3. This English-detection rule applies equally to R5.
- **R4** — Redirect `/releases/{name}` in all three shapes — bare (`/releases/{name}`, no trailing slash), trailing-slash-only (`/releases/{name}/`), and with a further path (`/releases/{name}/...`) — to `https://codap.concord.org/app/`, preserving query string and hash. Includes `/releases/latest/...` (highest-traffic V2 path — 3.3M requests in CODAP-1090) and named release/build paths (e.g., `build_NNNN`, `codap_y2`, `ukde`, `dsg`, `dmartin`, `zisci`). The `{name}` segment MUST match `^[^/]+$` (one or more non-`/` characters). `/releases/` with an empty `{name}` falls through. The carve-outs in R9–R13 (`.gapikey`, `staging`, `staging/*`, `zips/*`, `var/*`, `apple-touch-icon.png`) — which would otherwise match this shape — are excluded by more-specific cache behaviors that route them away from the redirect function before it fires (Q14 = B); the function does not need to know about them.
- **R5** — Detect language under `/releases/{name}/static/dg/{lang}/cert/...` the same way as R3: append `?lang={lang}` to the `/app/` destination when present, omit when English/absent.
- **R6** — Bare `/static/dg/{lang}/cert/...` paths are not a real V2 surface on this distribution. The `/static/...` rows in the original release-plan / Jira mapping table are shorthand for `/app/static/...` (user clarification 2026-05-18) — so they are covered by R2 and R3. No new `/static/*` cache behavior is needed.
- **R6a** — Redirect `/v3` and `/v3/*` (all shapes — bare `/v3`, `/v3/`, and `/v3/...`) to `https://codap.concord.org/app/`, preserving query string and hash, with no `?lang=`. The path is collapsed (a sub-path after `/v3` is discarded, exactly as R1 collapses `/app` and R4 collapses `/releases/{name}/...`); V3 carries document state in the URL hash, not the path, so there is nothing under `/v3/...` to preserve. Rationale: after the flip, `/app/` serves current V3, so `/v3` is merely another name for it — a redirect is correct and simpler than a version-pinned `/v3` origin. The `/v3` and `/v3/*` cache behaviors therefore carry the redirect function (R26). (Added by IQ4/IF2, 2026-05-22, superseding Q13's "serve the V3 app directly" resolution. True version-pinning — freezing `/v3` at a build once `/app` advances to a future `/v4` — is a concern for that future cutover, out of scope here.)

### Paths that must NOT be redirected (fall through to origin)

These split into two categories based on the distribution's current cache-behavior topology.

**Routing-handled carve-outs** (auto-protected by cache-behavior topology; function not attached or function is on a different, less-specific behavior):
- **R7** — `/v2` and `/v2/*` (verified live 2026-05-19). `https://codap.concord.org/v2/` returns a small HTML page that detects browser language, preserves query + hash, and redirects to `/v2/static/dg/{lang}/cert/index.html` on the V2 EC2 origin — i.e., V2 entry-point with language detection. CODAP-1325's setup is complete. The new distribution must preserve this cache behavior unchanged (function not attached).
- **R8** — `/~bfinzer/*`, `/~eireland/*`, `/~jsandoe/*` (existing cache behaviors → `codap server`). Function not attached. Unmatched tilde paths fall through to the WPEngine default. Either way, no redirect. Aligns with the [CODAP-1090](https://concord-consortium.atlassian.net/browse/CODAP-1090) "zero traffic" finding.
- **R9** — `/releases/.gapikey` (Google API key file; verified currently served, 40-byte file). On the new distribution: a specific cache behavior `/releases/.gapikey` routes to `codap server` (V2 origin), ordered ahead of `/releases/*` (per R26's cache-behavior-precedence rule) so it matches first → the `/releases/*` redirect function does not fire here.
- **R10** — `/releases/staging` (staging environment alias). `staging` is a release *tree*, not a single file — verified live 2026-05-22: `/releases/staging/` returns 200 and `/releases/staging/static/dg/en/cert/index.html` returns 200, i.e. it has the same deep structure as `/releases/latest/`. The carve-out MUST therefore cover the whole subtree: **two** more-specific cache behaviors, `/releases/staging` **and** `/releases/staging/*`, both routing to `codap server` (V2 origin) with no function attached. An exact-only `/releases/staging` carve-out would leave `/releases/staging/...` deep paths matching `/releases/*`, firing the redirect function and breaking the V2 staging environment. (Same wildcard treatment as R11/R12, which carve out directory subtrees.)
- **R11** — `/releases/zips/*` (downloadable build artifacts). More-specific cache behavior `/releases/zips/*` → `codap server`.
- **R12** — `/releases/var/*` (infrastructure path). More-specific cache behavior `/releases/var/*` → `codap server`.
- **R13** — `/releases/apple-touch-icon.png` (icon file). More-specific cache behavior `/releases/apple-touch-icon.png` → `codap server`.
- **R14** — `/releases/latest/extn/plugins/TP-Sampler/*` and `/app/extn/plugins/TP-Sampler/*` — specific cache behaviors with their own existing functions routing to S3. Ordered ahead of `/releases/*` and `/app/*` respectively (per R26's cache-behavior-precedence rule), they match first, so the redirect function does not fire for these paths — TP-Sampler assets continue to serve from S3 unchanged. Cloned to the new distribution unchanged.

(Per Q14 = B, R9–R13 are now routing-handled rather than function-handled. The redirect function's internal logic no longer needs carve-out matching.)

### Preservation invariants

- **R15** — Query strings (e.g., `?url=…`, `?launchFromLara=…`, `?documentServer=…`) must be preserved verbatim on every redirect (with `?lang=` appended when applicable per R3/R5).
- **R16** — Hash fragments (e.g., `#shared=…`, `#file=googleDrive:…`) must be preserved verbatim on every redirect.
- **R17** — When both `?lang=` is being added (R3/R5) and a query string already exists, the result must be a valid URL (single `?`, `&`-separated parameters).
- **R17a** — When the path matches R3 or R5 (extracting a `{lang}`), any `lang` parameter present in the original query string MUST be removed before the destination URL is constructed; the path-detected `{lang}` is authoritative. The resulting query string is the ordered list — `lang=<path-detected>` first, then each remaining non-`lang` parameter from the original query — **joined** with `&`. When the original query contained no non-`lang` parameters, the list has one element and the result is exactly `lang=<path-detected>`, with no trailing `&`. This mirrors V2's server-level behavior, where the path determines which language file is served regardless of any `?lang=` query value. When the path does not match R3/R5 (i.e., R1, R2, R4 with no language segment), the original query string is preserved verbatim with no `lang` injection. Reconstruction MUST treat the original query as an **ordered list of `name=value` pairs**: every pair whose name is `lang` is removed, and all other pairs — including any duplicate or repeated parameter names (e.g. `foo=1&foo=2`) — are preserved in their original order and multiplicity. A `URLSearchParams`-based implementation provides this for free; a name-keyed map/object MUST NOT be used for the rebuild, as it would collapse duplicate keys and silently drop user data. **Clarification (XR2, 2026-05-22)**: `URLSearchParams` may be used to *parse / iterate* the original query — its ordered, duplicate-preserving behavior is the property described above — but `URLSearchParams.prototype.toString()` MUST NOT be used to *rebuild* the destination query string: it percent-re-encodes parameter values (e.g. `documentServer=https://example.com` → `documentServer=https%3A%2F%2Fexample.com`), which would violate R15's verbatim-preservation rule and R28's literal expected outputs. A raw-string filter over the original query (split on `&`, drop `lang` pairs, keep the rest verbatim and in order) satisfies both the ordered-pair rule above and R15.

### Mechanism

- **R18** — The redirect must be implemented as a CloudFront Function attached at the **viewer-request** stage on the new (cloned) distribution — the distribution that becomes `codap.concord.org` at flip day (R22, R24a, R26). It MUST NOT be attached to the existing production distribution `E3H9X49AG3GYSO` at any point during the pre-flip period (R22). It must return a synthetic response containing inline HTML+JS, not an HTTP 301/302.
- **R18a** — The function MUST only intercept `GET` and `HEAD` requests. For any other HTTP method, the function falls through to origin without producing a synthetic response. (V2 paths under `/app/*` and `/releases/*` are GET-only in practice; falling through lets the origin produce its natural error for non-GET probes from scanners or misbehaving clients.)
- **R18b** — The function's top-level handler MUST be exception-safe: the entire match-and-construct logic wrapped in a top-level try/catch (or equivalent) so any uncaught internal error falls through to origin (returns the original `request`) rather than producing a CloudFront-default 5xx to the user. Because a caught-and-handled error returns a valid `request`, CloudFront counts that execution as successful — it does **not** register on the `FunctionExecutionErrors` metric (R26b). The catch block MUST therefore emit one `console.log` / `console.error` line per caught exception **unconditionally** — independent of the `LOG_ENABLED` constant (R23) — so every caught exception leaves a CloudWatch Logs trace in production (R30 specifies the line; R26b alarms on it). Users observe a request that proceeds to origin rather than a hard failure. This is defense-in-depth against future code-change regressions and against adversarial inputs that probe for unexpected edge cases in URI parsing.
- **R19** — The HTML response must run client-side JS that reads `window.location.search` and `window.location.hash`, constructs the V3 URL, and calls `window.location.replace(v3Url)`.
- **R19a** — The synthetic page's body content (any text shown to the user during the brief moment before redirect) MUST be static — built from constants compiled into the function source, not from any value read from `window.location.*` or otherwise derived from the request. Request-derived values may only be passed to `window.location.replace()` (or equivalent navigation APIs); they MUST NOT be written into the DOM via `innerHTML`, `document.write`, `outerHTML`, attribute setters on user-visible elements, or any equivalent. This eliminates reflected-XSS routes through hash/search at the page level.
- **R19b** — The synthetic page MUST include a static `<noscript>` block containing a plain anchor to `https://codap.concord.org/app/` so users with JavaScript disabled, blocked by an extension, or failing to execute still have a working path to V3. The `<noscript>` fallback is non-preserving (hash and query are not retained, since preservation requires JS); this is an accepted tradeoff for the <<1% of users in JS-disabled / JS-blocked environments. The page body MUST also include a brief user-visible message (specified in R19c) so the page is not blank during the millisecond before navigation. Sandboxed iframe embeds that omit `allow-scripts` are an additional non-preserving case (the inline JS cannot execute, so the `<noscript>` fallback applies). Affected paths are limited to integrators that both (a) embed CODAP via iframe with a restrictive `sandbox` attribute and (b) rely on hash or non-`lang` query parameters being preserved across the redirect. The post-flip LARA / AP library update (in the Out of Scope follow-up list) eliminates this case by migrating embedded URLs to V3 form directly.
- **R19c** — User-visible content on the synthetic page:
  - `<title>`: `CODAP`
  - Body: a centered plain-text message reading `Loading CODAP…` (UTF-8 ellipsis character or `...`). The element carrying this message MUST include `role="status"` so assistive technology may announce it (WCAG-I1, 2026-05-22).
  - Inside the `<noscript>` block from R19b: `<a href="https://codap.concord.org/app/">Open CODAP</a>` plus a short explanatory sentence (e.g., `"This page needs JavaScript to send you to CODAP automatically. Use the link above to continue. (Your link's saved settings may not carry over.)"`). The sentence is worded so that, for the `<noscript>` cohort, it reads as an explanation of why the `Loading CODAP…` body message above it did not complete — not as a contradiction of it (CS-F3, sixth-pass review).
  - No styling beyond what fits in the 10 KB synthetic-response budget (R20). A trivial centered-text layout (e.g., `body { font-family: sans-serif; text-align: center; padding: 2em; }`) is sufficient.
  - The synthetic page's root `<html>` element MUST include `lang="en"` to satisfy WCAG 2.1 SC 3.1.1 (Language of Page). This matches the English-only content decision from the Localization paragraph below; if a future iteration of the redirect page is localized, the `lang` attribute is updated accordingly.

  **Localization (decided EDU1, 2026-05-19)**: All synthetic-page text is English-only. Localizing would expand the function source toward the R20b 10 KB budget and complicate the static-content-only constraint from R19a (the language selection itself would become a request-influenced choice, even if path-derived). Accepted because (a) the page is visible for ~50–500ms when JS works (~99%+ of users), (b) the CODAP brand name is recognizable language-independently, and (c) the `<noscript>` fallback path is rare (<<1% of users). Revisit if user reports indicate the brief English flash is confusing in classroom contexts.
- **R20** — The function's synthetic response body MUST fit within CloudFront's 10 KB synthetic-response size limit.
- **R20b** — The function's source code MUST fit within CloudFront's 10 KB function package size limit, measured as the exact byte count of the function code artifact submitted to the CloudFront `create-function` / `update-function` API — i.e. whatever bytes are actually deployed, whether or not a minification step produced them (minification is an optional size-reduction tactic, not a required step). The `LOG_ENABLED` branch counts toward the budget even when disabled (CloudFront measures source, not reachable code).
- **R20c** — The build/deploy process MUST verify both R20 and R20b budgets before submitting to CloudFront. Both checks gate G4. Failure of either is a build failure, not a runtime failure.
- **R20a** — The function's synthetic response MUST use HTTP status code `200 OK` (not 301/302; the inline HTML+JS is the redirect mechanism, not an HTTP redirect) and MUST include the following headers:
  - `Content-Type: text/html; charset=utf-8`
  - `Cache-Control: no-store` (prevents browsers/intermediaries from caching a stale redirect page that would mis-route a later request)
  - `Content-Security-Policy: default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'`. `script-src 'unsafe-inline'` is required because the inline `<script>` carries the request-derived path `{lang}` (R21a), so its byte content — and therefore any SHA-256 hash — varies per request; a build-time `script-src 'sha256-<hash>'` cannot be used (see SEC-F1, fifth-pass review). `style-src 'unsafe-inline'` is required to permit the trivial inline styling from R19c; the page's CSS is genuinely static, so `style-src 'sha256-<hash>'` MAY be substituted if the build pipeline computes that hash. No broader `script-src` or `style-src` directive is acceptable, and no other directives may be relaxed from `default-src 'none'`. (Defense-in-depth alongside R21a / R19a; the realistic reflected-XSS routes are already closed by `default-src 'none'`, R19a's static-body rule, and R21a's escaping.)
  - `X-Content-Type-Options: nosniff`

  Other security headers (`Referrer-Policy`, `Strict-Transport-Security`, `X-Frame-Options` / CSP `frame-ancestors`, etc.) are not required at the function level: HSTS is expected to be applied by CloudFront's response-headers policy for the domain; the redirect is same-origin so `Referrer-Policy` adds little; and the synthetic page is purely navigational with no interactive controls, so clickjacking risk is negligible (decision Sec5, 2026-05-19).

  **HSTS contingency (CR8)**: R20a's reliance on CloudFront for HSTS holds only if the response-headers policy actually applies to the function's synthetic response. R26a's verification confirms this with a `curl -I` check against a function-triggering URL on the clone. If that check finds `Strict-Transport-Security` — or any other security header `codap.concord.org` serves today — is **not** present on the synthetic response, the function MUST set the missing header(s) itself in the synthetic response, adding `Strict-Transport-Security` to the header list above. This contingency overrides the Sec5 "not required at the function level" decision for the affected header(s), and only in that case.
- **R21** — The V3 destination base URL is `https://codap.concord.org/app` (Q1 resolved 2026-05-19). Exposed as a top-of-file constant in the function (e.g., `V3_BASE_URL = "https://codap.concord.org/app"`). The function constructs the destination as `${V3_BASE_URL}/${queryString}${original_hash}` in the client-side JS, where `queryString` follows the rules in R17a (path-detected `lang` wins; remaining non-`lang` query params preserved) and the path component always ends with `/` per Q8. In this template, `queryString` is either the empty string `""` or a string beginning with a literal `?` (e.g. `?lang=fr&foo=bar`) — the leading `?` is part of `queryString`, not the template; the R17a rules describe only the parameter *content*. `original_hash` is likewise `""` or a `#`-prefixed string, as `window.location.hash` returns it. A redirect with neither a query nor a hash therefore yields exactly `https://codap.concord.org/app/`. The `/app/*` cache behavior on the new distribution must target the V3 S3 origin (currently `S3-Website-models-resources-codap3` on E3H9X49AG3GYSO; same origin DomainName `models-resources.s3-website-us-east-1.amazonaws.com` with `OriginPath: /codap3`) so that post-redirect requests serve V3 content. Pointing the behavior at that origin is necessary but not sufficient: the origin serves V3 rooted at `codap3/`, so a `/app/...` request would resolve to the non-existent key `codap3/app/...`. The function strips the `/app` prefix on every non-redirected `/app/*` request (R1a) so the request resolves correctly.
- **R21a** — Any value extracted from the request URI by the function and embedded into the synthetic HTML/JS response body MUST be HTML-escaped and JS-string-escaped at the construction site. In practice the only such value is the path-extracted `{lang}` from R3/R5 (constrained to BCP-47 shape by R3); explicit escaping is belt-and-suspenders defense rather than primary defense. The synthetic page's client-side JS reads `window.location.search` and `window.location.hash` directly per R19 — those values are never embedded into the response by the function, so this rule does not extend to them. To reconcile with R19a's static-body rule: `{lang}` is embedded **only** as a JavaScript string literal inside the inline `<script>`, where R19's client-side JS reads it to construct the destination. It is never written into user-visible DOM content — body text, element content, or attributes. R19a's static-body rule governs that user-visible DOM content; the inline `<script>` is not user-visible content, and is the sole carrier of the request-derived `{lang}`, with R21a's escaping applied at its construction site.

### Gating, activation, and infrastructure

(Rewritten 2026-05-19 for the clone + DNS swap approach; supersedes the earlier `ENABLED`/`TEST_PREFIX` model from Q2/Q6 previous resolutions.)

- **R22** — Gating is **DNS-based**, not function-based. The new distribution exists at a temp subdomain throughout the pre-flip period; `codap.concord.org` keeps pointing at `E3H9X49AG3GYSO`. No in-function `ENABLED` constant is required. No modifications to `E3H9X49AG3GYSO` happen during the pre-flip period; the only change made to it by this story is the flip-day CNAME alias move in R24a (reversed on rollback).
- **R23** — A top-of-file `LOG_ENABLED` boolean constant in the function. When `true`, the function emits one `console.log` line per match (content per R30). When `false` (default in committed source), no per-match logging; the sole exception is the R18b exception-path log line (R30), which is emitted unconditionally regardless of `LOG_ENABLED`. Useful during pre-flip validation on the temp subdomain and during the post-flip soak.
- **R24** — Flip-day activation has **two ordered steps**: **(step 1)** the CloudFront CNAME alias move per R24a; then — once step 1 has reached `Deployed` (R24a) — **(step 2)** one `aws route53 change-resource-record-sets` call against hosted zone `Z2P4W3M7MDAUV6`, updating the `codap.concord.org` ALIAS A record target from `d13zmjbnp90bac.cloudfront.net.` (E3H9X49AG3GYSO) to the new distribution's domain. The Route 53 step propagates in ~60s (ALIAS records have AWS-managed TTL = 60s; verified `dig` 2026-05-19); see R25 for the resolver-cache tail.
- **R24a** — A CloudFront distribution serves an HTTPS request only when the request `Host` is one of the distribution's alternate domain names (CNAMEs); a request for a domain not on the distribution returns `403 Bad request` regardless of DNS. The clone is created *without* `codap.concord.org` in its `Aliases` (it carries only the temp subdomain — clone step 2), and a CNAME can be associated with only one distribution at a time. Flip-day **step 1** therefore moves the `codap.concord.org` CNAME onto the new distribution with `aws cloudfront associate-alias --target-distribution-id <new-id> --alias codap.concord.org`, which removes it from `E3H9X49AG3GYSO` and adds it to the new distribution in one operation. This alias move is the *only* change this story makes to `E3H9X49AG3GYSO`. Step 1 MUST precede the Route 53 swap (R24 step 2): doing it first bounds the unavoidable inconsistency window to Route 53 propagation (~60s + resolver tail, R25), whereas swapping DNS first would expose a longer window bounded by CloudFront config propagation. `associate-alias` is itself a distribution-config change that propagates — both distributions transition to `InProgress` and must redeploy before the change is live at all edge locations. Step 2 (Route 53) MUST NOT be issued until the `associate-alias` change has reached `Deployed` status on the new distribution: the new distribution must be confirmed able to serve `codap.concord.org` before DNS is pointed at it. This wait is what actually bounds the inconsistency window to DNS propagation — issuing step 2 while step 1 is still `InProgress` would instead expose the longer CloudFront-config-propagation window, because the new distribution would `403` every `codap.concord.org` request until its redeploy completes. Between step 1 reaching `Deployed` and step 2 propagating, `codap.concord.org` still resolves to `E3H9X49AG3GYSO` — which has just lost the alias — so a brief `403` tail is expected and accepted; the R31 runbook documents this window, and the flip is scheduled in a low-traffic window (per CODAP-1322) to minimize impact. Rollback reverses both steps in the same order (alias move back to `E3H9X49AG3GYSO`, then Route 53), with the same wait for `Deployed` before the DNS step (R25).
- **R25** — Rollback: reverse both flip-day steps in order — **(step 1)** `aws cloudfront associate-alias` moving the `codap.concord.org` CNAME back onto `E3H9X49AG3GYSO`, then **(step 2)** the Route 53 call in reverse. As in the forward flip (R24a), step 2 MUST NOT be issued until the reverse `associate-alias` has reached `Deployed` status on `E3H9X49AG3GYSO`, so the distribution can serve `codap.concord.org` before DNS resolves back to it. Same ~60s propagation thereafter. No cache invalidation required. Apart from the R24a alias move (and its reversal here), `E3H9X49AG3GYSO` is preserved untouched throughout this story and during the post-flip soak (see R25a), so rollback restores the exact pre-flip behavior. **Propagation caveat**: ~60s is the propagation *floor* (the AWS-managed authoritative TTL), not the ceiling. Real-world resolver caches (ISP DNS, corporate resolvers, mobile carriers, aggressive forwarders) frequently hold past TTL; most clients pick up within 1–5 minutes, but a long tail can extend to 1+ hour for misbehaving resolvers. Rollback "complete" status MUST be declared on the basis of distribution-level error-rate metrics returning to baseline (per R26b), not on elapsed time alone.
- **R25a** — Soak duration and exit criteria:
  - Soak window is **at least 14 calendar days** post-flip (longer than the initial "~1 week" target to absorb edge cases such as customers returning from vacation or scheduled classroom usage on a 2-week cycle).
  - **Exit conditions** (all must be met to declare soak passed):
    - No rollback-trigger event (RB1–RB6) observed during the soak window.
    - No new redirect-related support tickets in the final 7 days of the window.
    - Joint written sign-off by the engineering lead and **at least one other of**: the R25c secondary rollback authority, or the release coordinator (CODAP-1322). (The engineering lead is the R25c *primary* rollback authority, so the second signer MUST be a distinct individual — soak sign-off requires two people, not one.)
  - **Old-distribution disposition**: After soak passes, `E3H9X49AG3GYSO` is **archived, not deleted**, for an additional 90 days. Specifically: detach `codap.concord.org` from `Aliases`, set distribution to `Disabled`, but do not delete. After 90 days with no rollback events, the distribution can be deleted; until then it remains a one-click re-enable away from rollback.
- **R25b** — This story is considered complete (Jira: Done) when R25a's soak exit conditions are met and the engineering lead + rollback decision authority (R25c) have signed off. Until then, the story remains in "In Project Team Review" or "In Code Review" per CLAUDE.md's workflow.
- **R25c** — The rollback decision authority is the **CODAP V3 engineering lead** as primary, with a named **secondary on-call** confirmed before flip day (per G9). The specific individuals filling these roles for flip day are captured in the implementation spec or flip-day runbook, not in this requirements spec. The decision to roll back per RB1–RB6 can be made unilaterally by either the primary or the secondary; consensus is not required.
- **R26** — Cache-behavior changes on the new (cloned) distribution, applied before the Route 53 swap:
  - **`/app/*`**: change target origin from `codap server` to `S3-Website-models-resources-codap3` (the V3 S3 origin). Attach the redirect function at viewer-request to handle V2-shape deep paths (`/app/static/dg/{lang}/cert/...`) per R2/R3 — those redirect to `/app/?lang=...`. Other `/app/*` requests have their `/app` prefix stripped by the function (R1a) and then pass through to V3 S3.
  - **`/app`** (exact-match): change target origin to V3 S3 (same as above) so `/app` (no trailing slash) lands in V3. Attach function (per R1).
  - **`/releases/*`**: change target origin from `codap server` to V3 S3 (Q14 = B). Attach function to redirect launchable subpaths (`/releases/{name}/...`, `/releases/{name}/static/dg/{lang}/cert/...`) to `/app/?lang=...` (R4, R5). The function never falls through for matched paths (returns synthetic response); origin choice for unmatched non-carve-out `/releases/*` requests defaults to V3 S3.
  - **New carve-out cache behaviors** (Q14 = B, R9–R13), each routing to `codap server` (V2), no function attached:
    - `/releases/.gapikey`
    - `/releases/staging` **and** `/releases/staging/*` (the staging release tree — both behaviors required per R10)
    - `/releases/zips/*`
    - `/releases/var/*`
    - `/releases/apple-touch-icon.png`
  - **`/v3`**, **`/v3/*`** (new; Q13 = A as superseded by IQ4/IF2): added cache behaviors with the **redirect function attached**; the function redirects every `/v3*` request to `https://codap.concord.org/app/` (R6a). Target origin is `S3-Website-models-resources-codap3` for consistency but is never reached (the function always returns a synthetic response for `/v3*`). No version-pinned origin or path.
  - **`/v2`, `/v2/*`**: unchanged (R7, verified live).
  - **TP-Sampler more-specific behaviors** (`/releases/latest/extn/plugins/TP-Sampler/*` and `/app/extn/plugins/TP-Sampler/*`): unchanged (R14).
  - **Default**, **`/codap-resources/*`**, **`/~user/*`**, **`/sage*`**, **all other behaviors**: unchanged.
  - None of these changes happen on `E3H9X49AG3GYSO`.

  **Cache-behavior precedence (GR1)**: CloudFront does **not** auto-select the most-specific path pattern — it evaluates cache behaviors in their configured **list order (precedence)** and uses the **first** behavior whose path pattern matches; the default behavior applies only if none match. Therefore the carve-out behaviors (R9–R13) and the TP-Sampler behaviors (R14) — each of which overlaps a general wildcard behavior — MUST be ordered at **higher precedence** (earlier in the list) than the general behavior they overlap: the `/releases/...` carve-outs and the `/releases/latest/...` TP-Sampler behavior ahead of `/releases/*`, and the `/app/extn/plugins/TP-Sampler/*` behavior ahead of `/app/*`. (The `/v3` and `/v3/*` behaviors match a disjoint path prefix — they overlap none of the general behaviors — so their list position carries no precedence constraint.) If a carve-out (e.g. `/releases/staging/*`) were ordered *after* `/releases/*`, the general behavior would match first, fire the redirect function, and break the carved-out path. R26a's verification confirms this ordering.
- **R26a** — The distribution clone procedure MUST be encoded in a checked-in script (under `devops/cloudfront-functions/v2-v3-redirect/` per Q4) rather than performed via ad-hoc shell commands. The script is the authoritative description of how the clone is created and can be re-run if the first attempt needs to be discarded. After creation, the script (or a companion verification step) MUST produce a structured diff between the source and cloned distribution configs and verify the differences are exactly the expected set: `CallerReference`, `Aliases`, the origin-swap for `/app/*`, `/app`, `/releases/*`, the function attachments, the new carve-out cache behaviors per R26, and the cache-behavior precedence ordering (the carve-out and TP-Sampler behaviors ordered ahead of the general `/app` / `/app/*` / `/releases/*` behaviors, per R26's cache-behavior-precedence rule). Any other difference is a clone defect and blocks the flip (consistent with G1's spirit — the clone must mirror prod except for V3 changes).

  The verification step MUST additionally confirm that `Strict-Transport-Security` — and any other security response headers `codap.concord.org` serves today — are applied via a CloudFront **response-headers policy**, **not** emitted by the V2/WPEngine origin. The response-headers policy MUST be attached to every behavior the redirect function is attached to (`/app`, `/app/*`, `/releases/*`), so that it has the opportunity to cover the function's synthetic response as well as origin responses. A config-only structural diff will not catch any of this — it requires an actual response-header check (e.g. `curl -I`) on the clone, run against **both** (a) a URL served from origin on an origin-swapped behavior (`/app/*`, `/releases/*`) and (b) a URL that triggers the redirect function's **synthetic response** — confirming HSTS and the other security headers are present on each. If HSTS (or any other security header) is origin-emitted today, adding a CloudFront response-headers policy to preserve it across the origin swap is in scope for this story. If the synthetic-response check in (b) shows the response-headers policy does **not** apply to function-generated synthetic responses, R20a's HSTS contingency applies — the function sets the missing header(s) itself. (Per SEC-F2, fifth-pass review: R20a's "HSTS is already set by CloudFront" assumption holds only if HSTS is policy-based *and* that policy reaches the synthetic response; CR8, sixth-pass external review, added the synthetic-response check and the R20a contingency.)
- **R26c** — Before the Route 53 swap, an audit MUST be performed of all records in the `concord.org` zone affecting or named under `codap.concord.org`:
  - Every record under `*.codap.concord.org` is documented with: name, type, current target, and one of three classifications:
    - **Irrelevant** — record is unrelated to the flip and stays unchanged (most TXT/verification records likely).
    - **Relevant — handled by this story** — the `codap.concord.org` ALIAS A record itself, which is what the flip changes.
    - **Relevant — unhandled, action required** — anything else that interacts with the flip; if any are found, file a follow-up before flip.
  - CAA records at the `concord.org` zone apex are checked for compatibility with the ACM cert (the existing wildcard cert is already issued, but a CAA constraint that blocks future renewals is a known footgun and worth catching now).
  - DNSSEC is confirmed disabled on the zone (Concord's standard, but verify).

  The audit output is captured in the implementation spec or a referenced doc; it does not need to live in this requirements file.
- **R26b** — CloudWatch alarms and a synthetic monitor MUST be deployed and verified before the Route 53 swap (gates G5):
  - `FunctionExecutionErrors` > 0 on the redirect function, sustained 1 minute → **high-severity**.
  - A CloudWatch Logs **metric filter** on the redirect function's log group matching the R30 `"error-fallthrough"` tag, > 0 sustained 1 minute → **high-severity**. This is the caught-exception counterpart to `FunctionExecutionErrors`: per R18b/R30, an exception caught by the function's top-level try/catch returns a valid `request` and so never registers on `FunctionExecutionErrors`; the unconditionally-emitted `"error-fallthrough"` log line is the only signal for that failure class.
  - `FunctionThrottles` > 0 on the redirect function → **high-severity**.
  - Distribution `5xxErrorRate` > 1% sustained 2 minutes on the new distribution → **high-severity** (matches RB1's threshold).
  - Distribution `4xxErrorRate` > 5% sustained 5 minutes on the new distribution → **informational** (not action-forcing on its own; 4xx is more legitimate-noise-prone).
  - Two synthetic HTTPS monitors (CloudWatch Synthetics, or external equivalent), each running every 1 minute. Failure of either → **high-severity**. The probe URLs below are written against `codap.concord.org` (the post-flip steady state); **pre-flip both monitors target the temp subdomain instead** (consistent with R27's validation environment, since pre-flip `codap.concord.org` still resolves to the old V2 distribution and the redirect-correctness probe could not be green there). Re-pointing both probe URLs from the temp subdomain to `codap.concord.org` is a step in the flip-day procedure (R31 runbook).
    - **V3 reachability probe**: `https://codap.concord.org/app/` — asserts the response contains a V3-shaped marker string (specific marker TBD in implementation; e.g., a known V3 element ID).
    - **Redirect-correctness probe**: `https://codap.concord.org/app/static/dg/en/cert/index.html` — asserts the response body is the synthetic redirect HTML (e.g., contains the literal `https://codap.concord.org/app/` in the inline JS, or a stable HTML marker compiled into the response body such as an HTML comment `<!-- codap-redirect -->`). Specific marker TBD in implementation; it MUST be a body-level marker, since the synthetic monitor inspects the response body, not CloudWatch logs. This is the only continuous check that catches silent logic regressions where the function returns a wrong-but-200-OK destination — the V3-reachability probe alone cannot detect that mode.

  Alarm monitoring approach (decided IR2, 2026-05-19): no automated routing to Slack/PagerDuty/email distribution lists. The **high-severity** / **informational** tags on the R26b bullets above are severity classifications for the manual watcher, not automated-routing instructions — a high-severity alarm or synthetic-monitor failure demands immediate assessment against the rollback triggers (RB1–RB6), while an informational alarm is noted but not action-forcing on its own. The primary monitoring mode is manual — the on-call human watches alarm state during the flip and the active-watch window (per IR4) via `aws cloudwatch describe-alarms` and the CloudWatch console. This is acceptable because (a) the active-watch window is short and bounded, (b) the rollback decision authority (R25c) is dedicated to this watch with no other obligations during the window, and (c) synthetic-monitor failures are themselves surfaced in the CloudWatch console. All seven checks above (five CloudWatch alarms + two synthetic monitors) MUST have been verified to fire on a synthetic error before the flip; an alarm or monitor that has never fired is not a working alarm. G5's "verified to fire on a synthetic error" is this one-time induced-error check — confirming the operator knows what a firing alarm/monitor looks like — and is distinct from steady-state green probing (which, for the synthetic monitors, runs against the temp subdomain until the flip re-points them).
- **R31** — A flip-day runbook MUST exist as a checked-in artifact at `devops/cloudfront-functions/v2-v3-redirect/RUNBOOK.md` (or equivalent path; specific location decided in implementation) before any G1–G9 sign-off begins. The runbook contains:
  - The pre-flip G1–G9 checklist with sign-off slots (name, date, evidence link per criterion).
  - The exact flip (forward) and rollback (reverse) invocations — the `aws cloudfront associate-alias` alias move (R24a), an explicit wait for that change to reach `Deployed` status (e.g., `aws cloudfront wait distribution-deployed --id <id>`), and then the `aws route53 change-resource-record-sets` call — including the hosted zone ID, record name, ALIAS target values, target health flag, the source/target distribution IDs, and the mandated step ordering (R24a): the `Deployed`-before-DNS wait between the two steps, and the expected brief `403` window.
  - URLs for the CloudWatch alarms and synthetic monitor from R26b, plus the dashboard view used during the post-flip soak.
  - Contact info (name + phone/Slack/email) for the primary and secondary rollback decision authorities per R25c.
  - A pointer to existing CC operational / on-call docs covering detection and rollback response timing (see IR3 in the second-pass Self-Review below for the rationale on not redefining SLOs here).
  - The post-flip first-hour active-watch protocol (per IR4 in the second-pass Self-Review below).
  - The support tier-1 diagnosis path (per CS2 in the second-pass Self-Review below).
  - The `LOG_ENABLED` enable/revert protocol (per Fin2 in the second-pass Self-Review below).

  The runbook is the source of truth for flip-day operations; this requirements spec describes *what* must be true, the runbook describes *who does what and when*.
- **R31b** — Post-flip active-watch window: the primary rollback authority (or a delegated engineer per R25c) MUST actively watch the CloudWatch alarms (R26b), the synthetic monitor, and the CloudFront error-rate dashboard for at least the first **60 minutes** after the Route 53 ALIAS swap (R24) completes. "Actively watch" means dedicated attention with no other obligations during the window: checking alarm state at least every 5 minutes via `aws cloudwatch describe-alarms` or the CloudWatch console. After the 60-minute active window, watch relaxes to periodic checks for the remainder of the soak (R25a); cadence defined in the R31 runbook.

### Testing and verification

- **R27** — Pre-flip validation runs against the new cloned distribution at its temp subdomain, **`codap2to3.concord.org`** (the name is fixed by this spec; this is the canonical reference for "the temp subdomain" used throughout). Same path matrix is exercised; no path-prefix gymnastics. The `*.concord.org` ACM cert covers `codap2to3.concord.org` so no cert work is needed.

  **Drive double-click validation** branches based on whether the temp subdomain is authorized in the Google Drive app's authorized-origins list (Ops4 recommends doing so pre-flip):

  - **Path A — Temp subdomain authorized**: Drive double-click is validated end-to-end against the temp subdomain. This is the preferred path. The temp subdomain is removed from the Drive app's authorized-origins list during post-flip cleanup.
  - **Path B — Temp subdomain NOT authorized**: Drive validation is deferred to the post-flip soak on real `codap.concord.org`. In this case:
    - The Drive contingency is formally invoked (acknowledged in writing by the rollback decision authority per R25c before the flip).
    - A Drive double-click test is the **first** post-flip check; the test URL is prepared in advance.
    - If Drive fails post-flip and the failure is in the redirect chain (not V3 itself), rollback per RB4 is triggered. If the failure is in V3's handling of the post-redirect URL, fix-forward.

  CODAP-1094 has already confirmed the redirect-chain mechanism works end-to-end, so Path B's residual risk is limited to production-Drive-app-specific configuration issues.
- **R28** — Positive test matrix (must reach V3 with correct language and preserved hash+query):
  - `/app` (no trailing slash) → `/app/`
  - `/app/static/dg/en/cert/index.html` → `/app/` (no `?lang=`)
  - `/app/static/dg/{lang}/cert/index.html` → `/app/?lang={lang}` for each V2-historical non-English code: `de`, `el`, `es`, `he`, `ja`, `nb`, `nn`, `pt-BR`, `th`, `tr`, `zh-Hans`, `zh-TW`
  - `/app/static/dg/fa/cert/index.html` (a V3-shipped code that V2 didn't ship — verifies V3 fallback path for codes never built by V2)
  - `/app/static/dg/xx/cert/index.html` (BCP-47-shaped but not a real code — verifies R3 "pass through verbatim")
  - `/releases/latest/` → `/app/`
  - `/releases/latest/static/dg/{lang}/cert/index.html` for at least 3 sample codes including `en` (no `?lang=`), `fr` (V3-only), `zh-Hans` (V2 with region subtag)
  - Google Drive double-click URL: `/app/static/dg/en/cert/index.html#file=googleDrive:abcd1234` → `/app/` with hash preserved verbatim
  - URL with both query string and hash: `/app/static/dg/fr/cert/index.html?launchFromLara=true&documentServer=https://example.com#shared=xyz` → `/app/?lang=fr&launchFromLara=true&documentServer=https://example.com#shared=xyz`
  - URL with `?lang=` collision per R17a: `/app/static/dg/fr/cert/index.html?lang=es&foo=bar` → `/app/?lang=fr&foo=bar` (path lang wins, query lang stripped)
  - URL with `lang` as the *only* query parameter per R17a/GR2: `/app/static/dg/fr/cert/index.html?lang=es` → `/app/?lang=fr` (query `lang` stripped, empty remainder — destination MUST have no trailing `&`)
  - `/releases/build_NNNN/` and `/releases/codap_y2/` → `/app/` (representative non-`latest` named builds)
  - `/v3`, `/v3/`, and `/v3/anything` → `/app/` (R6a — `/v3` is an alias of current V3; path collapsed, query+hash preserved)
  - Iframe-embed test: a minimal test-harness page hosts `<iframe src="/app/static/dg/en/cert/index.html?launchFromLara=true#shared=xyz">`. The iframe MUST end up at `/app/?launchFromLara=true#shared=xyz` (no `?lang=` for English), confirming the client-side redirect works in an iframe context. Repeat once with a non-English `{lang}` (e.g., `fr`) to verify the `?lang=` injection works in the embedded flow. (Verifying that V3's iframe-phone channel re-handshakes with the embedder after the redirect is out of scope — a property of V3 and the LARA/AP integration, not the redirect function; see the LARA/AP follow-up in Out of Scope. Narrowed by QA-I3, 2026-05-22, superseding PLUG3.)
- **R29** — Negative test matrix (must NOT redirect / must fall through to origin):
  - `/` continues to serve the marketing site (WPEngine).
  - `/releases/.gapikey`, `/releases/staging`, `/releases/staging/static/dg/en/cert/index.html` (deep path under the staging release tree — must serve V2, NOT be redirected by the function, per R10), `/releases/zips/...`, `/releases/var/...`, `/releases/apple-touch-icon.png` continue to serve V2 origin (routing-handled carve-outs per R9–R13).
  - `/v2/...` continues to serve V2 origin (R7).
  - `/~bfinzer/...` (and any other `/~*`) continue to serve V2 origin or fall through (R8).
  - `/releases/latest/extn/plugins/TP-Sampler/*` and `/app/extn/plugins/TP-Sampler/*` continue to serve S3 (R14).
  - `/app/static/dg/<script>alert(1)<\/script>/cert/...` (malformed `{lang}`, fails BCP-47 regex per R3 — function must fall through to V3 S3 404, NOT redirect).
  - `/app/static/dg/abc123/cert/...` (digits in `{lang}`, fails BCP-47 regex — must fall through).
  - `/app/static/dg//cert/...` (empty `{lang}` segment — must fall through).
  - `/app/static/js/bundle.js` and similar V3-asset-shape paths under `/app/*` (must pass through to V3 S3 per R1, NOT be intercepted by the function).
  - `/app/favicon.ico` and `/app/manifest.json` (root-level V3 assets directly under `/app/` — single-segment paths that must pass through to V3 S3, NOT be intercepted by the function, and NOT be captured by R1's exact-match `/app` rule).
  - **Redirect-destination paths (redirect-loop safety)** — the function MUST NOT redirect any path it can itself emit. Each path below matches the `/app/*` cache behavior and so re-invokes the function on the post-redirect request; each MUST fall through to V3 S3 with no synthetic redirect. A regression here produces an infinite client-side redirect loop — the function's highest-severity failure mode:
    - `/app/` (bare redirect destination).
    - `/app/?lang=fr` (lang-query destination shape).
    - `/app/?lang=fr&foo=bar` (full destination shape — path-detected `lang` plus a preserved query parameter).
  - `/releases/` (empty `{name}`, fails R4's `^[^/]+$` shape rule — must fall through, not redirect).
- **R30** — When `LOG_ENABLED = true`, each function match emits one `console.log` line containing: the source request path (`request.uri`) and query string (reconstructed from `request.querystring` — CloudFront Functions expose the query separately from `request.uri`, which carries the path only), the action taken — for a redirect, the destination as the function determines it server-side (`V3_BASE_URL` plus the R17a-processed query string: path-detected `lang` applied, any incoming query `lang` removed); for a fall-through/no-match, the outcome — and a short tag identifying which match rule fired (e.g., `"app-en"`, `"releases-lang"`). The logged destination does not include the hash, which is appended client-side per R19 and is never seen by the function. Independently of `LOG_ENABLED`, the R18b exception path emits one `console.log` line per caught exception — always, even when `LOG_ENABLED = false` — containing the same source path + query and the fixed tag `"error-fallthrough"`, so caught exceptions remain observable in production. This is the only function-emitted log line not gated by `LOG_ENABLED`.
- **R30a** — Function execution-time budget validation MUST be performed using the CloudFront `test-function` API (`aws cloudfront test-function`) against a representative sample of URIs from R28 (positive matrix) and R29 (negative matrix, where the function returns without action). The `test-function` `TestResult` reports `ComputeUtilization` — the compute time the function consumed expressed as a percentage of CloudFront's maximum allowed per-invocation budget (100% = the hard limit) — so `ComputeUtilization` is the operative, measured quantity; the millisecond figures below are its interpretation against CloudFront's documented ~1ms budget. Targets:
  - Median `ComputeUtilization` < 50% across the sample (≈ < 0.5ms).
  - p99 `ComputeUtilization` < 100% across the sample (≈ < 1.0ms).
  - No URI in the sample reports `ComputeUtilization` at or near 100% — i.e., none approaches CloudFront's hard compute limit.

  Failure to meet these targets blocks the flip (gates G3). If the function approaches budget, optimization options include precomputing the synthetic response body at deploy time (compiled into the function source) rather than constructing it per-request.

### Flip-day go/no-go criteria

All of the following MUST be true before the Route 53 swap is executed. Failure of any criterion is a no-go.

- **G1** — Every URL in R28's positive matrix has been exercised against the temp subdomain and reaches V3 with the correct language and preserved hash+query.
- **G2** — Every URL in R29's negative matrix has been exercised against the temp subdomain and serves the expected origin (V2 origin, the V3 app or a V3 asset from V3 S3, a V3 S3 404, or the marketing site) without the redirect function firing.
- **G3** — Function execution-time validation per R30a is within budget on the CloudFront test-function API.
- **G4** — Synthetic-response body and function source size per R20 / R20b / R20c are both under their 10 KB limits.
- **G5** — All seven checks per R26b (five CloudWatch alarms + two synthetic monitors) are deployed and have been verified to fire on a synthetic error.
- **G6** — Google Drive double-click validated end-to-end, OR the Drive contingency from R27 Path B has been formally invoked.
- **G7** — All sibling stories whose completion gates the flip per the Background section (CODAP-1325, CODAP-1324, CODAP-1326, plus CODAP-1319 if not formally waived) are merged and verified.
- **G8** — Stakeholder communication owned by the umbrella release plan ([CODAP-1322](https://concord-consortium.atlassian.net/browse/CODAP-1322) / [v3/doc/v3-release-plan.md](../../v3/doc/v3-release-plan.md)) has been sent on the agreed schedule.
- **G9** — Rollback decision authority (primary + secondary, per R25c) are confirmed available during the flip window.

Each criterion is signed off by a named individual before the swap (typically: engineering lead for technical criteria G1–G5; rollback decision authority per R25c for G6, G7, G9; release coordinator per CODAP-1322 for G8). The sign-off record is captured in the implementation spec or a flip-day runbook — that artifact, not this spec, is the operational checklist.

### Rollback triggers

The Route 53 swap MUST be reverted if any of the following is observed in the post-flip window. The rollback decision authority is named in R25c.

- **RB1** — Distribution-level 5xx rate above 1% sustained for ≥ 2 minutes, where the pre-flip baseline is ≪ 0.1%.
- **RB2** — A spot-check of `https://codap.concord.org/app/` from at least two geographically separate locations returns anything other than V3's expected HTML.
- **RB3** — Any URL in R28's positive matrix, when retested against production after the swap, fails to redirect correctly.
- **RB4** — Google Drive double-click flow (`/app/static/dg/en/cert/index.html#file=googleDrive:...`) fails to reach V3 with the document loaded.
- **RB5** — Function execution-error rate above 0.5% (CloudFront Function errors surface as 5xx; the `FunctionExecutionErrors` CloudWatch metric is the direct signal).
- **RB6** — Volume of support tickets reporting "CODAP won't load" or similar exceeds 5 in the first 30 minutes post-flip (or named symptoms agreed by the support team).

Borderline conditions that are NOT immediate rollback triggers — should be fixed forward unless they compound:
- Individual broken URLs reported by users where the underlying redirect logic is correct but V3 has a separate bug.
- V3 application errors not caused by the redirect itself.
- Slow page loads (unless tied to the redirect specifically).

## Technical Notes

### CloudFront Function constraints

CloudFront Functions are intentionally limited compared to Lambda@Edge:
- Synchronous-only, no network/disk/state.
- Maximum execution time: ~1 ms.
- Maximum function package size: 10 KB.
- Maximum synthetic-response body: ~10 KB.
- JavaScript runtime: ECMAScript 5.1 + a subset of ES6 (no async/await, no spread, no template literals at runtime in older runtimes — but the **cloudfront-js-2.0** runtime supports modern syntax including template literals).
- The function must use the `cloudfront-js-2.0` runtime to use template literals and other modern features; otherwise, all string construction must be ES5-compatible.

### Current CloudFront distribution topology — `codap.concord.org` (E3H9X49AG3GYSO)

Verified by inspection 2026-05-18 (`aws cloudfront get-distribution --id E3H9X49AG3GYSO`).

**Default cache behavior**: targets `codap.wpengine.com` (origin id `codap.wpengine.com`). This is the WordPress marketing site. Confirmed via `curl -I https://codap.concord.org/` → `x-powered-by: WP Engine`. So `/` is NOT V2 on the current distribution; any function attached to the default behavior would intercept the marketing site, which is wrong.

**Cache behaviors relevant to V2 → V3 redirects**:

| Path pattern | Target origin | Existing function | Notes |
|---|---|---|---|
| `/app` | `codap server` (codap-server.concord.org) | none | V2 entry. Server-side Apache 301s `/app` → `/app/`. |
| `/app/*` | `codap server` | none | V2 deep paths, including `/app/static/dg/{lang}/cert/...`. |
| `/app/extn/plugins/TP-Sampler/*` | `S3-Website-models-resources` | `RewriteTPSampler` | More-specific behavior, function rewrites to S3. Untouched by V2→V3 work. |
| `/releases/*` | `codap server` | none | V2 dated builds + named build paths (incl. `/releases/latest/...`, `/releases/.gapikey`, `/releases/staging`, etc.). |
| `/releases/latest/extn/plugins/TP-Sampler/*` | `S3-Website-models-resources` | `RewriteLatestReleaseTPSampler` | More-specific behavior, function rewrites to S3. Untouched. |
| `/v2`, `/v2/*` | `codap server` | none | Already wired; `codap.concord.org/v2/` returns 200 today. CODAP-1325 ensures the EC2-side symlink is correct. |
| `/~bfinzer/*`, `/~eireland/*`, `/~jsandoe/*` | `codap server` | none | Tilde-user paths that ever served real V2 traffic. |
| `/sage`, `/sage/*` | `codap server` | none | SageModeler-related; out of scope. |
| `/codap-resources/*` | `codap-resources` (S3) | `StripCodapResourcesPrefix` | From CODAP-1218; reference pattern for our function. |

**Cache behaviors that proved a current-state assumption is stale**: there is no `/static/*` cache behavior. `curl -I https://codap.concord.org/static/dg/en/cert/index.html` returns 404 from WPEngine, so bare `/static/...` URLs do not serve V2 on this distribution today. See Q12.

**Exceptions live inside `/releases/*`**: `/releases/.gapikey` (verified 200 OK, 40 bytes), `/releases/staging`, `/releases/zips`, `/releases/var`, `/releases/apple-touch-icon.png` are all served by the same `/releases/*` cache behavior on the *current* distribution — none has a dedicated cache behavior today. On the new distribution, Q14=B / R26 give each its own more-specific cache behavior routing to V2 origin, so the redirect function never sees them and performs no carve-out matching (R9–R13).

**Existing CloudFront Functions in the account use `cloudfront-js-2.0`**: every function on this distribution (`RewriteTPSampler`, `RewriteLatestReleaseTPSampler`, `StripCodapResourcesPrefix`) and elsewhere in the same account (`RedirectInsideConcord`, `CarrersitePhpPathRedirect`, `ngsa-redirect`) uses the `cloudfront-js-2.0` runtime. Confirms R20 mechanism choice.

**Reference function patterns already deployed**:
- `RedirectInsideConcord` — minimal 301 redirect (server-side, drops hash). Not appropriate for us (drops hash) but useful as a "minimum function shape" reference.
- `StripCodapResourcesPrefix` — single regex rewrite of `request.uri`. Reference for path matching.
- TP-Sampler rewrites — pattern for path-based S3 origin rewrites.

### Flip mechanism — DNS swap on a cloned distribution

**Approach (decided 2026-05-19, Q6)**: stand up a brand-new CloudFront distribution that mirrors the production `E3H9X49AG3GYSO` config plus the V3 cutover changes, exposed at a temporary subdomain. Pre-flip validation happens against the temp subdomain. Flip day is a Route 53 ALIAS swap; rollback is the same swap in reverse. The production distribution `E3H9X49AG3GYSO` is not modified at any point during this story.

**Route 53 (verified 2026-05-19)**:
- `codap.concord.org` is an **ALIAS A record** in hosted zone `Z2P4W3M7MDAUV6` (concord.org), targeting `d13zmjbnp90bac.cloudfront.net.` (E3H9X49AG3GYSO).
- ALIAS records have AWS-managed TTL; `dig` shows TTL=60s. DNS propagation after the flip lands within ~1 minute. **No advance TTL-lowering step required.**
- A related TXT record `_cf-custom-hostname.codap.concord.org=2355ad85-...` exists on `codap.concord.org` (looks like a Cloudflare custom-hostname verification token); not on the critical path of the flip but documented here.

**ACM certificate (verified 2026-05-19)**:
- The cert in use is `arn:aws:acm:us-east-1:612297603577:certificate/2b62511e-ccc8-434b-ba6c-a8c33bbd509e` — the `*.concord.org` wildcard.
- Status `ISSUED`; expires ~2026-11-11 (~5 months past flip day); `InUseBy: 196` resources.
- The wildcard already covers both `codap.concord.org` and the temp subdomain `codap2to3.concord.org`. **The same cert ARN can be attached to the new distribution — no re-issuance, no DNS validation step.**

**Distribution clone steps** (no `copy-distribution` API; encoded in a checked-in script per R26a):
1. `aws cloudfront get-distribution-config --id E3H9X49AG3GYSO > config.json` (also captures `ETag` in the response wrapper).
2. Programmatically transform `config.json`: strip the wrapper fields (`Id`, `Status`, etc.) so only `DistributionConfig` remains, generate a new `CallerReference`, remove `codap.concord.org` from `Aliases.Items` (set to the temp subdomain — required so HTTPS works on it for pre-flip validation per R27 / step 6a), keep the same `ViewerCertificate.ACMCertificateArn`, keep all origins, keep all 30 cache behaviors with their existing function associations.
3. `aws cloudfront create-distribution --distribution-config file://config.json` — deploys in ~10–20 min. Returns the new distribution ID and `dXXXXXX.cloudfront.net` domain.
4. Apply V3 cutover changes on the new distribution (origin swaps, function attachments, new carve-out cache behaviors per R26).
5. Run the verification step from R26a: diff the source distribution config against the cloned-and-modified distribution config and confirm differences match the expected allowlist (`CallerReference`, `Aliases`, origin swaps, function attachments, carve-outs). Any unexpected difference blocks the flip.
6. Add a Route 53 record for the temp subdomain `codap2to3.concord.org` → new distribution. Required for Drive validation Path A per R27.
6a. **Authorize the temp subdomain in the Google Cloud Console** for the CODAP Drive OAuth client (the same client that authorizes `codap.concord.org`). This enables Drive double-click end-to-end testing pre-flip (Path A per R27). Removal of this authorization is a post-flip cleanup task (tracked under CC4); the authorization is harmless but redundant after the soak.
7. Validate against the temp subdomain.

**Flip-day mechanism**: two ordered steps — **(step 1)** `aws cloudfront associate-alias` moves the `codap.concord.org` CNAME from `E3H9X49AG3GYSO` onto the new distribution (R24a; without this the new distribution `403`s every `codap.concord.org` request), then — once the `associate-alias` change has reached `Deployed` status on the new distribution (R24a) — **(step 2)** one `aws route53 change-resource-record-sets` call updating the `codap.concord.org` ALIAS target in zone `Z2P4W3M7MDAUV6` from `d13zmjbnp90bac.cloudfront.net.` (E3H9X49AG3GYSO) to the new distribution's domain. Propagation is ~60s at the authoritative layer; see R25 for the resolver-cache tail behavior to expect during forward-flip and rollback. Rollback reverses both steps in the same order.

**Post-flip soak**: see R25a for the 14-day minimum soak window, exit criteria, sign-off process, and old-distribution disposition (archive for 90 days, then delete).

### V3 language handling

`v3/src/utilities/translation/languages.ts` bundles 18 language keys: `de, el, en-US, es, fa, fr, he, ja, ko, nb, nl, nn, pl, pt-BR, th, tr, zh-Hans, zh-TW`. V2 historically only built 13 (`de, el, en, es, he, ja, nb, nn, pt-BR, th, tr, zh-Hans, zh-TW`) per PR #2340. The function passes through whatever non-English code it sees rather than hard-coding the list. V3 falls back to a base language (e.g., `pt-BR` → `pt`) and registers `en` and `en-US` as the same translations.

### Source-of-truth references

- [v3/doc/v3-release-plan.md](../../v3/doc/v3-release-plan.md) — release plan; section "CloudFront Function — V2 → V3 redirects (DevOps)" mirrors this story's mapping table.
- [PR #2340](https://github.com/concord-consortium/codap/pull/2340) — original redirect strategy (HTML files via V2 release process).
- [CODAP-1090](https://concord-consortium.atlassian.net/browse/CODAP-1090) — CloudFront log analysis (Feb 2025 → Jan 2026).
- [CODAP-1091](https://concord-consortium.atlassian.net/browse/CODAP-1091) — CODAP/AP URL stats.
- [CODAP-1094](https://concord-consortium.atlassian.net/browse/CODAP-1094) — Google Drive double-click research.

## Out of Scope (and post-flip follow-ups)

Items unrelated to this story:
- Changes to V2 SproutCore code or any V2 release process.
- Changes to V3 application code (URL params, etc.) — covered by sibling stories.
- The `/v2` symlink on the EC2 origin — covered by [CODAP-1325](https://concord-consortium.atlassian.net/browse/CODAP-1325).
- SageModeler-side CloudFront redirect updates — covered by [CODAP-1325](https://concord-consortium.atlassian.net/browse/CODAP-1325).
- V3 release switch flips (log destination, save extension, V2-doc auto-save) — covered by [CODAP-1326](https://concord-consortium.atlassian.net/browse/CODAP-1326).
- "Launch CODAP" button update on the marketing site — content team, not dev.

Post-flip follow-ups (tracked separately; not blocking this story's completion per R25b):
- **Google Drive Open URL config change** (Option B from [CODAP-1094](https://concord-consortium.atlassian.net/browse/CODAP-1094)) — Phase 4 post-release cleanup; ticket TBD.
- **LARA / Activity Player library entries** — update embedded V2 URLs in the LARA library to V3 form for cleanliness (redirects continue to work; this is housekeeping); ticket TBD, owner: LARA team.
- **Post-flip observability work** (Rollbar, telemetry beyond R26b's CloudWatch alarms) — ticket TBD.
- **Remove temp-subdomain authorization** from Google Cloud Console for the CODAP Drive OAuth client (added in step 6a of the clone procedure) — ticket TBD; can be done any time after soak passes per R25a.
- **Remove the temp subdomain** — delete its Route 53 record and remove the temp-subdomain entry from the (now-production) new distribution's `Aliases` — ticket TBD; any time after soak passes per R25a.
- **Delete archived `E3H9X49AG3GYSO`** after the 90-day archive window per R25a — ticket TBD; calendar reminder for ~2026-09 (90 days after the soak passes).

## Open Questions

### RESOLVED (2026-05-19): Q1 — What is the V3 destination URL?
**Context**: V3 will be served on the `codap.concord.org` domain itself, *not* `codap3.concord.org`. Going forward, the current CODAP version always lives at `/app/`; specific versions get version-pinned URLs (`/v3/`, future `/v4/`, etc.) so older versions remain reachable after future major-version cutovers.
**Decision**: **V3 destination URL = `https://codap.concord.org/app/`** (current-version path). A `/v3/` path will also exist for version-pinning (see Q13 for whether that's scoped to this story). The redirect-target base URL constant is `V3_BASE_URL = "https://codap.concord.org/app"` (no trailing slash; the function appends `/?lang=...` per Q8 = A).

**Implication for the function**: per the Jira description (`window.location.replace(v3Url)`) the function still returns HTML+JS to perform a client-side redirect — the destination is just within the same domain. V2 paths under `/app/static/dg/{lang}/cert/...` and `/releases/{name}/...` redirect to `https://codap.concord.org/app/?lang={lang}` (preserving hash + any non-`lang` query params via the JS). After the flip, the `/app/*` cache behavior on the new distribution targets V3's S3 origin so that the post-redirect request actually serves V3 content. Some V2-shape `/app/...` paths still need an explicit redirect (to remove V2 path components from the URL bar and put the lang into a query param V3 already understands).

**Implication for `/releases/*`**: see Q14 (open) for whether `/releases/*` keeps routing to V2 origin (with the function intercepting deep paths) or also swaps to V3 origin.

---

### SUPERSEDED (2026-05-19): Q2 — Gating mechanism: in-function flag vs. cache-behavior attachment?
**Context**: Originally framed when the cutover was an in-place modification of `E3H9X49AG3GYSO`. Per Q6's new clone+DNS-swap approach, gating happens at the DNS layer instead — there is no need for an in-function `ENABLED` flag or for attach/detach choreography on the prod distribution.
**Original options considered**:
- A) Attach/detach the function on V2 cache behaviors.
- B) In-function `ENABLED` constant.
- C) Both.

**Original decision**: **C** (both layers).

**Current status**: **SUPERSEDED by Q6 (clone + DNS swap)**. The gate is now: the new distribution exists at a temp subdomain; `codap.concord.org` continues pointing at `E3H9X49AG3GYSO` until flip day. No in-function `ENABLED` constant is required (R22 rewritten accordingly). `LOG_ENABLED` (R23) remains useful and stays.

---

### RESOLVED: Q3 — `/releases/*` matcher: whitelist vs. shape-based pattern?
**Context**: The release plan and Kirk's 2026-05-13 refinement comment both flag this. We need to redirect launchable subpaths under `/releases/` (e.g., `/releases/latest/...`, `/releases/build_NNNN/...`) without sweeping in non-launchable paths (`/releases/.gapikey`, `/releases/staging`, `/releases/zips`, `/releases/var`, `/releases/apple-touch-icon.png`). Distribution inspection confirmed these exceptions all share the `/releases/*` cache behavior, so the function must enforce them itself.
**Options considered**:
- A) **Whitelist** — explicit list of launchable names (`latest`, `stable`, `build_NNNN`, `codap_y2`, `ukde`, `dsg`, `dmartin`, `zisci`, …). Simple, deterministic, but requires function updates when new launchable names appear.
- B) **Shape-based pattern** — match `/releases/{name}/` (trailing slash, no file extension) or `/releases/{name}/index.html` or `/releases/{name}/...`; leave bare-file paths under `/releases/` alone. Future-proof but requires verification that all non-launchable paths differ in shape from launchable ones (Kirk flagged this).
- C) **Hybrid** — explicit non-redirect list (the five known exceptions) plus a permissive shape-based rule for everything else under `/releases/`. Tilde paths and `/v2` are routing-handled (R7, R8), not function-handled.

**Decision**: **C** — hybrid. The function first checks the explicit non-redirect list (R9–R13) and falls through to origin on match; otherwise applies the shape-based rule for `/releases/{name}/...`. Pre-prod validation per R24 confirms no other bare-file `/releases/` paths get caught up.

**Partially superseded (Q14=B)**: the in-function carve-out-list check described above was removed when Q14=B reclassified R9–R13 as routing-handled — the function does **not** check a carve-out list (R4, R26; each carve-out is a dedicated more-specific cache behavior that routes the request away from the function). Only the shape-based-rule half of the hybrid remains live, now pinned as R4's `{name}` rule `^[^/]+$`. The options-considered list above is left as historical context.

---

### RESOLVED: Q4 — Where does the CloudFront Function source live in this repo?
**Context**: This is the first CloudFront Function we've owned in this repo. Need a location convention so DevOps and engineering can both find/version it.
**Options considered**:
- A) `v3/devops/cloudfront-functions/v2-v3-redirect/` — under `v3/` since cutover is V3 work.
- B) `devops/cloudfront-functions/v2-v3-redirect/` — at repo root, since the function is infrastructure shared by the V2-domain cutover.
- C) Separate repo (e.g., a CC infrastructure repo) — keeps app code clean but adds friction for review.

**Decision**: **B** — at repo root in `devops/cloudfront-functions/v2-v3-redirect/`. The function is infrastructure that intercepts the V2 domain; it doesn't belong under `v3/`. Co-locates with future CloudFront-function source if the team brings the existing `StripCodapResourcesPrefix`, TP-Sampler rewrites, etc. into source control.

---

### RESOLVED: Q5 — Which CloudFront distribution IDs are involved?
**Context**: Need confirmed IDs for the production `codap.concord.org` distribution (target of the function attachment) and a non-production test distribution (R24 verification).
**Options considered**:
- A) Document IDs in the spec once DevOps provides them.
- B) Reference by friendly name (`codap.concord.org production`) and resolve IDs at deploy time.

**Decision**: **A** — production distribution `E3H9X49AG3GYSO` (confirmed by `aws cloudfront get-distribution` on 2026-05-18; CNAME `codap.concord.org`, 30 cache behaviors, default origin `codap.wpengine.com`). Findings from inspection are folded into Technical Notes above. Test distribution still pending Q6.

---

### RESOLVED (re-decided 2026-05-19): Q6 — How is the test distribution provisioned for pre-flip validation?
**Context**: Originally resolved as a path-prefix carve-out (`/2v2/*`) on the prod distribution. The design has since shifted — V3 will be served on `codap.concord.org` itself (Q1, still TBD on exact URL), which is best validated against an actual CloudFront distribution configured the way prod will look post-flip. The prefix-based approach can't fully exercise that.
**Options considered**:
- A) Stand up a temporary CloudFront distribution with a test hostname; tear down after verification.
- B) Reuse an existing test/staging distribution.
- C) Test against `codap3.concord.org`'s distribution since that's the destination anyway.
- D) **(Previously selected)** Path-prefix carve-out `/2v2/*` on the prod distribution with a `TEST_PREFIX` function constant.
- E) **(New 2026-05-19)** Clone the prod distribution and use the clone for pre-flip validation; flip day = Route 53 ALIAS swap from prod distribution to clone.

**Decision**: **E** — clone E3H9X49AG3GYSO into a new distribution, apply the V3 cutover changes there, expose it at the temporary subdomain `codap2to3.concord.org` (`*.concord.org` wildcard cert in us-east-1 covers it so no cert work is needed). Pre-flip testers hit the temp subdomain. Flip day is one `aws route53 change-resource-record-sets` call updating the `codap.concord.org` ALIAS target in zone `Z2P4W3M7MDAUV6` from `d13zmjbnp90bac.cloudfront.net.` (E3H9X49AG3GYSO) to the new distribution's domain. Rollback is the same call reversed. No modifications to `E3H9X49AG3GYSO` at any point. Captured in the "Flip mechanism" Technical Notes subsection above and in R22–R30 below.

The previous D-option `/2v2/*` mechanism (and the `TEST_PREFIX` function constant) is dropped.

---

### RESOLVED: Q7 — Should there be any logging/observability from the function itself?
**Context**: CloudFront Functions can emit logs to CloudWatch (with cost). On flip day we may want to see "function fired N times, type X paths matched" to confirm it's working. But every fire is on the hot path of every request.
**Options considered**:
- A) No function-internal logging — rely on existing CloudFront access logs to count requests by path.
- B) Light logging only on flip day — emit a single log line per request the first hour; remove afterward.
- C) Persistent logging — keep a log entry per redirect indefinitely for ongoing observability.
- D) **(User addition)** Top-of-file `LOG_ENABLED` boolean — log only when true, controlled by the same kind of source constant as the `ENABLED` gate from Q2.

**Decision**: **D** — top-of-file `LOG_ENABLED` boolean (R23). When `true`, the function emits a single `console.log` line per fire including source URI, destination URL, and a short rule tag (R30). When `false` (default in committed source), no logging — zero hot-path cost. Flipping the flag for short windows (flip day, debugging) requires editing the source constant and republishing the function — there is no runtime toggle.

---

### RESOLVED: Q8 — When the destination URL has only `?lang=` and no other parameters, what about a trailing slash?
**Context**: For a V2 path like `/app/static/dg/fr/cert/index.html` with no other query string and no hash, the destination is `<V3_BASE_URL>?lang=fr`. The path component before `?` matters because some browsers and JS frameworks behave differently with/without a trailing slash. Now that Q1 has settled on `V3_BASE_URL = "https://codap.concord.org/app"`, this question is about whether the post-redirect URL is `https://codap.concord.org/app/?lang=fr` or `https://codap.concord.org/app?lang=fr`.
**Options considered**:
- A) Always include trailing slash before `?` — `https://codap.concord.org/app/?lang=fr`.
- B) Omit — `https://codap.concord.org/app?lang=fr`.

**Decision**: **A** — always include the trailing slash. The function constructs the destination as `${V3_BASE_URL}/${queryStringPossiblyWithLang}${hash}` so `/app/` is the directory and any query string sits cleanly after. Consistent with how `/v2/` (verified live) ends its base URL.

---

### RESOLVED: Q9 — Is there a "no-redirect" escape hatch for support/debugging?
**Context**: After flip day, if a user reports a problem with a specific V2 URL, support may want a way to reach the underlying V2 origin (if it still exists at `/v2/...`) without the redirect firing. The `/v2/*` carve-out covers SageModeler; does it cover support cases too, or is something more needed?
**Options considered**:
- A) `/v2/*` carve-out is enough — support manually rewrites the URL.
- B) Add a query-string bypass (e.g., `?noredirect=1`) the function honors.
- C) No additional bypass needed beyond `/v2/*`.

**Decision**: **C** — no additional bypass mechanism. Support and engineering can hit V2 directly via `codap.concord.org/v2/...`. Avoids the surface area of an escape-hatch parameter that bad actors could append to URLs to bypass the redirect.

---

### RESOLVED: Q10 — Which cache behaviors does the function attach to?
**Context**: Surfaced by inspecting `E3H9X49AG3GYSO`. The distribution's default behavior targets WPEngine (marketing). Attaching the function to the default behavior would intercept marketing traffic. The natural attachment points are the cache behaviors that already route to V2 (`codap server`):

**Candidate attachment set (minimum)**: `/app`, `/app/*`, `/releases/*`.

**Possibly also**: `/sage`, `/sage/*` (route to `codap server`, but SageModeler is explicitly out of scope per CODAP-1325). The other `codap server` behaviors (`/migration-test/*`, `/data-science-games/*`, `/DataGames/`, `/data-science-worlds/*`, `/codap-data.bak/*`, `/sdlc/*`, `/_assets/*`, `/auth/*`, `/codap-data/*`, `/plugins/*`, `/resources/*`) are old V2 internals — most are out of scope per current understanding, but should be confirmed.

**Options considered**:
- A) **Minimum set** — only `/app`, `/app/*`, `/releases/*`. Everything else continues to serve V2 from origin or 404 as today.
- B) **Minimum set + a new `/static/*` behavior** added to support R6 (see Q12). Adds CloudFront config beyond just function attachment.
- C) **Broader set** — also attach to all of the V2 sub-path behaviors (`/migration-test/*`, etc.). Catches more V2 deep-links but increases function-fire surface and risk of unintended redirect.

**Decision**: **A** — attach the function to `/app`, `/app/*`, and `/releases/*` only. (Initially Q12 selected B which would have added a new `/static/*` behavior, but Q12 was later revised to A after the user clarified that `/static/...` in the Jira mapping table means `/app/static/...`.) Other V2 sub-path behaviors (`/migration-test/*`, `/data-science-games/*`, etc.) are left alone.

---

### RESOLVED: Q11 — Does the function intercept `/` on `codap.concord.org`?
**Context**: The release-plan table lists `/` (V2 root) → V3 root. But the current distribution serves the WordPress marketing site at `/` (default behavior → `codap.wpengine.com`). The "Launch CODAP" button on the marketing site is owned by the content team (per the release plan) and will be updated separately to point at V3. So leaving `/` alone is consistent with the marketing-team's plan.
**Options considered**:
- A) **Do NOT redirect `/`** — leave the marketing site at `/` untouched. V2 root traffic in the release-plan table refers to historical V2-at-`/` from before WPEngine became the default. Content team handles the "Launch CODAP" button.
- B) Redirect `/` — would require attaching the function to the default cache behavior, intercepting *all* marketing pages, then conditionally passing through everything except exact `/`. Significantly more risk.
- C) Re-route `/` only — add a new cache behavior with pattern `/` (exact) that targets the function. Possible but probably unnecessary if the content-team button update happens by flip day.

**Decision**: **A** — leave `/` alone. The marketing site continues to serve at `/`. Content team is separately updating the "Launch CODAP" button to V3.

---

### RESOLVED: Q12 — What about bare `/static/dg/{lang}/cert/...` paths?
**Context**: The release plan and the original PR #2340 strategy include `/static/dg/en/cert/...` and `/static/dg/{non-en-lang}/cert/...` as paths to redirect. But the current `codap.concord.org` distribution has no `/static/*` cache behavior — bare `/static/...` requests fall through to WPEngine and return 404. User clarification (2026-05-18): the `/static/...` rows in the Jira mapping table really mean `/app/static/...`. So bare `/static/...` is not a real V2 surface.
**Options considered**:
- A) **Do nothing** — bare `/static/...` continues to return 404. /app/static/* (the real path) is covered by R2 and R3.
- B) Add a `/static/*` cache behavior + attach function. Was selected before user clarified the path is shorthand.
- C) Function-only `/static/*` behavior.

**Decision**: **A** — do nothing. Bare `/static/dg/{lang}/cert/...` is not a real V2 path on this distribution; the Jira mapping table's `/static/...` rows are shorthand for `/app/static/...`, which is already covered by R2 (English) and R3 (non-English). R6 reflects this.

---

### RESOLVED: Q13 — Is the `/v3` / `/v3/*` version-pinned path added in this story?
**Context**: Per Q1 (2026-05-19), the team's long-term plan is `/app/` = current CODAP version, `/v3/`, `/v4/`, etc. = version-pinned URLs so older versions stay reachable across future major-version cutovers. The new distribution being stood up here is a natural place to introduce `/v3/*`, but it's not strictly required for the V2 → V3 cutover.
**Options considered**:
- A) **In scope** — add `/v3` and `/v3/*` cache behaviors to the new distribution as part of this story, targeting a V3-version-pinned S3 path. Ships the future-proofing along with the cutover.
- B) **Sibling story** — add `/v3/*` in a follow-up after the cutover lands.
- C) **Stub now, fill in later** — add `/v3/*` cache behavior pointing at the same origin as `/app/*` (latest V3) initially.

**Decision**: **A** — `/v3` and `/v3/*` cache behaviors are added to the new distribution as part of this story. `/v3` is a bounded entry point that serves the V3 app the same way `/app/` does — document state is carried in URL hash parameters (as in `/v2/` and `/app/`), with no V2-style deep redirect paths. Standing it up is CloudFront-config + deploy work, not a build-system change. One implementation-level detail is deferred: the exact version-pinned S3 path (e.g., `/codap3/v3.x.y/`) is a deploy-configuration choice worked out in implementation.md; it does not block this spec and does not carry open-ended scope (DO-F4, fifth-pass review).

R26 is updated to include the new `/v3` and `/v3/*` behaviors.

**Superseded (IF2, 2026-05-22)**: Phase 2 implementation planning (IQ4) replaced this. `/v3` and `/v3/*` do **not** serve the V3 app directly with no function — they **redirect to `/app/`** via the redirect function (new R6a). Post-flip `/app/` *is* current V3, so `/v3` is just another name for it; a redirect is correct and far simpler than a version-pinned origin. The "bounded entry point / No function attachment" framing and the deferred "version-pinned S3 path" detail are both withdrawn. See R6a, the revised R26 `/v3` bullet, and IF2.

---

### RESOLVED: Q14 — How does `/releases/*` work on the new distribution?
**Context**: V2 deep-link bookmarks and Activity Player content reference `/releases/latest/...`, `/releases/build_NNNN/...`, etc. (CODAP-1090 traffic data). On the new distribution, `/releases/*` could either keep routing to V2 origin (with the function redirecting deep paths to `/app/`) or also swap to V3 origin (with carve-outs).
**Options considered**:
- A) Keep `/releases/*` on V2 origin; function intercepts launchable subpaths and redirects to `/app/?lang=...`. Carve-outs handled by function passing through.
- B) Swap `/releases/*` to V3 origin; carve-outs get specific cache behaviors routing to V2 origin (ordered ahead of `/releases/*` so they match first — see R26's cache-behavior-precedence rule).
- C) Swap `/releases/*` to V3 origin; function URI-rewrites deep paths to V3's entry point. URL bar stays at `/releases/...`.

**Decision**: **B** — swap `/releases/*` to V3 origin; carve-outs each get a more-specific cache behavior routing to V2.

Concrete shape on the new distribution:
- `/releases/*` cache behavior: origin = V3 S3 (`S3-Website-models-resources-codap3`). Function attached at viewer-request. The function returns an HTML+JS redirect for launchable subpaths (`/releases/{name}/...` and `/releases/{name}/static/dg/{lang}/cert/...`) → `https://codap.concord.org/app/?lang=...` preserving hash. Since every launchable subpath the function matches returns a synthetic response, the origin choice doesn't actually matter for those paths (function never falls through). V3 S3 is picked for consistency with the long-term "V3 everywhere" direction and so any unanticipated `/releases/*` request that *doesn't* match the function's launchable pattern lands at V3 (not V2) by default.
- **New specific cache behaviors for each carve-out**, routing to `codap server` (V2 origin), no function attached:
  - `/releases/.gapikey`
  - `/releases/staging`
  - `/releases/zips/*`
  - `/releases/var/*`
  - `/releases/apple-touch-icon.png`
- Function logic simplifies: no carve-out matching inside the function. R9–R13 are now **routing-handled** rather than function-handled.
- `/releases/latest/extn/plugins/TP-Sampler/*` remains its own more-specific cache behavior routing to S3 with the existing TP-Sampler rewrite function (unchanged).

R9–R13 reclassified from "function-handled" to "routing-handled" carve-outs. R26 updated to list the new specific carve-out cache behaviors.

---

### RESOLVED: V2-domain `/v2/` URL is live
**Context** (user note 2026-05-19): `/v2/` is already wired up on `codap.concord.org`. Verified by curl: `https://codap.concord.org/v2/` returns an HTML page that detects browser language, preserves query+hash, and redirects into `/v2/static/dg/{lang}/cert/index.html` on the V2 EC2 origin. R7 updated accordingly. CODAP-1325's CloudFront + origin work is therefore already complete.

## Self-Review

Multi-role review of the requirements spec (not implementation), 2026-05-19. Roles: Senior Engineer, Security Engineer, QA Engineer, DevOps/SRE, Performance Engineer, Product Manager, Cutover Coordinator.

### Senior Engineer

#### RESOLVED: SE1 — R1 over-broad: redirects all `/app/...` but R26 says non-V2-shape `/app/*` passes through
R1 read "Redirect `/app` and `/app/...` to `https://codap.concord.org/app/`", but R26 (`/app/*` behavior) said "Other `/app/*` requests pass through to V3 S3". These were contradictory. As written, R1 would have intercepted legitimate V3 asset/deep-link requests (e.g., `/app/static/js/bundle.js` or a future V3 share URL like `/app/?id=X`) and clobbered them to bare `/app/`.

**Resolution**: R1 rewritten to (a) cover only exact `/app` (no slash) → `/app/`, and (b) explicitly forbid the function from redirecting arbitrary `/app/...` deep paths. R2 and R3 are now the only `/app/...` patterns the function matches; everything else under `/app/*` falls through to V3 S3 (consistent with R26).

#### RESOLVED: SE2 — `{lang}` pattern unspecified
R3, R5, R6 talked about `{lang}` matching but never defined the regex/charset. Without an explicit pattern, the function author would have to guess, and a too-permissive pattern lets junk reach the destination URL (and the inline HTML/JS — see Sec1).

**Resolution**: R3 amended with an explicit BCP-47-shaped pattern: `^[A-Za-z]{2,3}(-[A-Za-z]{2,4})?$`. Paths whose `{lang}` segment doesn't match fall through (no redirect). Case preserved verbatim. R5 and R6 inherit this definition by reference to R3's pattern.

#### RESOLVED: SE3 — `?lang=` collision behavior unspecified
R17 said the constructed URL must be valid when `?lang=` is added and a query string exists, but didn't say what happens if the original query *already* contains `lang=`. R21's prose ("`original_search_minus_lang`") implied path-detected `lang` wins, but the rule was buried.

**Verification of current V2 behavior** (2026-05-19): `curl -sI 'https://codap.concord.org/app/static/dg/fr/cert/index.html?lang=es&foo=bar'` returns HTTP 200 serving the French file from V2 Apache. Server-side, the path wins; the `?lang=es` is ignored at the routing layer. The redirect function should mirror this.

**Resolution**: Added R17a stating path-detected `{lang}` is authoritative; any incoming `lang` query param is stripped; remaining query params are preserved. R21's prose tightened to reference R17a rather than duplicate the rule.

#### RESOLVED: SE4 — `/releases/{name}/` matching shape not defined
Q3 was resolved "hybrid", but Q14 (B) later moved the carve-outs out of the function. The shape rule for `{name}` was the only matching logic left under `/releases/*`, but R4/R5 still described it via examples rather than a regex.

**Resolution**: R4 amended with `{name}` shape rule `^[^/]+$` (any one-or-more non-`/` chars). The rule can be maximally permissive because Q14's routing-handled carve-outs already remove every `/releases/*` path we don't want redirected before the function fires. Anything that reaches the function is by topology something we want sent to V3. Empty-name (`/releases/`) falls through. R5 inherits this definition by reference to R4.

---

### Security Engineer

#### RESOLVED: Sec1 — Lang code injected into inline HTML/JS without specified escaping
The function returns inline HTML containing JS that calls `window.location.replace(v3Url)`. The path-extracted `{lang}` flows into that JS string. The spec did not require any value extracted from the request URI to be escaped before being embedded in HTML/JS.

**Resolution**: SE2 now constrains `{lang}` to BCP-47 shape (primary defense). Added R21a requiring HTML-escape + JS-string-escape on any URI-extracted value embedded into the synthetic response (belt-and-suspenders). R19's client-side JS reads `window.location.search`/`hash` directly so those values never traverse the function.

#### RESOLVED: Sec2 — Hash fragment XSS in the synthetic page itself
R19 said the page JS reads `window.location.hash` and constructs the redirect URL. The intended flow (passing to `window.location.replace()`) is safe, but a sloppy implementation that inserts hash text into a `<noscript>` link or a "redirecting…" message via `innerHTML`/`document.write` would create a reflected-XSS sink. Hash never reaches the server, so it bypasses any server-side filtering.

**Resolution**: Added R19a requiring the page's body content to be static (compiled-in constants only) and explicitly forbidding `innerHTML`, `document.write`, `outerHTML`, and equivalent sinks for request-derived data. Request-derived values may only flow to `window.location.replace()`.

#### RESOLVED: Sec3 — No CSP / referrer / cache headers on the synthetic response
CloudFront Function synthetic responses can set headers; the spec didn't require any. Most important is `Cache-Control: no-store` — the synthetic page is per-request (reads current hash/search and bounces); a cached copy would mis-route a later request.

**Resolution**: Added R20a requiring `Content-Type: text/html; charset=utf-8`, `Cache-Control: no-store`, `Content-Security-Policy: default-src 'none'; script-src 'unsafe-inline'`, and `X-Content-Type-Options: nosniff`. `Referrer-Policy` and HSTS deemed not needed at the function level.

---

### QA Engineer

#### RESOLVED: QA1 — R28 positive matrix says "every language code shipped by V2 historically" but doesn't enumerate them
The test matrix forced cross-referencing to Technical Notes, and it didn't cover (a) V3-only codes, (b) BCP-47-shaped unknown codes, (c) the new R17a collision case, or (d) negative shapes that should fall through under the new R3 regex.

**Resolution**: R28 rewritten to enumerate the 12 V2 non-English codes, plus V3-only (`fa`), unknown-but-shaped (`xx`), the R17a collision case, and representative `/releases/{name}` builds. R29 extended with malformed-`{lang}` rows (script tag, digits, empty) plus a V3-asset-shape row to verify R1's "non-V2 paths pass through" guarantee.

#### RESOLVED: QA2 — No flip-day go/no-go success criteria
The spec described what gets tested pre-flip but didn't define a pass/fail bar that gates the Route 53 swap. On flip day "is this good enough?" is the wrong conversation.

**Resolution**: Added a "Flip-day go/no-go criteria" subsection with G1–G9 composing the existing requirements (positive/negative matrix completion, perf budgets, alarms, Drive validation, sibling-story gating, comms, on-call). Several criteria cross-reference review items (Perf1, Perf2, Ops3, QA4, CC1, PM1, CC3) that will be resolved later in this review pass — once those are addressed, the criteria become live.

#### RESOLVED: QA3 — No rollback decision criteria
R25 said rollback is one DNS call but didn't say *when* you'd make that call. Without explicit criteria the on-call had no rubric for a high-pressure decision.

**Resolution**: Added a "Rollback triggers" subsection with RB1–RB6 (5xx rate, distribution spot-check, R28 retest fail, Drive flow fail, function-error rate, support ticket volume). Also enumerated borderline conditions that are NOT immediate rollback triggers — fix-forward defaults. Decision authority deferred to CC3.

#### RESOLVED: QA4 — Pre-flip Drive double-click contingency is hand-waved
R27 said Drive double-click validation may be "deferred to the post-flip soak". If Drive turned out broken post-flip, the contingency was unclear — roll back, or live with it?

**Resolution**: R27 restructured into Path A (temp subdomain authorized — Drive validated pre-flip; recommended) and Path B (temp subdomain not authorized — Drive validation deferred; contingency must be formally invoked with named decision rules). Cross-references RB4 (rollback trigger for Drive failures in the redirect chain) and Ops4 (which recommends Path A be the default).

---

### DevOps / SRE

#### RESOLVED: Ops1 — Distribution clone: 30 cache behaviors edited by hand is risky
The clone procedure was "get config → edit JSON → create-distribution". With 30 cache behaviors each carrying origin IDs, function associations, cache/origin-request policy IDs, etc., a single mis-edit could silently misroute a category of users.

**Resolution**: Added R26a requiring the clone be encoded in a checked-in script (under `devops/cloudfront-functions/v2-v3-redirect/` per Q4) plus a structured diff verification step that compares source-vs-clone configs against an explicit allowlist of expected differences (CallerReference, Aliases, origin swaps, function attachments, carve-outs). Any other difference blocks the flip. Technical Notes' "Distribution clone steps" updated to reference the script and verification step.

#### RESOLVED: Ops2 — Soak period "~1 week minimum" lacks definition
"~1 week" was fuzzy at both ends — too short to absorb edge cases (vacation, 2-week classroom cycles); long enough that nobody was sure when they could delete the old distribution.

**Resolution**: Added R25a defining (a) 14-day minimum soak window, (b) exit conditions (no RB1–RB6 events, no redirect-related tickets in the final 7 days, joint sign-off by engineering lead and CC3 authority), (c) archive-not-delete disposition for `E3H9X49AG3GYSO` for an additional 90 days after soak passes. Technical Notes' "Post-flip soak" paragraph now references R25a rather than duplicating it.

#### RESOLVED: Ops3 — No CloudWatch alarms / observability during flip
`LOG_ENABLED` only provides pull-mode signal (someone has to go look). During a flip and the soak you need push-mode signal — alarms that page on-call.

**Resolution**: Added R26b requiring CloudWatch alarms for `FunctionExecutionErrors`, `FunctionThrottles`, distribution `5xxErrorRate`, distribution `4xxErrorRate`, plus a synthetic monitor that asserts a V3-shaped marker in the response to `/app/`. The synthetic monitor is the only check that catches "wrong content with 200 OK" failures. All five must be verified to fire on a synthetic error before the flip (G5).

#### RESOLVED: Ops4 — Drive validation gap (overlaps QA4 but from infra angle)
Drive Open URL accepts specific authorized origins. Without authorizing the temp subdomain in the CODAP Drive OAuth client, the redirect chain through Drive couldn't be exercised pre-flip (forcing Path B per R27).

**Resolution**: Promoted the Route 53 record step (Technical Notes step 6) from "Optional" to required, and added step 6a mandating authorization of the temp subdomain in the Google Cloud Console for the CODAP Drive OAuth client. Removal during post-flip cleanup is tracked under CC4. This makes Path A (R27) the default pre-flip flow.

#### RESOLVED: Ops5 — Sub-records and ancillary DNS not catalogued
Technical Notes flagged the `_cf-custom-hostname.codap.concord.org` TXT record but called it "not on the critical path" without auditing anything else. CAA records, sibling subdomains, DNSSEC state, and other verification tokens could interact with the flip.

**Resolution**: Added R26c requiring a documented pre-flip audit of every record under `*.codap.concord.org`, classified as irrelevant / handled / unhandled-action-required, plus a CAA check at the zone apex and a DNSSEC-disabled confirmation. Audit output lives in the implementation spec, not in requirements.

---

### Performance Engineer

#### RESOLVED: Perf1 — CloudFront Function 1ms budget not validated as a requirement
CloudFront's hard ~1ms limit was mentioned in Technical Notes but no requirement obligated verification. A function over budget gets rejected by the CloudFront API at deploy time — too late to discover at flip time.

**Resolution**: Added R30a requiring `aws cloudfront test-function` runs across a representative sample of R28/R29 URIs with explicit targets (median < 0.5ms, p99 < 1.0ms, no URI exceeding 1.0ms). Failure gates G3. Optimization fallback (precomputed response body) noted.

#### RESOLVED: Perf2 — 10KB synthetic-response budget not itemized
CloudFront has *two* distinct 10 KB limits — function source (package size) and synthetic response body. R20 covered only one; the other was implicit in Technical Notes and unenforced.

**Resolution**: Split R20 into R20 (response body ≤ 10 KB) and R20b (function source ≤ 10 KB after minification, including the `LOG_ENABLED` branch since CloudFront measures source not reachable code). Added R20c requiring build-time verification of both budgets, gating G4.

---

### Product Manager

#### RESOLVED: PM1 — Stakeholder communication plan absent
Flip day affects multiple external teams; the spec was silent on comms.

**Resolution**: Comms owned by the umbrella release plan ([CODAP-1322](https://concord-consortium.atlassian.net/browse/CODAP-1322) / [v3/doc/v3-release-plan.md](../../v3/doc/v3-release-plan.md)) — no duplicate plan needed in this spec. G8 updated to reference CODAP-1322 directly rather than a notional internal PM1.

#### RESOLVED: PM2 — Success metric undefined
"Successful flip" was implied but not defined. With R25a in place after Ops2, the "during-soak" definition is covered; the remaining gap was just an explicit "the story is Done" trigger.

**Resolution**: Added R25b stating the story is complete when R25a's soak exit conditions are met and engineering lead + CC3 authority sign off. No separate success-metric apparatus needed — R25a already encodes the measurable post-flip outcome.

#### RESOLVED: PM3 — Flip-day time zone unspecified
Sunday 2026-06-07 was named without a specific window.

**Resolution**: Out of scope for this spec — flip-day window selection belongs in the umbrella release plan (CODAP-1322), not in the redirect-function spec. This story doesn't need to know the hour.

---

### Cutover Coordinator

#### RESOLVED: CC1 — Sibling-story dependency criteria not stated
The Background listed sibling stories but didn't say which must be done before flip vs. which can ship after.

**Resolution**: Background rewritten with per-sibling gating classification — CODAP-1325 (gating, done), CODAP-1324 (gating, done), CODAP-1326 (gating, confirm), CODAP-1319 (should-but-not-strict), CODAP-1322 (non-gating umbrella). G7 updated to reference the gating siblings by name rather than via CC1.

#### RESOLVED: CC2 — Pre-flip checklist not enumerated
Originally a gap, but the QA2 resolution introduced G1–G9 ("Flip-day go/no-go criteria"), which is the composed checklist.

**Resolution**: Added a single paragraph after G9 stating each criterion is signed off by a named individual (defaults suggested for the engineering lead, CC3 authority, and CODAP-1322 release coordinator), with the sign-off record living in the implementation spec or a flip-day runbook. The runbook artifact — not the requirements spec — is the operational checklist.

#### RESOLVED: CC3 — Rollback decision-maker not named
R25 described the mechanism but not the authority. "Wait for consensus" is the wrong default during a flip-day incident.

**Resolution**: Added R25c naming the **CODAP V3 engineering lead** as primary rollback authority, with a named **secondary on-call** confirmed before flip (G9). Decision can be made unilaterally by either; consensus is not required. Specific individuals captured in the runbook, not the spec. All prior CC3 cross-references in the spec body (G6, G9, R25a, R25b, "Rollback triggers") updated to R25c.

#### RESOLVED: CC4 — Post-flip cleanup tasks are listed but unscoped
Out of Scope listed cleanup items without ownership or tracking — open loops from a coordination perspective.

**Resolution**: Out of Scope renamed "Out of Scope (and post-flip follow-ups)" and split into two parts: items unrelated to this story (no follow-up needed), and post-flip follow-ups (each with "ticket TBD" + owner hint where known). Two new follow-ups added that emerged from this review: (1) remove temp-subdomain authorization in Google Cloud Console per Ops4 step 6a; (2) delete archived `E3H9X49AG3GYSO` after the 90-day archive window per R25a, with calendar reminder for ~2026-09.

---

### Re-review (after initial resolution pass)

#### RESOLVED: RR1 — Go/no-go criteria cross-referenced Self-Review issue IDs that may disappear
G3–G6 originally pointed at `Perf1`, `Perf2`, `Ops3`, `QA4` — review-issue IDs from this Self-Review section. If the Self-Review section is later removed or collapsed, those references would dangle.

**Resolution**: G3 → R30a, G4 → R20 / R20b / R20c, G5 → R26b, G6 → R27 Path B. References now point at the actual requirement IDs, so they stay valid regardless of Self-Review section disposition.

---

## Self-Review (Second pass, 2026-05-19)

Fresh-eyes pass after first review's issues were resolved. Roles: Senior Engineer (fresh eyes), Security Engineer (fresh eyes), Incident Response / On-call, Customer Support, Tech Writer, FinOps.

### Senior Engineer (fresh eyes)

#### RESOLVED: SE5 — HTTP method handling unspecified
The function fires at viewer-request on every request to attached cache behaviors, including non-GET methods (HEAD, OPTIONS, POST). V2 paths under `/app/*` and `/releases/*` are GET-only in practice, but a misbehaving client or scanner could send POST. The synthetic response is a `200 text/html` regardless of method, which (a) silently discards a POST body, (b) hides intent from logs (looks like a normal redirect).

**Resolution**: Added R18a requiring the function to intercept only `GET` and `HEAD` requests; other methods fall through to origin without producing a synthetic response.

#### RESOLVED: SE6 — Synthetic response HTTP status code not specified
R20/R20a describe headers but not the status code. The CloudFront synthetic response defaults to whatever the function sets (commonly `200`). For an inline HTML+JS bouncer, `200` is reasonable, but some analytics/monitoring tools treat `200`-on-redirect differently than e.g. a `200` content response. Worth pinning.

**Resolution**: R20a updated to specify HTTP status code `200 OK` explicitly.

#### RESOLVED: SE7 — No-JavaScript and JS-blocked fallback unspecified
R19/R19a require client-side JS to navigate. Users with JS disabled, strict ad-blockers that strip inline scripts, or transient JS errors will be stuck on a blank-looking page with no path forward. The fraction is small (<<1%) but the failure is total for those users — and silent (no error visible to ops).

**Resolution**: Added R19b requiring a static `<noscript>` block with a plain anchor to `https://codap.concord.org/app/` (non-preserving fallback — hash/query are dropped) plus a user-visible message in the body. Specific message text and `<title>` are pinned in CS1 below.

---

### Security Engineer (fresh eyes)

#### RESOLVED: Sec4 — CSP could be tightened from `'unsafe-inline'` to a script hash
R20a specifies `script-src 'unsafe-inline'` because the page contains inline `<script>`. Since R19a requires the script to be static (no request-derived content), its SHA-256 hash is known at build time. Switching to `script-src 'sha256-<hash>'` removes the `'unsafe-inline'` allowance — meaningful defense-in-depth if a future code change accidentally introduces a second inline script that wasn't meant to ship.

**Resolution**: R20a's CSP bullet updated to prefer `script-src 'sha256-<hash>'` and accept `'unsafe-inline'` as a fallback. The policy MUST be one of these two forms — no broader `script-src` is acceptable.

**Update (SEC-F1, fifth pass, 2026-05-22)**: This resolution rested on a misreading of R19a. R19a constrains only the *user-visible body text* to be static — not the inline `<script>`, which per R21a carries the request-derived path `{lang}` and is therefore not byte-stable. A build-time `script-src 'sha256-<hash>'` would validate only one `{lang}` value. The `'sha256-'` preference for the script has been withdrawn; R20a now specifies `script-src 'unsafe-inline'`. See SEC-F1.

#### RESOLVED: Sec5 — Clickjacking headers absent
The synthetic page is navigational, so clickjacking risk is low. But adding `X-Frame-Options: DENY` (or equivalent `frame-ancestors 'none'` in CSP) is essentially free and removes the "embedded in an attacker iframe to social-engineer a click" surface entirely. Marginal but cheap.

**Resolution**: Decided NOT to add clickjacking headers. Rationale: the synthetic page is purely navigational with no interactive controls, so clickjacking risk is negligible — there is no click for an attacker to socially engineer. The decision and rationale are documented in R20a's trailing paragraph so future readers don't re-raise it. If future iterations of the synthetic page introduce interactive elements (e.g., a "click here to continue" link beyond the `<noscript>` fallback), revisit this decision.

---

### Incident Response / On-call

#### RESOLVED: IR1 — Flip-day runbook is referenced but not required to exist
G1–G9, R25c, and the sign-off paragraph all say "the runbook" or "the implementation spec or flip-day runbook" without obligating one to exist. Implicit-but-not-required artifacts get skipped when a release coordinator changes hands or under deadline pressure. The runbook is the operational checklist; if it doesn't exist as a discrete artifact, the go/no-go criteria become folklore.

**Resolution**: Added R31 requiring a checked-in flip-day runbook artifact at `devops/cloudfront-functions/v2-v3-redirect/RUNBOOK.md` (or equivalent), with explicit contents: G1–G9 sign-off slots, the exact forward/rollback `aws route53 change-resource-record-sets` invocations, alarm/monitor URLs, rollback-authority contact info, a pointer to existing CC operational / on-call docs for detection/rollback timing (IR3), first-hour watch protocol (IR4), support tier-1 path (CS2), and `LOG_ENABLED` enable/revert protocol (Fin2). The runbook must exist before G1–G9 sign-off begins.

#### RESOLVED: IR2 — Alarm and synthetic-monitor routing destination is "TBD"
R26b said "Alarm and monitor routing destination is the existing CC engineering on-call channel/email (specific routing confirmed during implementation)". If alarms fire to nowhere, R26b's verification ("verified to fire on synthetic error before flip") would just be verifying a delivery to /dev/null.

**Resolution**: Decided NOT to route alarms to Slack/PagerDuty/email distribution lists. R26b's monitoring paragraph rewritten to specify manual CLI/console watch during the flip and the IR4 active-watch window. Acceptable given (a) the active-watch window is short and bounded, (b) R25c authority is dedicated to the watch with no other obligations, and (c) synthetic-monitor failures surface in the CloudWatch console alongside the other alarms. R26b's "verified to fire" requirement is retained — alarms still need to be exercised pre-flip so the operator knows what a firing alarm looks like.

#### RESOLVED: IR3 — Time-to-detect and time-to-rollback SLOs absent
RB1–RB6 describe *what* triggers rollback but not *how fast* the response is expected. On a Sunday flip, "we'll roll back if X" without a target window means an issue could persist for hours before anyone notices.

**Resolution**: Skipped — out of scope for this spec. Detection / decision / execution windows are covered by existing Concord Consortium operational docs and on-call practice. The R31 runbook will reference those existing docs rather than restating SLOs here. Reconsider only if the existing on-call docs prove insufficient for this flip's profile.

#### RESOLVED: IR4 — Active human watch in the first post-flip hour not required
G9 confirms rollback authorities are *available* during the flip window, but "available" is weaker than "actively watching dashboards". The first 30–60 minutes post-flip are when most issues will surface; alarms are the safety net but a human eyes-on the synthetic monitor and CloudFront error rate accelerates detection significantly. Also load-bearing for IR2's decision to skip automated alarm routing — "manual watch" needs an explicit window.

**Resolution**: Added R31b requiring 60 minutes of active watch by R25c primary (or delegated engineer) post-swap. Active means dedicated attention with no other obligations and alarm checks at least every 5 minutes. Post-window watch cadence lives in the R31 runbook.

---

### Customer Support

#### RESOLVED: CS1 — Synthetic page user-visible content unspecified
R19a requires the body content to be static, but the spec didn't say *what that content is*. A blank page for ~50–500ms feels broken; a meaningless raw URL is worse; a brief "Loading CODAP…" message reassures the user that something is happening. The page title also affects the browser-tab title during the redirect moment.

**Resolution**: Added R19c pinning the `<title>`, body message, and `<noscript>` content. Layout deliberately trivial to stay well under the 10 KB budget.

#### RESOLVED: CS2 — Support diagnosis path for "my URL doesn't work" reports unspecified
After flip, support will field reports like "my old CODAP bookmark is broken". The spec defined all the rollback triggers but didn't describe a triage path for support to (a) classify whether the report is redirect-chain vs V3-app, (b) reproduce, (c) escalate.

**Resolution**: No new requirement added. R31 already obligates the flip-day runbook to contain a "support tier-1 diagnosis path" section. The specific diagnosis steps (reproduce in anonymous-window, inspect URL bar after redirect, distinguish redirect-didn't-fire from V3-app-failure, escalation contact) are operational detail that lives in the runbook, not in the requirements spec — locking them into requirements risks duplication that rots over time.

---

### Tech Writer

#### RESOLVED: TW1 — Requirement numbering with letter suffixes is hard to scan
The spec uses R20/R20a/R20b/R20c, R17/R17a, R19/R19a/R19b/R19c, R25/R25a/R25b/R25c, R26/R26a/R26b/R26c, R30/R30a, R31/R31b — letter suffixes added for items inserted during review. Readers grep for "R26" and have to mentally collate four items.

**Resolution**: Deferred to Phase 5 finalization. Renumbering now risks doing it twice (this review pass may add more requirements) and could break in-flight cross-references in Jira/PR comments. Added a numbering note at the top of the Requirements section so readers know what to expect in the meantime.

#### RESOLVED: TW2 — Background sibling-story status indicators are inconsistent
The Background section listed siblings with mixed status formats: `Status: ✅ Verified live 2026-05-19`, `Status: ✅ Merged (f58ead30e)`, `Status: confirm before flip`. The first two had concrete done-markers; the third was an action verb. A reader skimming the gating story couldn't tell at a glance whether CODAP-1326 and CODAP-1319 are done.

**Resolution**: Standardized to a fixed vocabulary (`✅ Done` / `⏳ In progress` / `❓ Confirm` / `🚫 Blocking`) declared in the Background section. All five sibling-story entries updated to use it. Date and commit/PR ref retained where available.

---

### FinOps

#### RESOLVED: Fin1 — Operating cost not documented
The spec mandates CloudFront Functions, CloudWatch alarms, a 1-minute synthetic canary, optional function logging, and 90+ days of archived-distribution retention.

**Resolution**: Skipped — cost documentation not needed in this spec. Individual costs are small and well-understood within the Concord Consortium AWS account; itemizing them here is overhead without a corresponding decision to inform. If a future cost surprise occurs (e.g., the canary exceeds expectations), it can be investigated then. The Fin2 decision below still applies, since `LOG_ENABLED` left on indefinitely could meaningfully accumulate independent of overall cost concerns.

#### RESOLVED: Fin2 — `LOG_ENABLED` lifecycle / volume cap unspecified
R23 says `LOG_ENABLED` defaults to false in committed source. If someone flips it on for debugging and forgets, log ingestion accumulates indefinitely.

**Resolution**: No new requirement added. R31 already obligates the flip-day runbook to contain a "`LOG_ENABLED` enable/revert protocol" section. The specific bounding rules (max-enablement window, revert-date tracking, verification check post-debug) are operational detail that lives in the runbook, not in the requirements spec — locking them into requirements risks duplication that rots over time. Same rationale as CS2.

---

### Re-review (after second-pass resolution)

#### RESOLVED: RR2 — CSP `default-src 'none'` blocks the inline `<style>` recommended in R19c
R19c (added in this pass) recommends trivial inline CSS (`body { font-family: sans-serif; text-align: center; padding: 2em; }`). But R20a's CSP is `default-src 'none'; script-src ...`. With `default-src 'none'` and no explicit `style-src`, inline `<style>` blocks AND `style=""` attributes are both blocked — the page would render unstyled.

**Resolution**: R20a's CSP value updated to add `style-src 'unsafe-inline'` (with `'sha256-<hash>'` as a stricter alternative if the build pipeline computes the style hash). The relaxation is narrow: only `script-src` and `style-src` may deviate from `default-src 'none'`; no other directives may be relaxed. This is the minimum CSP change to make R19c's styling work without otherwise broadening the policy.

---

## Self-Review (Third pass, 2026-05-19)

Calibrated review after two prior passes. Roles: Reliability Engineer + Skeptic, Penetration Tester / Red Team, Education Researcher / Teacher. Only genuine issues raised.

### Reliability Engineer + Skeptic

#### RESOLVED: REL1 — Synthetic monitor doesn't validate redirect correctness
R26b's synthetic monitor checks `https://codap.concord.org/app/` directly — the V3 entry point. This validates "is V3 reachable" but not "does the redirect chain still work." A logic bug or accidental CloudFront config drift that causes the function to return a wrong-but-200-OK destination URL (e.g., pointing to a different path that also happens to 200) would not trigger any alarm. The function-execution-error alarm catches *thrown* errors but not silent logic regressions.

RB3 ("R28 retested against production after the swap, fails to redirect") is the safety net, but it's a one-time manual check during the active-watch window. After the 60-minute active watch (R31b), there's no continuous validation of redirect correctness for the remainder of the 14-day soak.

**Resolution**: R26b's synthetic-monitor bullet split into two probes, each running every 1 minute: (1) the existing V3-reachability probe on `/app/`, and (2) a new redirect-correctness probe on `/app/static/dg/en/cert/index.html` that asserts the response is the synthetic redirect HTML. The second probe is the only continuous check that catches silent wrong-destination logic regressions. R26b's "All five alarms" verification clause updated to "All six checks (four CloudWatch alarms + two synthetic monitors)."

#### RESOLVED: REL2 — Soak window calendar timing may miss the actual stress test
R25a defines a 14-day minimum soak post-flip (2026-06-07 → 2026-06-21). The justification in Ops2 was "vacation, 2-week classroom cycles." But June 7 is end of US K-12 school year — most US classrooms wind down by mid-June, and the 14-day window lands during the school-year-end transition when classroom traffic is at a seasonal low. The first real stress test of the redirect (high-volume bookmark hits, embedded LARA URLs from class activities) happens in late August / early September when teachers return.

The current soak-exit criteria could be satisfied during a period of artificially low load, only for a post-soak surprise to surface in fall semester when the rollback option has already been deferred (R25a archives `E3H9X49AG3GYSO` for 90 more days, which ends ~2026-09 — still potentially before high-volume September usage stabilizes).

**Resolution**: Skipped — fall-semester check-in and seasonal-traffic validation are handled in another document (umbrella release plan / Concord Consortium operational docs). Not a gap in this requirements spec; locking calendar-bound criteria into the spec would duplicate planning that already lives elsewhere and risks the two documents drifting out of sync. No requirement change.

#### RESOLVED: REL3 — DNS rollback timing assumption may be optimistic
R24/R25 assume ~60s propagation based on the AWS-managed ALIAS TTL = 60s (verified via `dig`). But TTL is what authoritative servers *advertise*; it doesn't bind resolver behavior in the wild. ISP DNS, corporate resolvers, mobile carrier DNS, and aggressive caching forwarders frequently hold past TTL — sometimes minutes, occasionally an hour or more for misbehaving resolvers. During rollback, this means a tail of users continues to hit the new (broken) distribution for longer than 60s.

This doesn't invalidate the rollback approach, but the spec's repeated "~60s" framing (R24, R25, plus Technical Notes "Flip mechanism") may lead the operator to expect a sharper cutover than they'll observe. Worst case: rollback authority declares "rollback complete" at 60s, on-call disengages, but a small tail of users continues reporting issues for the next hour.

**Resolution**: R25 amended with an explicit "Propagation caveat" sentence: ~60s is the propagation *floor*, not the ceiling; real-world resolver caches commonly extend the tail to 1–5 minutes, occasionally 1+ hour for misbehaving resolvers; rollback "complete" status MUST be declared on the basis of error-rate metrics returning to baseline, not elapsed time alone. The Technical Notes "Flip mechanism" paragraph updated to cross-reference R25 rather than restate the bare "~60s" figure.

---

### Penetration Tester / Red Team

#### RESOLVED: PEN1 — Function failure behavior unspecified — exception in function could DoS attached cache behaviors
Nothing in the spec says what happens if the function itself throws (runtime error, malformed URI parsing, future code-change regression). CloudFront Functions at the viewer-request stage that fail return a 5xx to the user by default — the request does not fall through to origin. This means a malicious URL pattern that triggers a function exception could DoS all attached cache behaviors (`/app`, `/app/*`, `/releases/*`) for any user hitting that or related paths.

The current code surface is small and the BCP-47 regex is safe (no catastrophic backtracking), so the immediate risk is low. But (a) future code changes in the same file could introduce error paths, (b) CloudFront runtime occasionally surfaces "unexpected input" failures (e.g., a URI containing characters not in the runtime's accepted set), and (c) the function processes attacker-controllable input (the URI).

**Resolution**: Added R18b requiring the function's top-level handler to be exception-safe — the entire match-and-construct logic wrapped in try/catch so any uncaught error falls through to origin instead of producing a CloudFront-default 5xx. The `FunctionExecutionErrors` alarm still surfaces the underlying issue to ops; users observe a request that proceeds to origin rather than a hard failure.

---

### Education Researcher / Teacher

#### RESOLVED: EDU1 — Synthetic-page text is English-only for an internationally-used tool
R19c specifies the synthetic-page text in English: `<title>CODAP`, body message `Loading CODAP…`, and the `<noscript>` message (`"JavaScript is required to preserve your link's parameters. Click above to continue."`). For a tool that ships in 18+ languages and is used in international classrooms, this is a visible English-only moment during the redirect.

In practice, the impact is small: when JS works (≥99% of cases), the page is visible for ~50–500ms before navigation; the brief English flash is unlikely to be noticed or to cause confusion. The noscript fallback (JS disabled or blocked) is where users with a non-English V2 URL (e.g., a Spanish-speaking teacher's bookmark to `/app/static/dg/es/cert/...`) would actually read English text and follow an English instruction. That cohort is small but non-zero.

The tradeoff against localizing: localized strings add to function source size (R20b's 10 KB budget) and complicate the static-content-only constraint from R19a (the language selection itself becomes request-derived input, though it could be path-derived which is already constrained by R3's regex).

**Resolution**: Option (a) — accept English-only with rationale documented in R19c. Localizing the transient redirect page is not worth the size-budget cost and static-content-only complication given the briefness of the JS-enabled flash and the rarity of the noscript path. The decision and revisit trigger are now captured in a new "Localization" paragraph appended to R19c.

---

### Re-review (after third-pass resolution)

#### RESOLVED: RR3 — REL1 resolution cross-referenced R30 for a response-body marker, but R30 describes CloudWatch logs
The REL1 resolution suggested the redirect-correctness synthetic probe could look for "a known function-emitted tag from R30." R30 describes `console.log` output (CloudWatch logs), not response-body content. A synthetic HTTPS monitor inspects the response body, so the cross-reference was misleading.

**Resolution**: R26b's redirect-correctness probe bullet rewritten to specify that the marker MUST be body-level — either a known string from the inline JS (e.g., the literal `https://codap.concord.org/app/`) or a stable HTML comment compiled into the response body (e.g., `<!-- codap-redirect -->`). Specific marker is implementation detail; the requirement now clarifies *where* the marker lives.

No other issues found in the third-pass review pass. The spec is internally consistent with the new R18b (exception-safety), R25 propagation caveat, R26b two-probe synthetic monitor, and R19c localization rationale.

---

## Self-Review (Fourth pass, 2026-05-19)

Targeted review from two roles not previously used. Roles: WCAG Accessibility Expert, Plugin / Integration Author.

### WCAG Accessibility Expert

#### RESOLVED: WCAG1 — Synthetic page missing `<html lang>` attribute
R19c specifies the title, body text, `<noscript>` block, and trivial styling, but does not require the synthetic page's root `<html>` element to declare a `lang` attribute. WCAG 2.1 Success Criterion 3.1.1 (Language of Page, Level A) requires the default human language of each page be programmatically determinable. Without `<html lang="en">`:
- Screen readers fall back to the user's OS/browser default language for pronunciation rules — a Spanish-system screen reader speaking "Loading CODAP…" with Spanish phoneme rules sounds garbled.
- Automated accessibility scanners flag the page as failing WCAG 3.1.1.
- Translation tooling (e.g., browser auto-translate prompts) can't make the right decision.

Impact is limited by the page's brief lifetime (~50–500ms when JS works) but is non-trivial on the noscript path where the user reads the English text actively. Cost to fix is one attribute on one element. EDU1 already accepted English-only content; adding `lang="en"` is the standards-compliant way to declare that.

Suggested resolution: R19c amended to require `<html lang="en">` on the synthetic page. Implicit assumption is that the function's static HTML template starts with `<!DOCTYPE html><html lang="en">…`.

**Resolution**: R19c amended with a bullet requiring `<html lang="en">` on the synthetic page, with a note that the attribute updates if a future iteration is localized.

---

### Plugin / Integration Author

#### RESOLVED: PLUG1 — Iframe-sandboxed embeds without `allow-scripts` fall into the non-preserving noscript path
R19b acknowledges the JS-disabled / JS-blocked cohort as <<1% of users. That estimate is reasonable for top-level navigation, but iframe sandboxing is a distinct and more common case for embedded contexts. An Activity Player or LARA page that embeds CODAP via:

```html
<iframe sandbox="allow-same-origin" src="https://codap.concord.org/app/static/dg/en/cert/index.html?launchFromLara=true#shared=xyz">
```

…cannot run the synthetic page's inline `<script>` because `allow-scripts` is not granted. The browser silently blocks the script, and the iframe renders the `<noscript>` fallback — which is non-preserving (hash and query dropped per R19b). The result: the embedded CODAP loses `launchFromLara=true` and `#shared=xyz`, breaking the embed in a way that's silent to the parent page.

This is invisible to R26b's synthetic monitors (which probe top-level navigation, where JS runs). It's invisible to R28's positive matrix unless an iframe-embed test case is added. It would manifest as user-reported breakage during the soak — likely classified as a V3-app issue (RB-borderline "individual broken URLs") rather than a redirect issue, delaying root-cause diagnosis.

Mitigations to consider:
- (a) Add an iframe-embed test row to R28 covering an Activity-Player-shaped embed with hash+query, to catch this before flip.
- (b) Add operational guidance: post-flip, audit any LARA / AP integrations that embed CODAP via sandboxed iframes; recommend they grant `allow-scripts` or migrate to V3 URLs directly.
- (c) Accept the risk as out-of-spec — embed-sandbox configuration is integrator responsibility, and post-flip follow-up "LARA / Activity Player library entries" (Out of Scope) already commits to updating embedded V2 URLs.

Suggested resolution: (a) plus a documentation note in Background or Technical Notes that sandboxed-iframe embeds without `allow-scripts` are a known non-preserving case (in addition to top-level JS-disabled per R19b).

**Resolution**: R19b extended with an explicit acknowledgement that sandboxed-iframe embeds without `allow-scripts` are an additional non-preserving case, with the scope of affected integrators called out and a pointer to the post-flip LARA/AP library URL update that eliminates it. The broader iframe-embed test gap is handled in PLUG3 below.

#### RESOLVED: PLUG2 — HEAD request response-body behavior unspecified
R18a requires the function to intercept `GET` and `HEAD` requests and produce a synthetic response. CloudFront Functions' synthetic-response construction always includes a body — but per HTTP semantics, a HEAD response MUST NOT include a body (RFC 9110 §9.3.2). CloudFront's behavior here is to strip the body for HEAD responses while preserving headers and status, but the spec doesn't say which way it expects the function to handle this:

- The function could construct the same response object for GET and HEAD; CloudFront strips the body on HEAD. (Most likely the actual behavior.)
- The function could branch on method and construct a body-less response for HEAD.
- The function could fall through to origin for HEAD (treating HEAD as not-redirected).

Each option has different operational implications:
- Probes / link-checkers / monitoring tools that send HEAD to V2 URLs would receive `200 OK` with the synthetic redirect headers — they do NOT navigate, so the user / tool sees `200 OK` for the V2 URL and considers it healthy. This may mask real issues if a probe was meant to detect that the V2 URL became unreachable.
- A link-checker that sends HEAD and follows on `200`, then sends GET, would see the synthetic HTML+JS and the redirect would not fire (no JS evaluation in a link-checker context).

Suggested resolution: R18a amended to explicitly state HEAD requests return the same status code and headers as GET, with body omitted per HTTP semantics (which CloudFront handles automatically). Add a brief note that HEAD probes by external monitoring / link-checker tools will see `200 OK` post-flip for V2 URLs and should be retargeted to V3 URLs if they were meant to detect V2 reachability specifically.

**Resolution**: No spec change. RFC 9110 §9.3.2 is the authority for HEAD body semantics and CloudFront conforms automatically — restating that in the spec is duplication that rots. The operational implication (HEAD-based external monitoring of V2 URLs sees `200 OK` post-flip) is identical to the GET case and is covered by the same migration consideration that applies to all V2-URL-aware infrastructure; it's not a redirect-function concern. R18a already says HEAD is intercepted, which is the only behavior the function itself controls.

#### RESOLVED: PLUG3 — R28 positive test matrix doesn't include iframe-embed cases
R28 enumerates URLs to test but is implicit about test mode — every entry reads as top-level navigation. Activity Player and LARA-embedded CODAP load via iframe, which differs from top-level navigation in several ways the redirect interacts with:

- Iframe load events fire differently; the parent page may have logic that depends on the iframe's `src` stabilizing.
- iframe-phone (postMessage-based RPC between CODAP and its embedder) must re-handshake after the iframe navigates from `/app/static/dg/...` → synthetic redirect → `/app/`. Messages sent by the parent during the ~50–500ms synthetic-page window are lost.
- Iframe sandbox attributes (see PLUG1) change the redirect's behavior.

PLUG1 covers the worst-case (sandbox without `allow-scripts`). PLUG3 is the broader gap: R28 / R29 should include at least one explicit iframe-embed case so that:
- The iframe-phone re-handshake is exercised pre-flip.
- The iframe's `src` ends up at `/app/...` and the parent page (test harness) sees the expected sequence.
- The redirect-correctness synthetic monitor (R26b) has a known-good baseline for the embed flow it doesn't directly cover.

The Drive double-click case in R27/R28 is a top-level-navigation flow originating from outside CODAP, not an iframe embed.

Suggested resolution: R28 amended to add an iframe-embed test row — embed `/app/static/dg/en/cert/index.html?launchFromLara=true#shared=xyz` in a minimal test harness page, verify the iframe ends up at `/app/?launchFromLara=true#shared=xyz` (English path: no `?lang=`) with iframe-phone re-handshake completing. R29 could optionally add a sandboxed-iframe row (per PLUG1).

**Resolution**: R28 amended to add an iframe-embed test row with both English (no `?lang=`) and non-English (e.g., `fr`, with `?lang=fr`) variants. iframe-phone re-handshake against the V3 page is part of the assertion. *(Superseded by QA-I3, 2026-05-22: the iframe-phone re-handshake assertion was removed as out of scope for the redirect function — R28's iframe row now asserts only the post-redirect URL in an iframe context.)* R29 not extended for the sandboxed-iframe variant — PLUG1's R19b acknowledgement plus the post-flip LARA/AP URL update is sufficient operational coverage, and adding a sandboxed-iframe test row would couple this spec to AP/LARA-specific integration details that belong in those projects' test suites.

---

## Self-Review (Fifth pass, 2026-05-22)

Calibrated review of a mature spec (four prior passes, all resolved). Roles: Spec Consistency Auditor, Senior Engineer (fresh eyes), Security Engineer (fresh eyes), DevOps / Cutover Coordinator (fresh eyes). Only genuine issues raised; severity noted in each title.

### Spec Consistency Auditor

#### RESOLVED: CA1 (minor) — Q7 decision text cites "(R29)" for the log rule-tag; should be R30
Q7's Decision (the `LOG_ENABLED` resolution) says the function "emits a single `console.log` line per fire including source URI, destination URL, and a short rule tag (R29)." The rule-tag content is defined by **R30** ("a short tag identifying which match rule fired"); **R29** is the negative test matrix. R23 correctly cites R30 — only Q7's Decision is stale (likely a pre-renumbering artifact).
**Why it matters**: A reader following the cross-reference lands on the wrong requirement.
**Suggested resolution**: In Q7's Decision, change "(R29)" → "(R30)".
**Resolution**: Applied — Q7's Decision now cites (R30).

#### RESOLVED: CA2 (minor) — Q7 decision text references the superseded `ENABLED` gate as a live workflow
Q7's Decision closes with: "Flipping the flag for short windows (flip day, debugging) is a republish, same workflow as the `ENABLED` gate." The `ENABLED` gate came from Q2, which is **SUPERSEDED** by Q6 — R22 states "No in-function `ENABLED` constant is required." Describing `LOG_ENABLED`'s workflow by analogy to a constant that no longer exists is stale.
**Why it matters**: Implies a gating mechanism the spec elsewhere removed; confusing to anyone reading Open Questions top-to-bottom.
**Suggested resolution**: Reword the sentence to describe the republish workflow directly (e.g., "...is a function republish + redeploy") without referencing the `ENABLED` gate. The options-considered list may keep its historical mention.
**Resolution**: Applied — Q7's Decision now describes the edit-and-republish workflow directly; the options-considered list keeps its historical `ENABLED`-gate mention.

#### RESOLVED: CA3 — G5 go/no-go gates only "CloudWatch alarms"; R26b requires all six checks verified before flip
G5 reads: "CloudWatch alarms per R26b are deployed and have been verified to fire on a synthetic error." But R26b's closing paragraph requires "All six checks above (four CloudWatch alarms + two synthetic monitors) MUST have been verified to fire on a synthetic error before the flip." The two synthetic HTTPS monitors are not "CloudWatch alarms" — G5 as worded does not gate them, even though R26b says they must be verified pre-flip. (G5 also predates the REL1 split that introduced the second monitor.)
**Why it matters**: The go/no-go checklist should mirror R26b exactly; as written, a flip could be declared "go" with the synthetic monitors unverified.
**Suggested resolution**: Reword G5: "All six checks per R26b (four CloudWatch alarms + two synthetic monitors) are deployed and have been verified to fire on a synthetic error."
**Resolution**: Applied — G5 now gates all six R26b checks.

#### RESOLVED: CA4 (minor) — IR1 resolution narrative describes R31 content that doesn't match R31 as written
IR1's Resolution narrative says the R31 runbook contains "time-to-detect/decide/execute targets (IR3)". But IR3 was **Skipped** ("out of scope... covered by existing Concord Consortium operational docs"), and R31's actual bullet list contains only "A pointer to existing CC operational / on-call docs covering detection and rollback response timing" — a pointer, not targets. The IR1 narrative was not updated when IR3 was skipped.
**Why it matters**: The decision-log narrative contradicts both the IR3 decision and the live R31 text.
**Suggested resolution**: Edit IR1's Resolution to say R31 contains "a pointer to existing CC operational / on-call docs for detection/rollback timing (IR3)" instead of "time-to-detect/decide/execute targets (IR3)".
**Resolution**: Applied — IR1's Resolution narrative now matches the IR3 decision and R31's live text.

---

### Senior Engineer (fresh eyes)

#### RESOLVED: SE-F1 — English-detection rule for R2-vs-R3 routing is unspecified (including case)
The function extracts `{lang}` from `/app/static/dg/{lang}/cert/...` (and the `/releases/...` equivalent) and must decide: route per **R2** (English — destination `/app/` with no `?lang=`) or per **R3** (non-English — append `?lang={lang}`). R2 names `en`; R3 says "non-English `{lang}`". The spec never states the actual decision rule, nor whether the `en` test is case-sensitive. R3 says case is "preserved verbatim" in the `?lang=` value, so `/app/static/dg/EN/cert/...` and `/app/static/dg/En/cert/...` are reachable shapes — would the function treat `EN` as English (R2, no `?lang=`) or non-English (R3, `?lang=EN`)? V2 also aliases `en`/`en-US`; is `en-US` "English" for R2?
**Why it matters**: This is a real branch in the function logic. Practical impact is small (V2 used lowercase `en` exclusively), but the function author currently has to guess — and the spec set a precedent of pinning matching rules precisely (SE2, SE4).
**Suggested resolution**: Add a sentence to R2 (or R3) stating the rule explicitly, e.g.: "The function treats a path `{lang}` segment as English (R2, no `?lang=`) iff it case-insensitively equals `en` or `en-US`; every other BCP-47-shaped `{lang}` is non-English (R3)."
**Resolution**: Applied option (a) — R3 now states the function treats a path `{lang}` as English (R2, no `?lang=`) iff it case-insensitively equals `en` or `en-US`, with all other BCP-47-shaped codes non-English (R3); the rule applies equally to R5.

#### RESOLVED: SE-F2 — Path templates for R2/R3/R4/R5 are given by example only, unlike `{lang}`/`{name}`
SE2 pinned the `{lang}` sub-pattern (`^[A-Za-z]{2,3}(-[A-Za-z]{2,4})?$`) and SE4 pinned `{name}` (`^[^/]+$`), but the *surrounding* path templates the function must match — `/app/static/dg/{lang}/cert/...`, `/releases/{name}/...`, `/releases/{name}/static/dg/{lang}/cert/...` — are specified only through examples and prose. Open details: is the literal frame `static/dg/<lang>/cert` matched exactly; is a trailing path after `cert` required or optional; does `/app/static/dg/fr/cert` (no trailing `/` or file) match; is matching anchored at the start of the path?
**Why it matters**: Whether a path redirects or falls through to origin is security- and correctness-relevant (R29's negative matrix depends on it). The spec pinned the *inner* capture groups but left the *frame* informal — an inconsistency in precision.
**Suggested resolution**: Either pin the full path-match patterns in R2/R3/R4/R5, or add an explicit note that the full path regexes are delegated to implementation.md while `{lang}`/`{name}` shapes are fixed here. (A delegation note is the lighter-weight option for a requirements doc.)
**Resolution**: Applied the delegation note. A "Path-matching precision" paragraph in the Redirect mapping intro fixes the `{lang}`/`{name}` capture-group patterns here and delegates the full multi-segment path patterns to implementation.md, with R28/R29 as the conformance bar.

---

### Security Engineer (fresh eyes)

#### RESOLVED: SEC-F1 — R20a's preferred `script-src 'sha256-<hash>'` is incompatible with the per-request `{lang}` baked into the inline script
R20a (after Sec4) prefers `Content-Security-Policy: ... script-src 'sha256-<hash-of-inline-script>'`, on Sec4's stated rationale: "Since R19a requires the script to be static (no request-derived content), its SHA-256 hash is known at build time." That rationale misreads R19a. R19a constrains the **user-visible body text** to be static and forbids request-derived data in the **DOM** — it does *not* require the inline `<script>` to be byte-static. R21a explicitly says the path-extracted `{lang}` is "embedded into the synthetic HTML/JS response body" and "JS-string-escaped" — i.e. `{lang}` is baked into a JS string literal in the inline script. Therefore the script's bytes (and its SHA-256) **vary per `{lang}`**, and a single build-time hash validates only one language. For R3/R5 (lang) redirects the `'sha256-'` CSP would block the script in every language but one; only R1/R2/R4 (no-lang) redirects have a byte-stable script.
**Why it matters**: R20a presents `'sha256-'` as the preferred, stricter policy. As the rest of the spec is written it does not work for lang redirects — a flip relying on the "preferred" CSP would break non-English redirects, or silently fall back to `'unsafe-inline'` per-case, making the CSP vary by redirect type.
**Suggested resolution**: Pick one and state it in R20a + correct Sec4's rationale:
(a) Standardize on `script-src 'unsafe-inline'` (already R20a's accepted fallback) and drop the `'sha256-'` preference — simplest; or
(b) Require the function to keep the inline `<script>` byte-static by passing `{lang}` through a non-script channel the static script reads (e.g., a `<link rel="canonical">` or `<meta>` whose attribute value is the BCP-47-constrained, escaped `{lang}` — not user-visible, so compatible with R19a). Then one build-time `'sha256-'` hash covers all redirects.

**Resolution**: Adopted option (a). R20a's CSP updated to specify `script-src 'unsafe-inline'`; the `'sha256-'` preference for the script is withdrawn. R20a's rationale now states that the inline script carries the per-request `{lang}` (R21a) and so has no build-time-stable hash. Sec4's Resolution annotated to record that its premise misread R19a. `style-src` is unchanged — the page CSS is genuinely static, so `style-src 'sha256-<hash>'` remains a valid stricter alternative there. Residual XSS defense is unchanged and adequate: `default-src 'none'`, R19a's static-body rule, and R21a's escaping.

#### RESOLVED: SEC-F2 — R20a assumes HSTS "is already set by CloudFront"; verify it survives the origin swap on the clone
R20a omits `Strict-Transport-Security` from the function's synthetic response "because HSTS is already set by CloudFront for the domain." The new distribution is a *clone* whose `/app`, `/app/*`, and `/releases/*` behaviors have their **origin swapped** from `codap server` (V2) to V3 S3 (R26). If HSTS on the current distribution is emitted by the **V2 origin** rather than by a CloudFront **response-headers policy**, then (a) the swapped behaviors lose HSTS once they point at V3 S3, and (b) the function's synthetic redirect response never had it. The clone procedure (R26a) copies cache behaviors and their policy associations, so HSTS survives *only if* it is a response-headers-policy header.
**Why it matters**: Silently dropping HSTS on `codap.concord.org` post-flip is a security regression, and it is exactly the kind of difference the R26a structured diff is meant to catch but won't if it only diffs the documented allowlist.
**Suggested resolution**: Add to R26a's verification (or R26c's audit) an explicit check that HSTS — and any other security response headers currently served — are applied via a CloudFront response-headers policy that the clone carries onto the V3-origin behaviors and onto the function's synthetic response; if HSTS is origin-emitted today, add a response-headers policy as part of this story.
**Resolution**: Applied — R26a's verification step now requires an actual response-header check confirming HSTS (and other security headers) are response-headers-policy-based, not origin-emitted, and puts adding a policy in scope if they are not.

#### RESOLVED: SEC-F3 (minor) — requirements.md (public repo) embeds infrastructure identifiers
requirements.md is checked into the public `concord-consortium/codap` repo and embeds the AWS account ID (`612297603577`, in the ACM ARN), CloudFront distribution IDs, the Route 53 hosted-zone ID `Z2P4W3M7MDAUV6`, the CloudFront domain `d13zmjbnp90bac.cloudfront.net`, and the ACM certificate ARN.
**Why it matters**: None of these are credentials and exposure risk is low, but AWS account IDs and resource IDs are sometimes treated as semi-sensitive (they aid reconnaissance). Worth a conscious decision rather than an accident.
**Suggested resolution**: Confirm this is acceptable for the public repo (it generally is). If not, move the concrete IDs into the implementation spec / runbook and reference them indirectly here. No change if accepted — record the decision.
**Resolution**: Accepted as-is — a deliberate decision. The AWS account ID, distribution IDs, hosted-zone ID, CloudFront domain, and ACM ARN are infrastructure *identifiers*, not credentials; they cannot be used without separate AWS authentication, and their presence makes this spec a precise, self-contained design record. No edits to the identifiers.

---

### DevOps / Cutover Coordinator (fresh eyes)

#### RESOLVED: DO-F1 (major) — The flip is not DNS-only: the `codap.concord.org` CNAME alias must be moved between distributions, which modifies `E3H9X49AG3GYSO`
R22/R24/R25 and the "Flip mechanism" Technical Note all frame flip day as a single Route 53 ALIAS swap with "No CloudFront-config change required" and `E3H9X49AG3GYSO` "preserved untouched." This is not achievable as written. CloudFront serves an HTTPS request only if the request's `Host` is listed in the distribution's **alternate domain names (`Aliases`/CNAMEs)**; a domain that is not an alias of the distribution gets a `403 — Bad request` regardless of DNS. The clone procedure (step 2) deliberately *removes* `codap.concord.org` from the new distribution's `Aliases`. So after the Route 53 swap, `codap.concord.org` resolves to the new distribution but the new distribution does not accept it → every request 403s.
To fix that, `codap.concord.org` must be added to the new distribution's `Aliases`. But a CNAME can be associated with only one distribution at a time (`CNAMEAlreadyExists`), so it must first be removed from `E3H9X49AG3GYSO` — e.g., via `aws cloudfront associate-alias`, which moves the alias and **modifies `E3H9X49AG3GYSO`**. The same is true in reverse for rollback: the alias must be moved back before `E3H9X49AG3GYSO` can serve `codap.concord.org` again. There is also an ordering-sensitive window (alias move vs. DNS change) where one side briefly 403s.
**Why it matters**: This is a load-bearing flip-day assumption. As specified, the flip would fail at the moment of the Route 53 swap. R22's "no modifications to E3H9X49AG3GYSO," R24's "no CloudFront-config change at flip time," R25's clean DNS-only rollback, and R31's runbook command list are all incorrect or incomplete.
**Suggested resolution**: Add a requirement (and revise R22/R24/R25 + the "Flip mechanism" note + R31) covering the alias move: flip = `associate-alias` (or remove-then-add) moving `codap.concord.org` to the new distribution **plus** the Route 53 ALIAS change; rollback = both reversed. Accept that `E3H9X49AG3GYSO`'s `Aliases` are modified by the flip (it is otherwise preserved). Pin the ordering of alias-move vs. DNS-change in the R31 runbook to minimize the 403 window, and add the `associate-alias` invocations to R31's command list. Re-validate the "~60s propagation" expectations against this two-step procedure.

**Resolution**: Adopted the `associate-alias` approach. Added **R24a** specifying the CNAME alias move (`aws cloudfront associate-alias`) as flip-day step 1, mandated before the Route 53 swap (step 2) so the inconsistency window is bounded by DNS propagation rather than CloudFront config propagation. Revised **R22** (E3H9X49AG3GYSO modified only by the alias move), **R24** (two-step flip), **R25** (rollback reverses both steps in order). Updated the "Flip-day mechanism" Technical Note, **R31**'s runbook command list, and the **Overview** / **Project Owner Overview**. The brief `403` window between the two steps is acknowledged as unavoidable for the clone+swap approach and accepted; the flip is scheduled in a low-traffic window (CODAP-1322) to minimize impact.

#### RESOLVED: DO-F2 — Pre-flip synthetic monitors as specified probe the old V2 distribution and cannot run green before the flip
R26b specifies the two synthetic monitors against `https://codap.concord.org/app/` and `https://codap.concord.org/app/static/dg/en/cert/index.html`, and G5 requires them "deployed and verified" before the swap. But pre-flip `codap.concord.org` still resolves to `E3H9X49AG3GYSO` (V2). The redirect-correctness probe would assert the synthetic-redirect HTML and instead get V2's real page; the V3-reachability probe would assert a V3 marker and get V2. Both fail until the flip happens.
**Why it matters**: R27 runs all other validation against the temp subdomain, but R26b hard-codes `codap.concord.org` for the monitors and doesn't say what they target pre-flip — leaving a gap between "monitors verified pre-flip" (G5) and "monitors as written can't be green pre-flip."
**Suggested resolution**: State in R26b that pre-flip the synthetic monitors target the temp subdomain (consistent with R27), and are re-pointed to `codap.concord.org` as part of the flip procedure (R31 runbook). Clarify that G5's "verified to fire on a synthetic error" is a one-time induced-error check distinct from steady-state green probing.
**Resolution**: Applied — R26b now states the synthetic monitors target the temp subdomain pre-flip and are re-pointed at `codap.concord.org` during the flip (R31), and clarifies that G5's "verified to fire" is the one-time induced-error check.

#### RESOLVED: DO-F3 — `/releases/staging` carve-out may be the wrong shape if `staging` is a release tree, not a file
R10 / R26 carve out `/releases/staging` as an **exact-match** cache behavior → `codap server` (V2). R10 calls it a "staging environment alias." If `staging` is a release *tree* (like `latest` — a whole build directory), then deep paths `/releases/staging/...` (e.g. `/releases/staging/static/dg/en/cert/index.html`) are *not* caught by the exact `/releases/staging` behavior; they match `/releases/*`, hit the redirect function, and get redirected to V3 — breaking the V2 staging environment. By contrast R11/R12 correctly use wildcard carve-outs (`/releases/zips/*`, `/releases/var/*`) for directory paths, and R9/R13 use exact-match for genuine single files.
**Why it matters**: If `staging` is a tree, the spec silently breaks the V2 staging environment at flip; R29's negative matrix only tests bare `/releases/staging`, so it wouldn't catch it.
**Suggested resolution**: Determine whether `/releases/staging` is a single file or a release tree (quick check against the V2 origin). If a tree, change the carve-out to `/releases/staging` **and** `/releases/staging/*` in R10/R26, and add a deep `/releases/staging/...` row to R29's negative matrix.
**Resolution**: Confirmed via live probe 2026-05-22 — `/releases/staging/` and `/releases/staging/static/dg/en/cert/index.html` both return 200, so `staging` is a release tree. Applied: R10 updated with the verification and the two-behavior carve-out, R26's carve-out list now includes `/releases/staging/*`, and R29's negative matrix adds `/releases/staging/static/dg/en/cert/index.html`.

#### RESOLVED (withdrawn): DO-F4 — `/v3` / `/v3/*` (Q13 = A) folds an unbounded sub-scope into a date-critical flip story
Q13 was resolved **A** — add `/v3` and `/v3/*` version-pinned behaviors as part of this story — while Q13 itself notes `/v3/*` "is not strictly required for the V2 → V3 cutover" and that "if [the V3 build doesn't already produce a version-pinned artifact], the build/deploy plumbing is in scope here too." That conditional drags a potentially significant V3 build-system change into a story whose defining constraint is a fixed flip date (2026-06-07), and no G-criterion gates `/v3/*` readiness.
**Why it matters**: Date-driven cutover stories are where scope creep is most dangerous. An unbounded, ungated sub-task that the spec admits is non-essential to the cutover is a schedule risk to the part that *is* essential.
**Suggested resolution**: Reconsider Q13 against flip-date pressure — prefer option B (sibling story for `/v3/*`) so the cutover-critical work is not coupled to the version-pinning build change; or, if keeping A, add a G-criterion (or explicit waiver) for `/v3/*` readiness and time-box the build-plumbing investigation with a fallback to "defer `/v3/*`" if it proves large.
**Resolution**: Withdrawn — not a genuine issue. The V3 lead confirmed `/v3` is a bounded entry point that serves the V3 app the same way `/app/` does (document state in URL hash parameters, no V2-style deep redirect paths); standing it up is CloudFront-config + deploy work, not a build-system change. The finding's "unbounded sub-scope / schedule risk" premise rested on Q13's speculative "may require build/deploy plumbing" hedge, which was itself misleading. Q13's Decision text and R26's `/v3` bullet have been tightened to drop that hedge and state the bounded scope; no G-criterion or sibling-story split is needed.

#### RESOLVED: DO-F5 (minor) — Post-flip cleanup omits the temp subdomain; soak sign-off parties may collapse to one person
Two small coordination gaps: (1) The post-flip follow-up list (Out of Scope / CC4) covers removing the temp-subdomain *Drive authorization* but not the temp-subdomain **Route 53 record** nor the temp-subdomain entry in the (now-production) new distribution's **`Aliases`** — both linger after the soak. (2) R25a requires soak sign-off by "Engineering lead and rollback decision authority (R25c)," but R25c defines the CODAP V3 engineering lead *as* the primary rollback authority — so the two named parties may be the same person unless "rollback decision authority" here means the R25c *secondary*.
**Why it matters**: Open cleanup loops and an ambiguous sign-off quorum are exactly the coordination details a cutover review should close.
**Suggested resolution**: (1) Add "remove temp-subdomain Route 53 record and the temp-subdomain alias from the new distribution" to the post-flip follow-up list. (2) Clarify R25a — e.g., "sign-off by the engineering lead and at least one other of: the R25c secondary authority, the release coordinator" — so the quorum is two distinct people.
**Resolution**: Applied both — a temp-subdomain removal item (Route 53 record + new-distribution `Aliases` entry) added to the post-flip follow-up list, and R25a's soak sign-off reworded to require the engineering lead plus a distinct second signer (R25c secondary or release coordinator).

---

### Re-review (after fifth-pass resolution)

Fresh scan of the spec after the fifth-pass issues were resolved, checking for problems introduced by the resolutions themselves.

#### RESOLVED: RR4 — R26a's new HSTS check has a garbled cross-reference
The SEC-F2 resolution added text to R26a ending "(Closes SE-F2's sibling concern SEC-F2: ...)". SEC-F2 is a Security Engineer finding and is not a "sibling" of SE-F2 (a Senior Engineer finding) — the phrasing is wrong.
**Suggested resolution**: Change the parenthetical to a plain reference, e.g. "(Per SEC-F2, fifth-pass review: R20a's 'HSTS is already set by CloudFront' assumption holds only if HSTS is policy-based.)"
**Resolution**: Applied.

#### RESOLVED: RR5 — R4's carve-out summary lists `staging` without the `/*` subtree
The DO-F3 resolution made `staging` a subtree carve-out (`/releases/staging` **and** `/releases/staging/*`) in R10 and R26, but R4's inline carve-out summary parenthetical still reads "(`.gapikey`, `staging`, `zips/*`, `var/*`, `apple-touch-icon.png`)" — `staging` without `/*`, inconsistent with the sibling subtree entries `zips/*` and `var/*`.
**Suggested resolution**: Update R4's parenthetical to "`staging`, `staging/*`" for parallelism. (R26 remains the authoritative carve-out list.)
**Resolution**: Applied — R4's parenthetical now lists `staging`, `staging/*`.

#### RESOLVED: RR6 — Clone step 2's "or leave empty" contradicts R24a and the temp-subdomain validation path
Technical Notes clone step 2 says to set the clone's `Aliases` to "the temp subdomain or leave empty to use the auto-generated `*.cloudfront.net` domain." But the temp subdomain must be in the clone's `Aliases` for HTTPS to work on it — and HTTPS on the temp subdomain is required by R27 Path A and clone step 6a (Drive validation). R24a now also firmly states the clone "carries only the temp subdomain." So "leave empty" is not a viable option.
**Suggested resolution**: Drop "or leave empty..." from clone step 2; state the clone's `Aliases` is set to the temp subdomain, required for HTTPS pre-flip validation (R27 / step 6a).
**Resolution**: Applied — clone step 2 now sets the clone's `Aliases` to the temp subdomain unconditionally.

**Considered, no change**: R28's positive matrix does not exercise `en-US` as an English code now that SE-F1 named it explicitly — but V2 never shipped an `en-US` build, so such a path effectively never occurs in the wild; not worth a test row.

---

## Self-Review (Sixth pass, 2026-05-22)

Calibrated review of a mature spec (five prior passes, all resolved). Roles: Reliability Engineer (fresh eyes), DevOps / Cutover Coordinator (fresh eyes), QA Engineer (fresh eyes), Performance Engineer (fresh eyes), Customer Support (fresh eyes). Only genuine issues raised; severity noted in each title.

### Reliability Engineer (fresh eyes)

#### RESOLVED: REL-F1 (major) — R18b's claim that `FunctionExecutionErrors` surfaces caught exceptions is incorrect; the try/catch creates a silent observability blind spot

R18b wraps the function's match-and-construct logic in a top-level try/catch so an internal error "falls through to origin (returns the original `request`) rather than producing a CloudFront-default 5xx," and asserts: "The `FunctionExecutionErrors` alarm in R26b still surfaces the underlying error to ops."

That assertion does not hold. `FunctionExecutionErrors` is a CloudFront metric that counts function executions that *fail at the runtime level* — the function throws an uncaught error, times out, or returns an invalid object. A try/catch that catches an internal error and returns a valid `request` object is, from CloudFront's perspective, a **successful** execution: the metric stays at 0 and the R26b alarm never fires — for exactly the class of errors R18b is designed to handle (errors *inside* the wrapped logic). Only errors *outside* the try/catch would still register.

Compounding this: R30 emits a `console.log` line only on a successful match, and only when `LOG_ENABLED = true` (default false in committed source, R23). So in production a caught exception produces **no metric and no log** — it is completely silent. A future code-change regression that throws on a common input would be invisible: users silently get origin (a V3 S3 404 instead of their redirect) with no signal to ops.

**Why it matters**: The defense-in-depth in R18b is sound (better to serve origin than a hard 5xx), but the spec believes it retains an alarm it does not. The fifth-pass PEN1 resolution that introduced R18b traded a loud failure mode for a silent one without noticing.

**Suggested resolution**: Two parts. (1) Correct R18b's prose — drop or qualify the claim that `FunctionExecutionErrors` surfaces caught exceptions; note that caught-and-handled errors do not register on that metric. (2) Require the catch block to emit a `console.log` (or `console.error`) **unconditionally** — independent of `LOG_ENABLED` — so a caught exception always leaves a CloudWatch Logs trace even in production; extend R30 to cover that exception-path log line (distinct tag, e.g. `"error-fallthrough"`). Optionally note that a CloudWatch Logs metric filter on that log line restores a real alarm signal for caught exceptions.

**Decision**: All three parts applied. (1) R18b's prose corrected — it now states that a caught-and-handled error returns a valid `request`, is counted by CloudFront as a successful execution, and does **not** register on `FunctionExecutionErrors`. (2) R18b now requires the catch block to emit a `console.log` / `console.error` line per caught exception unconditionally (independent of `LOG_ENABLED`); R30 extended to specify that line — fixed tag `"error-fallthrough"`, source `request.uri`, always emitted — and noted as the only function-emitted log line not gated by `LOG_ENABLED`. (3) R26b gains a fifth CloudWatch alarm: a Logs metric filter on the `"error-fallthrough"` tag (> 0 sustained 1 minute → high-severity), the caught-exception counterpart to `FunctionExecutionErrors`. R26b's closing paragraph and G5 updated from "six checks (four CloudWatch alarms…)" to "seven checks (five CloudWatch alarms…)". Prior-pass decision-log narratives (REL1, CA3) that cite the older counts are left as historical record per the TW1 numbering note.

---

### DevOps / Cutover Coordinator (fresh eyes)

#### RESOLVED: DO-F6 (major) — R24a's "~60s" inconsistency window silently assumes the `associate-alias` deployment is fully propagated before the Route 53 swap; the spec never requires waiting for it

R24a establishes flip step 1 = `aws cloudfront associate-alias` (move the `codap.concord.org` CNAME onto the new distribution) and step 2 = the Route 53 ALIAS swap, and reasons that doing step 1 first "bounds the unavoidable inconsistency window to Route 53 propagation (~60s + resolver tail, R25), whereas swapping DNS first would expose a longer window bounded by CloudFront config propagation."

That reasoning treats step 1 as instantaneous. It is not. `associate-alias` modifies the `Aliases` of *both* distributions; each transitions to `InProgress` and must redeploy before the change is live at all edge locations. R24a says step 1 "MUST precede" step 2 — but "precede" is ambiguous between *submitted before* and *fully deployed before*. If the operator runs the two AWS calls back-to-back (the natural reading of a two-line runbook command list), the Route 53 swap can land while the new distribution has **not yet finished** adding the alias — so `codap.concord.org` resolves to the new distribution while the new distribution still `403`s it. The window is then bounded by CloudFront config-propagation time (minutes), i.e. *exactly the longer window R24a claims its ordering avoids*.

**Why it matters**: This is a load-bearing flip-day timing assumption. The "alias-first" rationale only delivers the ~60s window if step 1 is confirmed `Deployed` before step 2. As written, a correct-looking runbook could produce a multi-minute outage. The same applies to rollback (R25), which reverses the two steps.

**Suggested resolution**: Amend R24a (and R25) to state explicitly that step 2 (Route 53) MUST NOT be issued until the `associate-alias` change has reached `Deployed` status on the new distribution (and ideally the old one) — e.g., gated by `aws cloudfront wait distribution-deployed`. Add that wait as an explicit step in R31's runbook command list, between the `associate-alias` invocation and the `change-resource-record-sets` invocation, for both the forward flip and the rollback.

**Decision**: All four parts applied. **R24a** now states that `associate-alias` is itself a propagating distribution-config change (both distributions go `InProgress` and redeploy), that step 2 MUST NOT be issued until the change reaches `Deployed` on the new distribution, and that this wait — not the bare ordering — is what bounds the inconsistency window to DNS propagation; issuing step 2 early would expose the longer CloudFront-config-propagation window. **R25** gains the symmetric requirement for rollback (reverse `associate-alias` must reach `Deployed` on `E3H9X49AG3GYSO` before the reverse DNS swap). **R31**'s runbook command-list bullet now includes an explicit `aws cloudfront wait distribution-deployed` step between the `associate-alias` and `change-resource-record-sets` invocations, for both forward flip and rollback. The **Technical Notes "Flip-day mechanism"** paragraph now interposes the same "once `Deployed`" wait between step 1 and step 2.

---

### QA Engineer (fresh eyes)

#### RESOLVED: QA-F5 (medium) — Neither test matrix verifies the redirect *destination* paths fall through without re-redirecting (redirect-loop safety)

The function is attached to the `/app/*` cache behavior (R26). Every redirect destination it produces — `/app/`, `/app/?lang=fr`, `/app/?lang=fr&foo=bar#hash` — is itself an `/app/*` path, so the browser's post-redirect request **re-invokes the function**. Correct behavior is fall-through (the destination is not an R2/R3 shape, so R1's "MUST NOT redirect arbitrary `/app/...` deep paths" applies and it passes to V3 S3). If that ever regressed, the function would redirect `/app/` → `/app/` and produce an **infinite client-side redirect loop** — the single most catastrophic failure mode this function has.

R28 (positive) and R29 (negative) never exercise this. R29's fifth-pass addition covered `/app/static/js/bundle.js` (a V3 *asset* shape) but not the redirect destinations themselves. The closest is the iframe test in R28 asserting the iframe "ends up at `/app/?launchFromLara=true#shared=xyz`" — but it does not assert that landing there is *stable* (no further redirect).

**Why it matters**: Redirect-loop safety is implicit in R1 but completely untested. A test matrix that omits the function's own output is missing its highest-severity negative case.

**Suggested resolution**: Add to R29's negative matrix explicit rows for the redirect destinations: `/app/` (bare destination), `/app/?lang=fr` (lang destination), and `/app/?lang=fr&foo=bar` (full destination) — each MUST fall through to V3 S3 and MUST NOT produce a synthetic redirect. Optionally add `/releases/` (empty `{name}`) for symmetry with R4's empty-name fall-through.

**Decision**: Applied. R29 gains a "Redirect-destination paths (redirect-loop safety)" group framed as "the function MUST NOT redirect any path it can itself emit," with rows `/app/`, `/app/?lang=fr`, and `/app/?lang=fr&foo=bar` — each must fall through to V3 S3 with no synthetic redirect — plus a `/releases/` (empty-`{name}`) fall-through row. The group note states that a regression here produces an infinite client-side redirect loop. G2 ("every URL in R29's negative matrix") gates the new rows automatically — no G-criterion edit needed. No monitor change: R26b's V3-reachability probe on `/app/` already asserts a V3 marker, which continuously catches a `/app/` → `/app/` loop regression. `/releases/latest/` was considered and excluded — it is a redirect *source* (R4), not a destination, so it does not belong in the destination-loop group.

---

### Performance Engineer (fresh eyes)

#### RESOLVED: PERF-F3 (minor) — R30a states execution-time targets in milliseconds, but the `test-function` API it mandates reports `ComputeUtilization` (a percentage), not milliseconds

R30a requires execution-time validation "using the CloudFront `test-function` API (`aws cloudfront test-function`)" with targets "Median execution time < 0.5ms," "p99 execution time < 1.0ms," and "No URI ... exceed[s] CloudFront's hard ~1ms limit."

The `test-function` API response does not contain an absolute execution time in milliseconds. Its `TestResult` reports `ComputeUtilization` — "the amount of time that the function took to run as a percentage of the maximum allowed time." An operator running R30a literally cannot read "0.5ms" from the output; they read a utilization percentage. The millisecond figures are only meaningful as an *implied* mapping (≈100% utilization ≈ the ~1ms ceiling).

**Why it matters**: A requirement that mandates a specific tool should state its pass/fail bar in the units that tool emits, or the validation step is ambiguous and the gate (G3) is not crisply checkable.

**Suggested resolution**: Restate R30a's targets in `ComputeUtilization` terms — e.g., "median `ComputeUtilization` < 50%, p99 < 100%, no sampled URI at 100%" — or keep the millisecond framing but add a sentence noting that `ComputeUtilization` is the measured quantity and that the percentage is interpreted against CloudFront's ~1ms per-invocation budget.

**Decision**: Applied. R30a's three targets are restated with `ComputeUtilization` (percentage of CloudFront's maximum allowed per-invocation budget, 100% = hard limit) as the operative, measured quantity — median < 50%, p99 < 100%, no sampled URI at or near 100% — with the millisecond figures retained parenthetically as the human-meaningful interpretation against the documented ~1ms budget. A lead-in sentence states that `ComputeUtilization` is what the `test-function` `TestResult` actually returns. G3 still gates R30a unchanged; it is now crisply checkable against the tool's real output.

---

### Customer Support (fresh eyes)

#### RESOLVED: CS-F3 (minor) — The static body message "Loading CODAP…" reads as false for the `<noscript>` cohort it shares the page with

R19c pins the synthetic page's static body message as `Loading CODAP…` and, inside the `<noscript>` block (R19b), an anchor plus the sentence "JavaScript is required to preserve your link's parameters. Click above to continue."

For the ≥99% JS-enabled cohort, "Loading CODAP…" is accurate — a redirect is milliseconds away. For the JS-disabled / JS-blocked / sandboxed-iframe cohort, nothing is loading: the page is inert until the user clicks the `<noscript>` link. That cohort sees both messages stacked: a "Loading CODAP…" with a progress ellipsis that will never resolve, immediately followed by "JavaScript is required… Click above to continue." The two are mildly contradictory, and the ellipsis sets a false expectation precisely for the users who most need a clear call to action.

**Why it matters**: Small, but it lands on the exact cohort already worst-served by the redirect (non-preserving fallback per R19b) — realistically a student or teacher in a locked-down classroom environment.

**Suggested resolution**: One of: (a) accept as-is — the `<noscript>` sentence is adjacent and clarifying — and record the decision; (b) reword the static body message to something that reads correctly in both modes (e.g., a plain `CODAP` with no progress implication, letting the `<noscript>` sentence carry the instruction); or (c) keep "Loading CODAP…" but reword the `<noscript>` sentence so it doesn't read as a correction (e.g., "This link needs JavaScript. Open CODAP using the link above.").

**Decision**: Option (c). The `Loading CODAP…` body message is kept unchanged — it is accurate and reassuring for the ≥99% JS-enabled cohort during the 50–500ms flash, and option (b) was rejected because neutering the message for the majority to fix a minor wording snag for the <<1% cohort is the wrong trade. R19c's `<noscript>` explanatory sentence is reworded to `"This page needs JavaScript to send you to CODAP automatically. Use the link above to continue. (Your link's saved settings may not carry over.)"` — which, for the `<noscript>` cohort, reads as an explanation of why the loading did not complete rather than a contradiction of it, while the parenthetical retains the original sentence's real information that the `<noscript>` path is non-preserving (R19b). The anchor text `Open CODAP` is unchanged.

---

### Re-review (after sixth-pass resolution)

Fresh scan of the spec after the sixth-pass issues were resolved, checking for problems introduced by the resolutions themselves.

#### RESOLVED: RR7 — R23's "no logging when `false`" now contradicts the unconditional exception-path log line added by REL-F1

REL-F1's resolution added an exception-path `console.log` line (R18b, R30) that is emitted **unconditionally** — even when `LOG_ENABLED = false`. But R23 still reads "When `false` (default in committed source), no logging." That is now inaccurate: a caught exception logs regardless of the flag.

**Suggested resolution**: Amend R23 — "When `false` … no logging" → "When `false` … no per-match logging; the sole exception is the R18b exception-path log line (R30), emitted unconditionally regardless of `LOG_ENABLED`." (Q7's Decision text carries the same older phrasing; it is a decision-log entry and is left as historical record per the TW1 numbering note — R23 is the live requirement.)

**Decision**: Applied — R23 now reads "no per-match logging; the sole exception is the R18b exception-path log line (R30), which is emitted unconditionally regardless of `LOG_ENABLED`." Q7's Decision text is left as historical decision-log per the TW1 numbering note.

---

#### RESOLVED: RR8 — G2's expected-outcome parenthetical doesn't cover R29's new redirect-destination rows (V3 S3 served as a 200, not a 404)

G2 reads: "Every URL in R29's negative matrix … serves the expected origin (V2, V3 S3 404, or marketing) without the redirect function firing." QA-F5 added redirect-destination rows to R29 — `/app/`, `/app/?lang=fr`, `/app/?lang=fr&foo=bar` — which fall through to V3 S3 and serve the **V3 app with a 200**, not a 404. G2's parenthetical enumerates only "V3 S3 404"; it does not cover a V3 S3 200. (The parenthetical was in fact already incomplete before QA-F5: the fifth-pass `/app/static/js/bundle.js` row also serves a 200 from V3 S3.)

**Suggested resolution**: Broaden G2's parenthetical — e.g. "(V2, the V3 app or a V3 asset from V3 S3, a V3 S3 404, or the marketing site)" — or drop the parenthetical entirely and rely on "serves the expected origin … without the redirect function firing," with R29 itself enumerating the per-row expectation.

**Decision**: Applied — G2's parenthetical broadened to "(V2 origin, the V3 app or a V3 asset from V3 S3, a V3 S3 404, or the marketing site)", which honestly covers every outcome R29 now enumerates. The load-bearing clause "without the redirect function firing" is unchanged.

---

#### RESOLVED: RR9 (minor) — R24's "two ordered steps" summary doesn't mention the `Deployed`-wait DO-F6 added to R24a

R24 frames flip-day activation as "(step 1) the CloudFront CNAME alias move per R24a; then (step 2) one `aws route53 change-resource-record-sets` call." DO-F6 inserted a mandatory wait — step 2 must not fire until the `associate-alias` change reaches `Deployed` — into R24a, R25, R31, and the Technical Notes. R24's bare "then (step 2)" reads as immediate. R24 explicitly defers step-1 detail to R24a ("per R24a"), so this is not a contradiction, but a one-clause pointer would keep the summary honest.

**Suggested resolution**: Minor — add to R24 a parenthetical such as "(after step 1 reaches `Deployed` — see R24a)". Or accept as-is, since R24a owns the ordering detail and R24 already points to it.

**Decision**: Applied — R24 now reads "then — once step 1 has reached `Deployed` (R24a) — **(step 2)** …". The full wait rationale stays in R24a; R24's summary is now honest about the gate without duplicating the detail.

---

## External Review (GitHub Copilot, 2026-05-22)

External LLM review (GitHub Copilot) of the requirements spec, provided after the sixth-pass self-review. Two findings; processed one at a time.

#### RESOLVED: CR1 (medium) — Alarm "page on-call" wording contradicts the IR2 manual-monitoring decision

R26b's alarm bullets say "→ page on-call" (four CloudWatch alarms and the two synthetic monitors) and "→ informational notify" (the `4xxErrorRate` alarm). But the paragraph immediately below them — the IR2 monitoring-approach decision — states there is *no automated routing* to Slack / PagerDuty / email and that the primary monitoring mode is a manual console/CLI watch. "Page on-call" implies an automated paging mechanism that, per IR2, does not exist. This leaves paging/notification behavior ambiguous for the flip-day runbook authors.

**Why it matters**: The bullets are really expressing a *severity classification* — which alarm states are action-forcing versus noise-prone — not a routing mechanism. With manual monitoring the classification still matters (it tells the watcher which states demand immediate assessment against RB1–RB6), but the word "page" describes infrastructure the spec elsewhere says it deliberately does not build.

**Suggested resolution**: Reword the alarm/monitor bullets' trailing tags from "→ page on-call" / "→ informational notify" to severity classifications with no automated-routing implication (e.g. "→ high-severity" / "→ informational"), and add a clause to the IR2 paragraph stating those tags classify how the manual watcher prioritizes each alarm state — high-severity = assess immediately against RB1–RB6; informational = noted, not action-forcing on its own.

**Decision**: Applied. R26b's five "→ page on-call" tags (`FunctionExecutionErrors`, the `"error-fallthrough"` metric filter, `FunctionThrottles`, `5xxErrorRate`, and the two synthetic monitors) are reworded to "→ **high-severity**"; the `4xxErrorRate` tag is reworded from "→ informational notify (not a page; …)" to "→ **informational** (not action-forcing on its own; …)". The IR2 paragraph gains a sentence stating that the high-severity / informational tags are severity classifications for the manual watcher, not automated-routing instructions — high-severity demands immediate assessment against RB1–RB6, informational is noted but not action-forcing alone. The REL-F1 sixth-pass Decision narrative was also updated ("→ page on-call" → "→ high-severity") since it is an entry from this same review session; the pass-1 Ops3 finding text ("alarms that page on-call") is left as historical record.

---

#### RESOLVED: CR2 (low) — R30's "`request.uri` (path + query)" is inaccurate for the CloudFront Functions event model

R30 says the per-match log line contains "the source `request.uri` (path + query)." In the CloudFront Functions event model, `request.uri` is the **path only**; the query string is exposed separately as `request.querystring` (a structured object keyed by parameter name). As written, an implementer could log just the path and silently omit the query.

**Why it matters**: The query string carries exactly the parameters this spec works hard to preserve (`?launchFromLara=`, `?url=`, the R17a `lang` collision, etc.); a log line that drops it is materially less useful for diagnosing a misrouted redirect. The same imprecision is in the R18b exception-path log line added by REL-F1 ("containing the source `request.uri`").

**Suggested resolution**: Reword R30 so the per-match log line includes the source path (`request.uri`) and the query string (reconstructed from `request.querystring`), noting that CloudFront Functions expose the query separately from `request.uri`. Apply the same correction to the R18b exception-path log line so the `"error-fallthrough"` trace likewise captures path + query.

**Decision**: Applied. R30's per-match log line now reads "the source request path (`request.uri`) and query string (reconstructed from `request.querystring` — CloudFront Functions expose the query separately from `request.uri`, which carries the path only)." The R18b exception-path log line (added by REL-F1) is corrected from "the source `request.uri`" to "the same source path + query," so the `"error-fallthrough"` trace captures the query that may have triggered the exception.

---

### Re-review (after external-review resolution)

Re-checked the spec after the CR1 and CR2 resolutions. CR1's rewording is confined to R26b's six alarm/monitor tags and the IR2 paragraph — no other section references the old "page on-call" phrasing as a live instruction (R31's runbook bullets, R31b's active-watch protocol, and G5 all describe the alarms without paging language; the pass-1 Ops3 finding text is left as historical record). CR2's R30 rewording is internally consistent — the added query reconstruction is small against the R20b function-source budget, and the per-match and exception-path log lines now describe the same path + query content. No new issues.

---

### Second round (GitHub Copilot, 2026-05-22)

A second GitHub Copilot review pass after the first-round (CR1/CR2) resolutions. Three findings; processed one at a time.

#### RESOLVED: CR3 (medium) — R18's "on the `codap.concord.org` distribution" is ambiguous under the clone + DNS-swap model

R18 says the function is "attached at the **viewer-request** stage on the `codap.concord.org` distribution." That phrasing predates the Q6 clone + DNS-swap rewrite of the gating section. Under the current model the function lives on the **new cloned distribution** throughout the pre-flip period; `codap.concord.org` still resolves to `E3H9X49AG3GYSO` until flip day, and R22 states "No modifications to `E3H9X49AG3GYSO` happen during the pre-flip period." Read literally, "the `codap.concord.org` distribution" could be taken as the *current* production distribution `E3H9X49AG3GYSO` — directly contradicting R22.

**Why it matters**: R18 is the foundational mechanism requirement; an implementer or reviewer who reads it in isolation could attach the function to the wrong distribution — precisely the mistake R22 exists to prevent.

**Suggested resolution**: Reword R18 to state the function attaches to the new (cloned) distribution — the one that becomes `codap.concord.org` at flip day — and explicitly that it is never attached to `E3H9X49AG3GYSO` during the pre-flip period (R22).

**Decision**: Applied — R18 now says the function attaches "on the new (cloned) distribution — the distribution that becomes `codap.concord.org` at flip day (R22, R24a, R26)" and adds "It MUST NOT be attached to the existing production distribution `E3H9X49AG3GYSO` at any point during the pre-flip period (R22)." This aligns R18 (in the "Mechanism" section, never rewritten for the clone + DNS-swap model) with the post-2026-05-19 R22/R24a/R26 framing.

---

#### RESOLVED: CR4 (low) — R21's `${V3_BASE_URL}/${queryString}${original_hash}` template is ambiguous about whether `queryString` carries the leading `?`

R21 constructs the destination as `${V3_BASE_URL}/${queryString}${original_hash}` with `V3_BASE_URL = "https://codap.concord.org/app"`. R17a defines the query-parameter content as `lang=<path-detected>` followed by the remaining non-`lang` parameters — written **without** a leading `?`. A literal reading of the template with R17a's definition substituted yields `https://codap.concord.org/app/lang=fr` — a malformed URL missing the `?`.

**Why it matters**: The intent (`/app/?lang=fr`) is obvious, but the spec pins every other construction rule precisely (R3's `{lang}` regex, R4's `{name}` regex, R17a's parameter ordering); leaving the `?` placement implicit is an inconsistency an implementer could get wrong.

**Suggested resolution**: Add a sentence to R21 stating that in the template `queryString` is either the empty string `""` or a string **beginning with a literal `?`** (e.g. `?lang=fr&foo=bar`) — the `?` is part of `queryString`, not the template; R17a describes only the parameter content. Note for parallelism that `original_hash` is `""` or a `#`-prefixed string as `window.location.hash` returns it.

**Decision**: Applied — R21 now states that `queryString` is either `""` or a `?`-prefixed string (the `?` part of `queryString`, not the template), that `original_hash` is `""` or a `#`-prefixed string as `window.location.hash` returns it, and that a no-query no-hash redirect yields exactly `https://codap.concord.org/app/`. No behavior change — the construction rules are unchanged, only the `?`/`#` placement is now explicit.

---

#### RESOLVED: CR5 (minor) — R4 doesn't explicitly enumerate the trailing-slash-only shape `/releases/{name}/`

R4 says "Redirect `/releases/{name}` and `/releases/{name}/...`" — the bare shape and the with-further-path shape. The trailing-slash-only shape `/releases/{name}/` (a slash with nothing after it) is not explicitly named; "`/releases/{name}/...`" could be read as requiring one-or-more characters after the slash. R28's positive matrix expects `/releases/latest/` (trailing slash, no further path) to redirect.

**Why it matters**: Minor — R28's `/releases/latest/` row plus the SE-F2 delegation note (R28/R29 are the conformance bar for the full path patterns) already pin this case as MUST-redirect. But R4's prose, read in isolation, is ambiguous on a shape R28 explicitly requires.

**Suggested resolution**: Tighten R4's opening clause to enumerate all three shapes explicitly — bare (`/releases/{name}`), trailing-slash-only (`/releases/{name}/`), and with-further-path (`/releases/{name}/...`) — all redirect. A prose-readability fix; R28 + SE-F2 already make it the conformance requirement.

**Decision**: Applied — R4's opening clause now reads "Redirect `/releases/{name}` in all three shapes — bare (`/releases/{name}`, no trailing slash), trailing-slash-only (`/releases/{name}/`), and with a further path (`/releases/{name}/...`)". Zero behavior change and fully consistent with SE-F2: SE-F2 delegates the *regex/pattern construction* to implementation.md, while R28/R29 (and now R4's prose) enumerate the *shapes that MUST be accepted* — `/releases/latest/` was already a positive-matrix row.

---

### Re-review (after second-round resolution)

Re-checked the spec after CR3, CR4, and CR5. CR3's R18 rewording references R22/R24a/R26, all of which exist and agree with it (R22's "the only change made to `E3H9X49AG3GYSO` is the R24a alias move" is consistent with R18's "never attached during the pre-flip period"). CR4's R21 clarification is a pure disambiguation — no construction rule changed — and its "no query, no hash → `https://codap.concord.org/app/`" statement agrees with R1 and R2. CR5's R4 shape enumeration is consistent with the SE-F2 "Path-matching precision" paragraph: SE-F2 delegates the regex *construction* to implementation.md while R28/R29 enumerate the concrete paths that MUST be accepted — R4's three-shape enumeration is a conformance statement of the same kind, and `/releases/latest/` was already an R28 positive row. No new issues.

---

### Third round (GitHub Copilot, 2026-05-22)

A third GitHub Copilot review pass after the second-round (CR3–CR5) resolutions. Seven findings raised; six accepted as genuine, processed one at a time.

#### RESOLVED: CR6 (medium) — Technical Notes' "must be skipped inside the function logic" contradicts the Q14=B routing-handled carve-outs

The Technical Notes "Current CloudFront distribution topology" section, in its "Exceptions live inside `/releases/*`" paragraph, says of `/releases/.gapikey`, `/releases/staging`, `/releases/zips`, `/releases/var`, `/releases/apple-touch-icon.png`: "There is no cleaner way to carve them out at the cache-behavior level — they must be skipped inside the function logic." That sentence predates Q14=B. The chosen approach (Q14=B, R9–R13, R26) is routing-handled carve-outs — dedicated more-specific cache behaviors route these to V2 origin before the function fires, and "the function does not need to know about them." The topology paragraph's prescription directly contradicts that.

**Why it matters**: It is a stale solution-prescription embedded in a section a function implementer reads to understand the landscape — it could mislead toward in-function carve-out matching, the very thing Q14=B removed.

**Suggested resolution**: Reword the sentence so it describes only the current (pre-change) state — these paths are *currently* all served by the one `/releases/*` cache behavior — and points to Q14=B / R26 for the chosen mechanism: on the new distribution each carve-out gets its own more-specific cache behavior, so the redirect function never sees them and does no carve-out matching.

**Decision**: Applied — the "Exceptions live inside `/releases/*`" paragraph's stale final sentence ("There is no cleaner way to carve them out … they must be skipped inside the function logic") is replaced with text that describes only the current state (no dedicated cache behavior today) and points to Q14=B / R26 for the chosen mechanism (each carve-out gets its own more-specific cache behavior on the new distribution; the function performs no carve-out matching, R9–R13).

---

#### RESOLVED: CR7 (medium) — Q3's Decision text still describes in-function carve-out checking, superseded by Q14=B

Q3's Decision (resolved "C — hybrid") reads: "The function first checks the explicit non-redirect list (R9–R13) and falls through to origin on match; otherwise applies the shape-based rule for `/releases/{name}/...`." Q14=B later moved the carve-outs out of the function entirely — R9–R13 are routing-handled and R4 states "the function does not need to know about them." SE4's resolution acknowledges this ("Q3 was resolved 'hybrid', but Q14 (B) later moved the carve-outs out of the function"), but Q3's own Decision text was never updated.

**Why it matters**: Two RESOLVED Open Questions (Q3 and Q14) now describe contradictory function behavior; a reader following the Open Questions section sees Q3 present in-function carve-out checking as the live design and could build the superseded carve-out list.

**Suggested resolution**: Annotate Q3's Decision the way Q2 and Q6 are annotated for supersession — the in-function carve-out-list half of the hybrid was superseded by Q14=B; only the shape-based-rule half remains live (now R4's `^[^/]+$` `{name}` rule). The options-considered list may keep its historical text.

**Decision**: Applied — Q3's Decision gains a "Partially superseded (Q14=B)" note (parallel to Q2's SUPERSEDED and Q6's re-decided annotations): the in-function carve-out-list check was removed when Q14=B reclassified R9–R13 as routing-handled; only the shape-based-rule half remains live (R4's `^[^/]+$`). The original Decision sentence and the options-considered list are left as historical context.

---

#### RESOLVED: CR8 (medium) — Whether the HSTS response-headers policy covers the function's synthetic responses is assumed, not verified

R26a (added by SEC-F2) requires the clone verification to confirm `Strict-Transport-Security` and other security headers are applied via a CloudFront response-headers policy rather than origin-emitted, and — if origin-emitted today — to add a response-headers policy "in scope for this story." R26a's parenthetical says the policy "can also be attached so it covers the function's synthetic response." R20a separately omits HSTS from the function's synthetic response "because HSTS is already set by CloudFront for the domain."

The open question: does a CloudFront response-headers policy attached to a cache behavior apply to a *synthetic response generated by a viewer-request CloudFront Function* on that behavior? R26a's "can also be attached" is permissive, not a firm requirement, and the spec never verifies HSTS actually lands on the synthetic redirect page specifically. If response-headers policies do not cover function-generated responses, the synthetic redirect page ships without HSTS — a security regression on `codap.concord.org` that neither R20a's assumption nor R26a's config-level diff would catch.

**Why it matters**: The synthetic redirect page is a real `codap.concord.org` response served to every redirected user; silently dropping HSTS on it is the exact regression SEC-F2 set out to prevent, on a response path SEC-F2's fix does not firmly cover.

**Suggested resolution**: Strengthen R26a so the verification's actual response-header check (`curl -I`) is run against a URL that triggers a *synthetic function response* on the clone — not only origin responses — confirming HSTS (and other security headers) are present there. Add a contingency to R20a: if that check finds the response-headers policy does not apply to the function's synthetic responses, the function MUST set `Strict-Transport-Security` itself in the synthetic response headers (alongside the headers R20a already mandates).

**Decision**: Both parts applied. **R26a**'s verification clause now requires the response-headers policy to be attached to every behavior the function is attached to, and requires the `curl -I` check to be run against *both* an origin-served URL *and* a URL that triggers the function's synthetic response — confirming the security headers on each. **R20a** gains an "HSTS contingency (CR8)" paragraph: if R26a's synthetic-response check finds HSTS (or another required security header) absent from the synthetic response, the function MUST set it itself — overriding the Sec5 "not required at the function level" decision for that header, and only in that case. The simpler "function always sets HSTS" route was considered but not taken: the contingency keeps the default lean (no redundant header when the policy already covers it) while guaranteeing the gap is closed if it does not.

---

#### RESOLVED: CR9 (low) — The R19a / R21a `{lang}`-static-vs-request-derived reconciliation lives only in a Self-Review entry, not in the requirements

R19a requires the synthetic page's user-visible body content to be static (compiled-in constants, nothing request-derived) and forbids request-derived values in the DOM. R21a requires any URI-extracted value embedded into the synthetic "HTML/JS response body" to be HTML- and JS-string-escaped, and names the path-extracted `{lang}` as the one such value. Read together they look contradictory: R19a says the body is static, yet `{lang}` is request-derived and R21a embeds it into the response body. SEC-F1's resolution narrative does reconcile this ("R19a constrains only the user-visible body text … not the inline `<script>`, which per R21a carries the request-derived `{lang}`") — but that reconciliation lives in a Self-Review entry, not in R19a/R21a themselves.

**Why it matters**: Low — but the live requirements R19a and R21a, read on their own, appear to contradict; the reconciling principle belongs in the requirements, not only in the decision log.

**Suggested resolution**: Add an explicit sentence to R21a (and/or R19a) stating that `{lang}` is embedded *only* as a JavaScript string literal inside the inline `<script>` — where R19's client-side JS consumes it to build the destination — and is never written into DOM text, element content, or attributes. That is precisely what reconciles R21a's "escape the embedded `{lang}`" with R19a's "body content is static": the static-body rule governs user-visible DOM content; `{lang}` never enters it.

**Decision**: Applied — R21a gains a closing sentence stating that `{lang}` is embedded only as a JavaScript string literal inside the inline `<script>` (never into user-visible DOM content), and that R19a's static-body rule governs that user-visible DOM content while the inline `<script>` is the sole carrier of the request-derived `{lang}`. The reconciling principle now lives in the requirement itself, not only in SEC-F1's decision-log narrative.

---

#### RESOLVED: CR10 (minor) — R20b's "measured after any minification step" basis is ambiguous when no minification exists

R20b says the function source "MUST fit within CloudFront's 10 KB function package size limit, measured after any minification step the build performs." No build pipeline is specified in the requirements. If the build performs no minification, "after any minification step" is ambiguous — an implementer could measure raw source, or read it as requiring a minification step.

**Why it matters**: Minor, but the 10 KB ceiling is a hard gate (R20c, G4); its measurement basis should be unambiguous.

**Suggested resolution**: State the measurement basis as the exact byte count of the function code artifact submitted to the CloudFront `create-function` / `update-function` API — whatever bytes are actually deployed, whether or not a minification step produced them. Minification is an optional size-reduction tactic, not a required step.

**Decision**: Applied — R20b's measurement basis is now "the exact byte count of the function code artifact submitted to the CloudFront `create-function` / `update-function` API … whether or not a minification step produced them," with minification stated as optional. The `LOG_ENABLED`-branch-counts clause is unchanged.

---

#### RESOLVED: CR11 (low) — R30 does not state that the logged destination reflects the post-R17a query

R30's per-match log line records "the action taken (the constructed destination URL if redirecting …)." R17a requires that, for R3/R5 (lang) redirects, any `lang` already present in the original query is stripped and the path-detected `{lang}` substituted. For the log to be diagnostically accurate the logged destination should reflect the *post-R17a* query, not the raw incoming query. R30 implies this but does not state it. There is also a precision point: per R19/R21 the function does not assemble the *full* destination URL — the client-side JS appends the hash, which the function never sees — so the function logs the destination as it determines it server-side.

**Why it matters**: Low — but `LOG_ENABLED` exists specifically for debugging redirect behavior; a log showing the raw rather than processed query would mislead exactly when it is relied on.

**Suggested resolution**: Clarify R30 — the logged action/destination is the destination as the function determines it server-side: `V3_BASE_URL` + the R17a-processed query string (path-detected `lang` applied, any query `lang` removed). Note that the hash is appended client-side per R19 and is therefore not part of the function's log line.

**Decision**: Applied — R30's "action taken" item now specifies that, for a redirect, the logged destination is what the function determines server-side (`V3_BASE_URL` + the R17a-processed query, with path-detected `lang` applied and any incoming query `lang` removed), and that the logged destination does not include the hash (appended client-side per R19, never seen by the function).

---

#### RESOLVED: CR12 (trivial) — `codap2to3.concord.org` appears as an example name alongside "temp subdomain (name TBD)"

`codap2to3.concord.org` appears twice in the spec (the ACM-cert note and clone step 6), each time explicitly as an example ("any temp subdomain like …", "e.g., `codap2to3.concord.org`"), while R27 and Q6 give the canonical statement as "temp subdomain (name TBD)." (The external review placed this in R28/R29; it is in fact not in the test matrices — they use relative paths only.) There is no actual contradiction — the spec consistently treats the name as undecided with `codap2to3.concord.org` as an illustration — but the reviewer flags a drift risk if the final name differs and a reader treats the examples as authoritative.

**Why it matters**: Trivial — the "e.g." / "like" framing already marks both mentions as illustrative.

**Suggested resolution**: (a) Accept as-is — illustrative framing is clear and a concrete example aids comprehension — and record the decision; (b) when the temp subdomain name is actually chosen, swap the examples for the real name in Phase 5 finalization; or (c) drop the example name entirely.

**Decision**: Option (b), applied now — the temp subdomain name is locked in as `codap2to3.concord.org` (user decision, 2026-05-22); it is no longer a placeholder. R27's opening sentence now names it definitively and is the canonical reference for "the temp subdomain"; the "(name TBD)" hedge is removed from R27 and from Q6's Decision, and the "any temp subdomain like" / "e.g." example framing at the ACM-cert note and clone step 6 is replaced with the definite name. "Temp subdomain" remains in use elsewhere as readable shorthand for `codap2to3.concord.org`. Copilot's claim that the name appears in R28/R29 was inaccurate — it does not; the test matrices use relative paths only, so no change there.

---

### Re-review (after third-round resolution)

Re-checked the spec after CR6–CR12. CR6's and CR7's rewordings remove stale pre-Q14 prescriptions and cross-reference Q14=B / R4 / R9–R13 / R26 — all exist and agree. CR8's R26a/R20a changes are mutually consistent: R26a now firmly requires the response-headers policy on `/app`, `/app/*`, `/releases/*` (the behaviors R18/R26 attach the function to) plus a synthetic-response header check, and R20a's HSTS contingency is the documented fallback if that check fails. CR9's R21a sentence and CR11's R30 clarification reference R19/R19a/R17a consistently. CR10's R20b basis ties to R20c's "verify … before submitting to CloudFront." CR12 locked the temp subdomain name in at R27 (canonical), with no remaining "(name TBD)" for the subdomain anywhere in the spec. No new issues.

---

## External Review (Gemini, 2026-05-22)

An external LLM review (Google Gemini) after the three GitHub Copilot rounds. Four findings; processed one at a time.

#### RESOLVED: GR1 (medium) — The spec says CloudFront "picks the most-specific match"; CloudFront actually uses ordered first-match, so carve-out behaviors must be explicitly ordered ahead of the general behaviors

R9 ("CloudFront picks most-specific match"), R14 ("CloudFront selects the most-specific behavior"), and Q14's option B ("CloudFront picks most-specific match") all assert that CloudFront automatically selects the most-specific cache-behavior path pattern. It does not. CloudFront evaluates cache behaviors in their configured **list order (precedence)** and uses the **first** behavior whose path pattern matches the request; the default behavior is used only if none match. "Most specific wins" is an outcome that must be *arranged* by ordering the specific behaviors first — it is not automatic.

**Why it matters**: This is a load-bearing assumption for every routing-handled carve-out (R9–R13) and the TP-Sampler behaviors (R14). If the cloned/modified distribution lists the broad `/releases/*` or `/app/*` behavior *above* a specific carve-out (e.g. `/releases/staging/*`), the broad behavior matches first, the redirect function fires, and the carved-out path breaks — exactly the V2-staging breakage R10 / DO-F3 worked to prevent. G2's negative matrix is a backstop that would catch it, but the spec's stated mechanism is simply wrong and would mislead an implementer building the distribution.

**Suggested resolution**: (1) Add a cache-behavior-precedence rule to R26 stating CloudFront uses ordered first-match (not auto-specificity), and that the carve-out behaviors (R9–R13), the TP-Sampler behaviors (R14), and `/v3` / `/v3/*` MUST be ordered at higher precedence than the general `/app`, `/app/*`, and `/releases/*` behaviors. (2) Correct the "most-specific match" wording in R9, R14, and Q14's option B to reference the ordering. (3) Extend R26a's verification to confirm the carve-out behaviors are ordered ahead of the general behaviors.

**Decision**: All three parts applied. **R26** gains a "Cache-behavior precedence (GR1)" paragraph: CloudFront evaluates behaviors in configured list order and uses the first match (no auto-specificity), so the carve-out behaviors (R9–R13), TP-Sampler behaviors (R14), and `/v3` / `/v3/*` MUST be ordered ahead of the general `/app`, `/app/*`, `/releases/*` behaviors. **R9** and **R14**'s "most-specific match" claims are reworded to reference that ordering; **Q14's option B** parenthetical likewise. **R26a**'s structured-diff verification now explicitly confirms the carve-out/TP-Sampler behaviors are ordered ahead of the general behaviors. The factually-wrong "CloudFront picks the most-specific match" mechanism claim no longer appears as a live statement anywhere in the spec; G2's negative matrix (`/releases/staging/...` must serve V2) remains the runtime backstop.

---

#### RESOLVED: GR2 (minor) — R17a query reassembly can yield a dangling trailing `&` when `lang` was the only original parameter

R17a says the reconstructed query is "`lang=<path-detected>` followed by the remaining non-`lang` parameters from the original query (joined with `&`)." For a URL like `/app/static/dg/fr/cert/index.html?lang=es` — where `lang` is the *only* original parameter — stripping it leaves an empty remainder. A naive construction (`"lang=" + detected + "&" + remainder`) yields `?lang=fr&` with a dangling `&`, violating the URL-cleanliness goal. R28's collision row tests `?lang=es&foo=bar` (a non-empty remainder) but not the `lang`-only case.

**Why it matters**: Minor — but the spec pins URL construction precisely elsewhere, and a dangling `&` is exactly the kind of cosmetic-but-wrong output a precise spec should preclude.

**Suggested resolution**: Reword R17a so the query is the ordered list [`lang=<path-detected>`, then each remaining non-`lang` parameter] **joined** with `&` — making explicit that an empty remainder yields exactly `lang=<path-detected>` with no trailing `&`.

**Decision**: Applied — R17a is reworded as a join over the ordered parameter list, stating explicitly that a one-element list yields exactly `lang=<path-detected>` with no trailing `&`. R28's positive matrix gains a `lang`-only row (`?lang=es` → `?lang=fr`, empty remainder, no trailing `&`).

---

#### RESOLVED: GR3 (low) — R17a's lang-stripping reconstruction does not address duplicate / multi-value query parameters

R17a's lang-stripping is the one query transformation the redirect performs. The spec accounts for a `lang` collision but is silent on other duplicate query keys (e.g. `?foo=1&foo=2`). If the reconstruction parses the query into a map keyed by parameter name, duplicate keys collapse and user data is silently dropped. R15 requires verbatim query preservation, and for the non-lang-redirect paths (R1/R2/R4) "verbatim" trivially preserves duplicates — but the R3/R5 lang path requires an actual parse-and-rebuild, which is where duplicates are at risk.

**Why it matters**: Low — multi-value query keys are uncommon in CODAP URLs — but the lang-strip is precisely the operation that can collapse them, and silent data loss in a URL the spec promises to preserve is worth precluding.

**Suggested resolution**: Add a sentence to R17a: reconstruction MUST treat the original query as an ordered list of `name=value` pairs — remove every pair named `lang`, preserve all others (including duplicate/repeated names) in original order and multiplicity. Note that a `URLSearchParams`-based implementation provides this for free.

**Decision**: Applied — R17a gains a sentence requiring the reconstruction to treat the query as an ordered list of `name=value` pairs (remove every `lang` pair, preserve all others including duplicates in original order and multiplicity), noting `URLSearchParams` provides this for free and a name-keyed map MUST NOT be used. Scoped to the R3/R5 lang path (the only path that parse-and-rebuilds; R1/R2/R4 already preserve the query verbatim). No test-matrix row added — multi-value query keys are rare enough in real CODAP URLs that the requirement-level statement is sufficient coverage.

---

#### RESOLVED: GR4 (minor) — R29 lacks a root-level `/app/`-asset fall-through test

R29's negative matrix tests `/app/static/js/bundle.js` — a *deep* V3 asset — but not a root-level file directly under `/app/`, such as `/app/favicon.ico` or `/app/manifest.json`. These single-segment paths must fall through to V3 S3 (they are not R2/R3 shapes), and must not be confused with R1's exact-match `/app` rule.

**Why it matters**: Minor — a correct path-matcher treats `/app/favicon.ico` identically to `/app/static/js/bundle.js` — but a single-segment path "close to" the exact `/app` rule is a distinct shape worth one explicit negative row, and these are realistic V3 assets that a `/app/` page references.

**Suggested resolution**: Add `/app/favicon.ico` (and `/app/manifest.json`) to R29's negative matrix — root-level V3 assets that must pass through to V3 S3, not be intercepted, and not be captured by R1's exact-`/app` logic.

**Decision**: Applied — R29's negative matrix gains a row for `/app/favicon.ico` and `/app/manifest.json` (single-segment root-level V3 assets under `/app/` that must pass through to V3 S3, not be intercepted, and not be captured by R1's exact-`/app` rule).

---

### Re-review (after Gemini-round resolution)

Re-checked the spec after GR1–GR4. GR2's and GR3's R17a additions are mutually consistent (both frame the query as an ordered list). GR4's R29 row references R1 correctly. One issue was introduced by GR1's own resolution:

#### RESOLVED: RR10 (minor) — GR1's R26 precedence paragraph wrongly includes `/v3` / `/v3/*` among behaviors that must be ordered ahead of the general behaviors

GR1's resolution added a "Cache-behavior precedence" paragraph to R26 stating that the carve-out behaviors (R9–R13), the TP-Sampler behaviors (R14), **and the `/v3` / `/v3/*` behaviors** MUST be ordered ahead of the general `/app`, `/app/*`, `/releases/*` behaviors. But `/v3` and `/v3/*` do not overlap `/app`, `/app/*`, or `/releases/*` — they match a disjoint path prefix — so no request can match both a `/v3*` behavior and a general behavior. Precedence ordering only matters between *overlapping* patterns; requiring `/v3` / `/v3/*` to be "ordered ahead" states a constraint that does not exist and could send an implementer looking for a conflict that isn't there. (R26a's verification text, added in the same resolution, correctly lists only the carve-out and TP-Sampler behaviors — so only the R26 paragraph has the error.)

**Suggested resolution**: Reword R26's precedence paragraph to require ordering only for the behaviors that actually overlap a general behavior — the carve-outs (R9–R13) and the TP-Sampler behaviors (R14), each ahead of the general wildcard it overlaps. Drop `/v3` / `/v3/*` from the precedence requirement; they need only exist as ordered behaviors, with no precedence constraint relative to the general behaviors.

**Decision**: Applied — R26's precedence paragraph now requires ordering only for the carve-outs (R9–R13) and TP-Sampler behaviors (R14), each ahead of the general wildcard it overlaps (`/releases/*`, or `/app/*` for the `/app` TP-Sampler behavior), and explicitly notes that `/v3` / `/v3/*` match a disjoint prefix and carry no precedence constraint. R26a's verification text was already correct (carve-out + TP-Sampler only) and is unchanged.

---

## Implementation-Planning Feedback (2026-05-22)

Phase 2 implementation planning ([implementation.md](implementation.md)) surfaced one requirements-level gap. It is recorded here in the same decision-log form as the review passes above.

#### RESOLVED: IF1 (major) — the `/app/*` origin swap (R21/R26) does not by itself serve V3; an `/app`-prefix strip is required

R21 and R26 specify that the new distribution's `/app` and `/app/*` cache behaviors target the V3 S3 origin `S3-Website-models-resources-codap3` (`OriginPath: /codap3`) "so that post-redirect requests serve V3 content." Implementation planning (Open Question IQ1) found the origin swap alone is not sufficient. The V3 S3 origin serves V3 rooted at `codap3/` — `codap3/index.html`, hashed assets under `codap3/version/{tag}/` — exactly as `codap3.concord.org` (distribution `E7WVRGISCR2VR`) serves it. A request for `/app/version/{tag}/main.js` against an `OriginPath: /codap3` origin resolves to the S3 key `codap3/app/version/{tag}/main.js`, which does not exist; every non-redirected `/app/...` request would 404. The `/app` URL segment has no counterpart in the `codap3/`-rooted S3 layout.

**Why it matters**: Without a fix, the redirect would deliver users to `https://codap.concord.org/app/` and that page — and every V3 asset under it — would 404. This is a flip-blocking defect that R21/R26, as written, would have produced. Six self-review passes and three external review rounds reasoned about *which* origin and *which* behaviors but never traced a `/app/...` URL through to its S3 key.

**Resolution**: The redirect CloudFront Function — already the viewer-request function on `/app/*` — is extended to strip the leading `/app` path segment on every request it does not redirect, so the request resolves against the V3 S3 origin's `codap3/`-rooted layout. A separate strip function is not possible: CloudFront permits only one function per event type per cache behavior, and `/app/*` already carries the redirect function. Added **R1a** specifying the strip; R1's "fall through" sentence, R21, and R26's `/app/*` bullet are annotated to reference it. The strip is a path rewrite, not a redirect — it produces no synthetic response — so R28's positive matrix and R29's negative matrix are unaffected at the outcome level (R29's `/app/*` rows still "pass through to V3 S3"; the strip is the mechanism by which they reach valid S3 keys). The IQ1 decision and the AWS-CLI investigation that informed it (the `beta*` behavior and the `codap3.concord.org` distribution) are recorded in implementation.md.

#### RESOLVED: IF2 (medium) — `/v3` / `/v3/*` is better as a redirect to `/app/` than a directly-served version-pinned path

Q13 resolved `/v3` and `/v3/*` as cache behaviors that **serve the V3 app directly** with **no function attachment**, at a version-pinned S3 path. Phase 2 planning (Open Question IQ4) found a simpler, more correct design.

Post-flip, `/app/` serves current V3. `/v3` is therefore just another name for current V3 — there is no second thing for it to point at. Standing up a version-pinned origin for `/v3` (a distinct S3 path, a chosen frozen build) builds version-pinning machinery before it is needed: version-pinning only matters at the *next* major cutover (V3→V4), when `/app/` advances to V4 and `/v3` should stay on V3. Until then, a directly-served `/v3` and `/app/` would serve byte-identical content from two URLs.

**Why it matters**: Not a defect, but Q13's design adds a cache behavior, an origin/`OriginPath`, and a deploy step for a path that, today, is indistinguishable from `/app/`. A redirect collapses all of that to one rule in a function that already exists.

**Resolution**: `/v3` and `/v3/*` **redirect to `https://codap.concord.org/app/`** (path collapsed, query + hash preserved), handled by the redirect function — which is already attached to comparable behaviors and already performs exactly this kind of collapse-redirect (R1, R4). Added **R6a** for the rule; revised R26's `/v3` bullet (redirect function attached, no version-pinned origin); annotated Q13 as superseded; R28's positive matrix gains `/v3` rows, so G1 covers them automatically. No new origin, no version-pinned S3 path, no `/v3`-specific deploy step. True version-pinning is deferred to the V3→V4 cutover that will actually need it. Found during Phase 2 / IQ4; see implementation.md.

---
