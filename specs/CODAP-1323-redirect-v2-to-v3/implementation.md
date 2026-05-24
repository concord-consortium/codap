# Implementation Plan: Build CloudFront Function for V2 → V3 Redirects

**Jira**: https://concord-consortium.atlassian.net/browse/CODAP-1323
**Requirements Spec**: [requirements.md](requirements.md)
**Status**: **Finalized — Ready for Implementation**

## Overview

This plan implements CODAP-1323 — the CloudFront Function that redirects legacy V2 URLs to
V3, plus all of the cutover infrastructure the requirements spec mandates: the cloned
CloudFront distribution, observability, the flip/rollback automation, the pre-flip
conformance suite, and the flip-day runbook.

Almost every deliverable lives in a new repo-root folder, `devops/cloudfront-functions/v2-v3-redirect/`
(requirements Q4 = B): the CloudFront Function and its tests, the AWS automation scripts, and
the flip-day runbook. The **one exception** is the Cypress conformance suite — the spec
`v3/cypress/e2e/v2-v3-redirect.spec.ts`, its iframe fixture, and a small `v3/cypress.config.ts`
change — which lives under `v3/cypress/` to reuse the repo's existing Cypress install rather
than standing up a second Cypress dependency tree (IQ3 = A).

**Foundational decisions** (interview, 2026-05-22):
- AWS automation is **Bash + AWS CLI + `jq`** — no IaC framework (matches repo convention;
  `v3/scripts/*.sh`, `bin/s3_deploy.sh`).
- The CloudFront Function is authored as a **single committed, fully-commented `.js` file**
  (`v2-v3-redirect.js`); a small **comment-stripping build step** (`build-function.sh`)
  produces the deployed artifact `dist/v2-v3-redirect.js`. The build uses `terser` as a
  JS-aware parser/printer — **comment removal only, no mangling and no compression** — so the
  deployed artifact is behavior-identical to the reviewed source. R20b's 10 KB package limit
  is measured on the built artifact, which R20b explicitly permits ("minification is an
  optional size-reduction tactic"). A naive regex-based comment strip is *not* acceptable: the
  source contains `//` inside both regex literals and the `https://` base-URL string.
  (Revised per SE-I2: the original "committed source IS the deployed artifact, no build step"
  decision left the ~9.8 KB fully-commented file with too little headroom under the 10 KB
  limit, with no remediation path short of hand-trimming comments under flip-day pressure.)
- The R28/R29 conformance matrix is exercised by a **Cypress browser spec** against the temp
  subdomain (`codap2to3.concord.org`), reusing the repo's existing Cypress install.

## Implementation Plan

### Scaffold the `devops/cloudfront-functions/v2-v3-redirect/` folder and README

**Summary**: Create the new repo-root folder and a `README.md` that orients a reader to the
function, the clone + DNS-swap cutover model, and the script inventory. This is a discrete
first commit so every later step has a home and the folder's intent is documented before code
lands.

**Files affected**:
- `devops/cloudfront-functions/v2-v3-redirect/README.md` — new; folder overview.
- `devops/cloudfront-functions/README.md` — new; one paragraph explaining the parent folder is
  for checked-in CloudFront Function source (the function in this story is the first; the
  existing `StripCodapResourcesPrefix` / TP-Sampler functions may be brought in later).

**Estimated diff size**: ~95 lines.

`devops/cloudfront-functions/v2-v3-redirect/README.md`:

```markdown
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

Three operational documents in this folder; read them in the order that fits the task:

1. **`PREFLIGHT.md`** — the ordered pre-flip pipeline. Walks through every script in the
   correct execution order to stand up the cloned distribution at the temp subdomain,
   deploy monitoring, and collect G1 – G6 evidence. Run before flip day.
2. **`RUNBOOK.md`** — the flip-day runbook (G1 – G9 checklist, forward flip, rollback,
   mid-abort recovery, post-flip active-watch, post-soak disposition).
3. **`PLAYBOOK.md`** — recipes for ongoing maintenance after flip (add a redirect rule,
   add a carve-out, debug with `LOG_ENABLED`, rename the `error-fallthrough` prefix).

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
| `route53-change.sh`        | Shared helper: UPSERT a Route 53 ALIAS A record (record-name + target args) | shared |
| `PREFLIGHT.md`             | Pre-flip pipeline (run this first)                                  | this folder |
| `RUNBOOK.md`               | Flip-day operational runbook                                        | R31      |
| `PLAYBOOK.md`              | Ongoing-maintenance recipes (add/remove rules, debugging, etc.)     | this folder |

All scripts are idempotent where practical and read identifiers from `config.env` (see
`config.env.example`). Run from this directory.
```

`config.env.example` is also created here (a single source of truth for the
identifiers the scripts share — populated by R26a/R26c and consumed by every later step):

```bash
# devops/cloudfront-functions/v2-v3-redirect/config.env.example
# Copy to config.env (git-ignored) and fill in. Identifiers from requirements.md Technical Notes.
PROD_DIST_ID=E3H9X49AG3GYSO                       # current codap.concord.org distribution
PROD_DIST_DOMAIN=d13zmjbnp90bac.cloudfront.net    # its CloudFront domain
HOSTED_ZONE_ID=Z2P4W3M7MDAUV6                     # concord.org Route 53 zone
ACM_CERT_ARN=arn:aws:acm:us-east-1:612297603577:certificate/2b62511e-ccc8-434b-ba6c-a8c33bbd509e
TEMP_SUBDOMAIN=codap2to3.concord.org              # pre-flip validation host (R27)
FUNCTION_NAME=codap-v2-v3-redirect                # CloudFront Function name
CLONE_DIST_ID=                                    # filled in by clone-distribution.sh
CLONE_DIST_DOMAIN=                                # filled in by clone-distribution.sh
RHP_REQUIRED=                                     # filled in by clone-distribution.sh step 4 (DO-I1): true|false
RHP_ID=                                           # filled in by clone-distribution.sh step 4 (if a response-headers policy already exists)
```

`.gitignore` entries for `config.env`, `dist/` (the built deploy artifact, regenerated by
`build-function.sh`), `node_modules/`, and `artifacts/` are added in this step. `artifacts/`
holds raw working dumps — notably `clone-distribution.sh`'s `prod-config.json`, a full
`aws cloudfront get-distribution-config` of the production distribution — which MUST NOT be
committed to this public repo: a raw distribution config can carry origin custom-header values
(a common place for origin-auth shared secrets) and other non-identifier data (SEC-J1; SEC-F3
accepted infrastructure *identifiers*, not raw dumps). The one R26c artifact that is meant to
be committed — the DNS-audit record — is written outside `artifacts/` (see the DNS-audit
step). Any config dump checked in, or pasted into a spec, must first be inspected for origin
custom-header values.

---

### Implement the redirect CloudFront Function

**Summary**: The core deliverable — `v2-v3-redirect.js`, a single hand-authored CloudFront
Function. This is the committed, fully-commented source; the deployed artifact
`dist/v2-v3-redirect.js` is produced from it by `build-function.sh` (comment-stripping only,
behavior-identical — see Foundational decisions and the "Function validation and deploy
scripts" step). This step implements path
matching (R1–R5), the English-detection rule (R3), the synthetic HTML+JS response
(R19–R21a), the GET/HEAD filter (R18a), the exception-safe wrapper (R18b), and logging (R23,
R30).

**Files affected**:
- `devops/cloudfront-functions/v2-v3-redirect/v2-v3-redirect.js` — new; the function.

**Estimated diff size**: ~200 lines.

**Design notes carried into the code:**

- **The function works only with `request.uri` (the path)** — to match V2-shape paths, and,
  for non-V2 `/app/*` paths, to strip the `/app` prefix (IQ1 = B1; see next bullet). Per R19
  the query and hash are read *client-side* by the synthetic page's JS — the function never
  embeds them into the response. The function reads `request.querystring` only to build the
  optional R30 log line.
- **`/app`-prefix strip (IQ1 = B1).** A non-V2 path under `/app/*` — a V3 asset, the `/app/`
  index, or one of the function's own redirect destinations — is *not* redirected: the
  function strips the leading `/app` from `request.uri` and returns the modified request, so
  it resolves against the V3 S3 origin `S3-Website-models-resources-codap3`
  (`OriginPath: /codap3`), whose content is rooted at `codap3/` — the same layout
  `codap3.concord.org` serves today. `/app/version/{tag}/main.js` → `/version/{tag}/main.js`;
  `/app/` → `/` → `codap3/index.html`. `/releases/*` paths are returned unchanged (no `/app`
  prefix). Combining the strip into the redirect function — rather than a separate strip
  function — is forced by CloudFront's one-function-per-event-type-per-behavior rule and is
  the IQ1 decision; it is the subject of a requirements.md amendment adding **R1a**.
- **Query reconstruction (R17a) happens entirely in the client-side `<script>`**, and it
  operates on the **raw** `window.location.search` string — splitting on `&`, dropping pairs
  named `lang`, prepending the path-detected `lang`. It deliberately does **not** round-trip
  through `URLSearchParams`: `URLSearchParams.prototype.toString()` re-encodes values
  (`documentServer=https://example.com` → `documentServer=https%3A%2F%2Fexample.com`), which
  would violate R15's *verbatim* preservation and fail R28's literal expected output. R17a's
  remark that "a `URLSearchParams`-based implementation provides this for free" is accurate
  only for its duplicate-preservation intent (an ordered pair list) — the raw-string filter
  satisfies that intent *and* preserves bytes. This tension is flagged for the Phase 3
  cross-reference review (see Open Question IQ-Note).
- **`{lang}` is the sole request-derived value embedded by the function.** It is embedded only
  as a JS string literal inside the inline `<script>` (R21a / CR9), never into user-visible
  DOM (R19a). It is regex-constrained to `[A-Za-z-]` by R3, so `jsStringEscape()` is a no-op
  in practice — present as belt-and-suspenders defense per R21a.
- **`<!-- codap-redirect -->`** is the stable body marker the R26b redirect-correctness
  monitor asserts on (specific marker chosen here; see R26b "marker TBD in implementation").
- The 4 mandated response headers are R20a's set. `strict-transport-security` is **not**
  included by default — R26a's verification (Step 5) determines whether the CloudFront
  response-headers policy already covers the synthetic response; only if it does not does the
  HSTS contingency (R20a / CR8) add a fifth header. See Technical Notes "HSTS contingency".

```js
'use strict'
// CloudFront Function — V2 → V3 redirects for codap.concord.org   [CODAP-1323]
// Runtime: cloudfront-js-2.0   Stage: viewer-request
// Spec: specs/CODAP-1323-redirect-v2-to-v3/   This is the committed, fully-commented source;
// the deployed artifact is dist/v2-v3-redirect.js — comments stripped by build-function.sh (R20b).
//
// Attached to the /app, /app/*, /releases/*, /v3 and /v3/* cache behaviors of the CLONED
// distribution only — never E3H9X49AG3GYSO (R18, R22). For a V2-shape URL it returns a
// synthetic 200 HTML page whose inline JS client-side redirects to V3, preserving the
// URL hash (a server-side 301/302 cannot). For a non-V2 /app/* path it strips the /app
// prefix so the request resolves against the V3 S3 origin (IQ1 = B1); /releases/* and
// other non-matching paths pass through to origin unchanged.

// --- Configuration constants (R21, R23) -------------------------------------------------
var V3_BASE_URL = 'https://codap.concord.org/app'   // R21 — no trailing slash
var V3_DEST = V3_BASE_URL + '/'                     // redirect lands here (Q8 = trailing slash)
var LOG_ENABLED = false                             // R23 — per-match logging; false in committed source

// --- Path-match patterns ----------------------------------------------------------------
// {lang}: BCP-47-shaped, 2-3 letter subtag + optional 2-4 letter subtag (R3).
// {name}: one-or-more non-slash characters (R4). Patterns are start-anchored; the literal
// `static/dg/.../cert` frame is matched exactly; a trailing path after `cert` is optional.
// R28/R29 are the conformance bar for these patterns (requirements SE-F2).
var RE_APP_LANG  = /^\/app\/static\/dg\/([A-Za-z]{2,3}(?:-[A-Za-z]{2,4})?)\/cert(?:\/.*)?$/
var RE_REL_LANG  = /^\/releases\/[^/]+\/static\/dg\/([A-Za-z]{2,3}(?:-[A-Za-z]{2,4})?)\/cert(?:\/.*)?$/
var RE_RELEASES  = /^\/releases\/[^/]+(?:\/.*)?$/
var RE_V3        = /^\/v3(?:\/.*)?$/   // R6a — /v3 and /v3/* are an alias of current V3 (/app/)

// --- Synthetic-response HTML (R19, R19a-c, R20, R20a) -----------------------------------
// Static body text only (R19a). The single request-derived value, {lang}, is embedded ONLY
// in the inline <script> as a JS string literal. <!-- codap-redirect --> is the R26b marker.
// The client-side JS operates on the RAW query string (no URLSearchParams) to preserve it
// verbatim (R15) and to keep duplicate parameters (R17a / GR3).
var HTML_HEAD =
  '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
  '<title>CODAP</title>' +
  '<style>body{font-family:sans-serif;text-align:center;padding:2em}</style>' +
  '</head><body><!-- codap-redirect -->' +
  '<p role="status">Loading CODAP…</p>' +   // role=status — WCAG-I1
  '<noscript><p><a href="' + V3_DEST + '">Open CODAP</a></p>' +
  '<p>This page needs JavaScript to send you to CODAP automatically. ' +
  'Use the link above to continue. ' +
  '(Your link’s saved settings may not carry over.)</p></noscript>' +
  '<script>(function(){' +
  'var lang="'
// R17a: when path-detected `lang` is non-empty (R3/R5 -- the only paths that contribute
// a lang), prepend it and strip any incoming `?lang=` pair. When it is empty (R1, R2, R4,
// R6a), preserve the original query VERBATIM -- including any `?lang=` the user passed.
// (Phase 3 fix; the prior implementation stripped query `lang` unconditionally, which
// dropped the user's lang on R1/R2/R4/R6a paths.)
var HTML_TAIL =
  '";' +
  'var s=window.location.search;' +
  'var qs;' +
  'if(lang){' +
    'var pairs=s?s.slice(1).split("&"):[];' +
    'var out=["lang="+lang];' +
    'for(var i=0;i<pairs.length;i++){' +
      'var p=pairs[i];if(p===""){continue;}' +
      'var eq=p.indexOf("=");' +
      'var n=eq<0?p:p.slice(0,eq);' +
      'if(n==="lang"){continue;}' +
      'out.push(p);' +
    '}' +
    'qs="?"+out.join("&");' +
  '}else{' +
    'qs=s;' +
  '}' +
  'window.location.replace("' + V3_DEST + '"+qs+window.location.hash);' +
  '})();</script></body></html>'

// --- Helpers ----------------------------------------------------------------------------
// R21a — \u-escape every character that could break out of the inline <script>'s
// `var lang="..."` string literal. The escaped character class covers:
//   \  "  '        backslash and quote characters — JS string-literal delimiters.
//   <  >  &  /     HTML-context metacharacters — so an embedded value cannot form the
//                  substring `</script>` and close the <script> element early.
//   \r  \n         carriage return and line feed — both terminate a JS string literal.
//   \u2028 \u2029  U+2028 LINE SEPARATOR and U+2029 PARAGRAPH SEPARATOR — the non-obvious
//                  pair that ALSO terminates a JS string literal. They are written here as
//                  \u-escapes, never as literal characters, so this security-relevant regex
//                  stays all-ASCII and reviewable in a diff (SE-I1).
// {lang} is regex-constrained to [A-Za-z-] by R3, so in practice jsStringEscape never has
// anything to escape — it is kept purely as defense-in-depth (R21a).
function jsStringEscape(s) {
  return s.replace(/[\\"'<>&\/\r\n\u2028\u2029]/g, function (c) {
    return '\\u' + ('000' + c.charCodeAt(0).toString(16)).slice(-4)
  })
}

// R3 English-detection rule: a {lang} is English iff it case-insensitively equals
// `en` or `en-US`. English => '' (no ?lang=, route per R2); anything else => verbatim code.
function normalizeLang(code) {
  var lc = code.toLowerCase()
  return (lc === 'en' || lc === 'en-us') ? '' : code
}

// Reconstruct the query string from the CloudFront Functions event model for logging only.
// request.querystring is an object keyed by name: { value, multiValue:[{value}] }.
function reconstructQuery(qs) {
  var parts = []
  for (var name in qs) {
    if (!qs.hasOwnProperty(name)) { continue }
    var entry = qs[name]
    var values = entry.multiValue && entry.multiValue.length ? entry.multiValue
                                                             : [{ value: entry.value }]
    for (var i = 0; i < values.length; i++) {
      parts.push(values[i].value === '' ? name : name + '=' + values[i].value)
    }
  }
  return parts.join('&')
}

// SEC-I1 — neutralize whitespace and control characters in any request-derived value before
// it is interpolated into a console.log line. Prevents CloudWatch log-line injection (a
// newline forging a fake entry) and stops a crafted URI from forging the contiguous
// `codap-redirect tag=error-fallthrough` token sequence the R26b metric filter keys on.
function logSafe(s) {
  return String(s).replace(/[\s\u0000-\u001f\u007f]/g, '?')
}

// R30 — server-side destination for the log line: V3_DEST + R17a-processed query.
// When path-detected `lang` is non-empty (R3/R5), it wins and any incoming query `lang`
// is dropped. When path lang is empty (R1, R2, R4, R6a), the original query is preserved
// verbatim. The hash is appended client-side (R19) and is never seen by the function, so
// it is not part of the log line. (Phase 3 fix -- mirrors the client-side R17a fix.)
function logDestination(lang, rawQuery) {
  if (!lang) {
    return V3_DEST + (rawQuery ? '?' + rawQuery : '')
  }
  var pairs = rawQuery ? rawQuery.split('&') : []
  var out = ['lang=' + lang]
  for (var i = 0; i < pairs.length; i++) {
    var p = pairs[i]
    if (p === '') { continue }
    var eq = p.indexOf('=')
    var n = eq < 0 ? p : p.slice(0, eq)
    if (n === 'lang') { continue }
    out.push(p)
  }
  return V3_DEST + '?' + out.join('&')
}

function buildResponse(lang) {
  return {
    statusCode: 200,
    statusDescription: 'OK',
    headers: {
      'content-type':           { value: 'text/html; charset=utf-8' },
      'cache-control':          { value: 'no-store' },
      'content-security-policy':{ value: "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'" },
      'x-content-type-options': { value: 'nosniff' }
      // 'strict-transport-security' is added here ONLY if R26a's synthetic-response check
      // (Step 5) finds the response-headers policy does not cover this synthetic response
      // (R20a HSTS contingency / CR8).
    },
    body: HTML_HEAD + jsStringEscape(lang) + HTML_TAIL
  }
}

// --- Entry point ------------------------------------------------------------------------
function handler(event) {
  try {
    var request = event.request
    var method = request.method
    if (method !== 'GET' && method !== 'HEAD') {
      return request                                  // R18a — non-GET/HEAD falls through
    }
    var uri = request.uri
    var lang = null                                   // null = no match; '' = match, no ?lang=
    var tag = 'no-match'

    if (uri === '/app') {                             // R1
      lang = ''; tag = 'app-exact'
    } else if (RE_V3.test(uri)) {                     // R6a — /v3, /v3/* → /app/ (alias of V3)
      lang = ''; tag = 'v3'
    } else {
      var m = RE_APP_LANG.exec(uri)                   // R2 / R3
      if (m) {
        lang = normalizeLang(m[1]); tag = lang ? 'app-lang' : 'app-en'
      } else if ((m = RE_REL_LANG.exec(uri))) {       // R5 (check before R4 — more specific)
        lang = normalizeLang(m[1]); tag = lang ? 'releases-lang' : 'releases-en'
      } else if (RE_RELEASES.test(uri)) {             // R4
        lang = ''; tag = 'releases'
      }
    }

    if (lang === null) {
      // Not a V2-shape path. Under /app/* strip the /app prefix (IQ1 = B1 / R1a) so the
      // request resolves against the V3 S3 origin (content rooted at codap3/). /releases/*
      // and any other path have no /app/ prefix, so this is a natural no-op for them.
      if (uri.indexOf('/app/') === 0) {
        request.uri = uri.slice(4)
      }
      if (LOG_ENABLED) {
        console.log('codap-redirect tag=no-match uri=' + logSafe(uri) +
                    ' qs=' + logSafe(reconstructQuery(request.querystring)) +
                    ' action=origin newuri=' + logSafe(request.uri))
      }
      return request
    }

    if (LOG_ENABLED) {
      var rawQuery = reconstructQuery(request.querystring)
      console.log('codap-redirect tag=' + tag + ' uri=' + logSafe(uri) +
                  ' qs=' + logSafe(rawQuery) +
                  ' action=redirect dest=' + logSafe(logDestination(lang, rawQuery)))
    }
    return buildResponse(lang)
  } catch (e) {
    // R18b — a caught error returns a valid `request`, which CloudFront counts as a
    // SUCCESSFUL execution: it does NOT register on FunctionExecutionErrors. This log line
    // is therefore emitted UNCONDITIONALLY (independent of LOG_ENABLED) so the caught
    // exception stays observable; the R26b metric filter alarms on the "error-fallthrough"
    // tag. (R18b, R30, REL-F1.)
    try {
      console.log('codap-redirect tag=error-fallthrough uri=' + logSafe(event.request.uri) +
                  ' qs=' + logSafe(reconstructQuery(event.request.querystring)) +
                  ' error=' + logSafe(e && e.message ? e.message : e))
    } catch (e2) { /* never let logging itself break the fall-through */ }
    return event.request
  }
}
```

---

### Unit-test the redirect function

**Summary**: A Jest suite that loads the committed `v2-v3-redirect.js` source in a Node VM
context (so the function file stays a pure CloudFront Function — no `module.exports`
scaffolding) and exercises the full R28 positive and R29 negative matrices at the logic
level: path matching, English detection, the synthetic response, headers, the
client-side query/hash construction (run under a minimal VM-context window stub -- see the
IMPLEMENTATION NOTE on `runClientScript`), and the logging and exception paths
(R23 / R30 / R18b — see SE-J1). The suite is parameterized (a Jest `describe.each`) over
**both** the committed source and the built artifact `dist/v2-v3-redirect.js`, so every
assertion runs against the bytes that actually deploy as well as the reviewed source (SE-J3);
a Jest `globalSetup` module runs `build-function.sh` so `dist/` is freshly built before the
suite runs, on every `jest` invocation (RR-J1).

**Files affected**:
- `devops/cloudfront-functions/v2-v3-redirect/v2-v3-redirect.test.js` — new; the suite.
- `devops/cloudfront-functions/v2-v3-redirect/test-harness.js` — new; VM loader (takes a
  target-file argument so the suite can load the committed source or the built artifact —
  SE-J3), a `runClientScript()` helper that extracts the inline `<script>` from a synthetic
  response body and evaluates it under jsdom with a given `search`/`hash`, and a
  `loadHandlerCapturingLogs()` helper (SE-J1) that forces `LOG_ENABLED = true` and captures
  `console.log` output.
- `devops/cloudfront-functions/v2-v3-redirect/jest.globalSetup.js` — new (RR-J1); a Jest
  `globalSetup` module that runs `build-function.sh` so `dist/v2-v3-redirect.js` is freshly
  built before the SE-J3 dual-target suite — on every `jest` invocation (`npm test`,
  `npx jest`, watch mode, IDE runner), not only the `npm test` path a `pretest` hook would
  cover.
- `devops/cloudfront-functions/v2-v3-redirect/package.json` — new; `jest` + `terser`
  devDeps (`terser` drives `build-function.sh`), `npm test` script, and Jest config pointing
  `globalSetup` at `jest.globalSetup.js`. Self-contained (the function is repo-root infra, not
  `v3/` code) — see Open Question IQ2. (Implementation note: the draft listed `jsdom` too,
  but `runClientScript` was implemented with a VM-context stub instead — see the
  "IMPLEMENTATION NOTE" in `test-harness.js` below — so jsdom is not a dependency.)

**Estimated diff size**: ~410 lines.

**Harness** (`test-harness.js`):

```js
const fs = require('fs')
const path = require('path')
const vm = require('vm')
// Note: jsdom was originally proposed here but dropped in implementation -- see the
// IMPLEMENTATION NOTE on runClientScript below.

// SE-J3 — both the committed source and the built artifact are valid load targets; the
// suite (below) runs every assertion against each. Default target is the committed source.
const COMMITTED_SOURCE = 'v2-v3-redirect.js'
const BUILT_ARTIFACT = 'dist/v2-v3-redirect.js'
const readSource = (file) => fs.readFileSync(path.join(__dirname, file), 'utf8')

// Load the function into a fresh VM context and return its `handler`. The function file is
// never modified for testability — it has no module.exports; we eval it and read `handler`.
function loadHandler(file = COMMITTED_SOURCE) {
  const sandbox = { console: { log() {} } }
  vm.createContext(sandbox)
  vm.runInContext(readSource(file) + '\n;this.handler = handler;', sandbox)
  return sandbox.handler
}

// Build a CloudFront Functions viewer-request event.
function makeEvent(uri, { method = 'GET', querystring = '' } = {}) {
  const qs = {}
  if (querystring) {
    for (const pair of querystring.split('&')) {
      const eq = pair.indexOf('=')
      const name = eq < 0 ? pair : pair.slice(0, eq)
      const value = eq < 0 ? '' : pair.slice(eq + 1)
      if (qs[name]) {
        qs[name].multiValue = (qs[name].multiValue || [{ value: qs[name].value }])
        qs[name].multiValue.push({ value })
      } else {
        qs[name] = { value }
      }
    }
  }
  return { request: { method, uri, querystring: qs, headers: {} } }
}

// Extract the inline <script> from a synthetic response body and run it in a fresh VM
// context with a minimal `window.location` stub exposing only the members the script
// reads (`search`, `hash`, `replace`). Returns the URL passed to `window.location.replace()`.
//
// IMPLEMENTATION NOTE: the Phase 3 draft proposed jsdom for this helper. In Cypress /
// Node, jsdom's `window.location` is non-configurable, so we cannot replace `.replace`
// (read-only) or swap the whole `location` object (also non-configurable). A plain VM
// context with a `window` global is sufficient and faithful to what runs in the browser
// (the inline script does not touch any other DOM surface). The package.json devDeps
// therefore do NOT include jsdom.
function runClientScript(body, { search = '', hash = '' } = {}) {
  const script = body.match(/<script>([\s\S]*?)<\/script>/)[1]
  let replaced = null
  const sandbox = {
    window: {
      location: { search, hash, replace(url) { replaced = url } }
    }
  }
  vm.createContext(sandbox)
  vm.runInContext(script, sandbox)
  return replaced
}

// SE-J1 — load the function (committed source or built artifact, SE-J3) with LOG_ENABLED
// forced true and capture every console.log line, exercising reconstructQuery / logSafe /
// logDestination, the per-match log line, and the catch-block error-fallthrough line. The
// toggle is matched with a regex so it also matches the built artifact, where terser's
// default output drops the spaces around `=`. `sandbox` is returned so a test can override a
// context global — e.g. replace `buildResponse` with a throwing stub to drive the catch path
// while request.uri stays a normal string.
function loadHandlerCapturingLogs(file = COMMITTED_SOURCE) {
  const logs = []
  const sandbox = { console: { log: (line) => logs.push(String(line)) } }
  vm.createContext(sandbox)
  const raw = readSource(file)
  const src = raw.replace(/var LOG_ENABLED\s*=\s*false/, 'var LOG_ENABLED = true')
  if (src === raw) { throw new Error('LOG_ENABLED toggle not found in ' + file) }
  vm.runInContext(src + '\n;this.handler = handler;', sandbox)
  return { handler: sandbox.handler, logs, sandbox }
}

module.exports = {
  loadHandler, loadHandlerCapturingLogs, makeEvent, runClientScript,
  COMMITTED_SOURCE, BUILT_ARTIFACT
}
```

**Suite** (`v2-v3-redirect.test.js`) — structure and representative cases; the full suite
table-drives every R28 / R29 row:

```js
const { loadHandler, loadHandlerCapturingLogs, makeEvent, runClientScript,
        COMMITTED_SOURCE, BUILT_ARTIFACT } = require('./test-harness')

const redirected = (res) => res.statusCode === 200 && /<!-- codap-redirect -->/.test(res.body)

// SE-J3 — the entire suite below is wrapped in this describe.each, so every assertion runs
// against BOTH the committed source and the built artifact dist/v2-v3-redirect.js (the Jest
// globalSetup builds dist/ at the start of every run — RR-J1; in watch mode that build is
// from the run's start, not per-edit). Inside the callback `handler` is loadHandler(sourceFile)
// and the logging block's tests call loadHandlerCapturingLogs(sourceFile). The R28 / R29 /
// synthetic-response / logging describe blocks shown below each nest one level inside here.
describe.each([
  ['committed source', COMMITTED_SOURCE],
  ['deployed artifact', BUILT_ARTIFACT],
])('v2-v3-redirect.js (%s)', (label, sourceFile) => {
const handler = loadHandler(sourceFile)

describe('R28 positive matrix — paths that must redirect', () => {
  test.each([
    ['/app',                                        ''],     // R1
    ['/app/static/dg/en/cert/index.html',           ''],     // R2 — English, no ?lang=
    ['/app/static/dg/fr/cert/index.html',           'fr'],   // R3
    ['/app/static/dg/pt-BR/cert/index.html',        'pt-BR'],// R3 region subtag
    ['/app/static/dg/zh-Hans/cert/index.html',      'zh-Hans'],
    ['/app/static/dg/xx/cert/index.html',           'xx'],   // R3 unknown-but-shaped
    ['/releases/latest/',                           ''],     // R4
    ['/releases/build_1234/',                       ''],
    ['/releases/latest/static/dg/fr/cert/index.html','fr'],  // R5
    ['/v3',                                         ''],     // R6a — /v3 alias of current V3
    ['/v3/',                                        ''],     // R6a
    ['/v3/some/deep/path',                          ''],     // R6a — collapses to /app/
  ])('%s redirects (lang=%p)', (uri, lang) => {
    const res = handler(makeEvent(uri))
    expect(redirected(res)).toBe(true)
    // the path-detected lang is the JS literal baked into the inline script
    expect(res.body).toContain('var lang="' + lang + '"')
  })

  test('English V2 codes (en, EN, en-US) get no ?lang=', () => {
    for (const code of ['en', 'EN', 'en-US']) {
      const res = handler(makeEvent(`/app/static/dg/${code}/cert/index.html`))
      expect(res.body).toContain('var lang=""')
    }
  })

  test('HEAD requests to a redirect path produce the synthetic 200 (R18a / PLUG2)', () => {
    // R18a intercepts HEAD as well as GET; PLUG2 — the function returns the same response
    // object for both (CloudFront strips the body for HEAD downstream). Guards against a
    // future refactor narrowing the method check to GET only.
    const get = handler(makeEvent('/app'))
    const head = handler(makeEvent('/app', { method: 'HEAD' }))
    expect(head.statusCode).toBe(200)
    expect(head.headers).toEqual(get.headers)   // identical status + headers to GET
  })

  describe('client-side query + hash construction (R15-R17a, jsdom)', () => {
    test('hash preserved verbatim, no ?lang= for English', () => {
      const res = handler(makeEvent('/app/static/dg/en/cert/index.html'))
      expect(runClientScript(res.body, { hash: '#file=googleDrive:abcd1234' }))
        .toBe('https://codap.concord.org/app/#file=googleDrive:abcd1234')
    })
    test('R17a — path lang wins, query lang stripped, others verbatim', () => {
      const res = handler(makeEvent('/app/static/dg/fr/cert/index.html'))
      expect(runClientScript(res.body,
        { search: '?lang=es&launchFromLara=true&documentServer=https://example.com',
          hash: '#shared=xyz' }))
        .toBe('https://codap.concord.org/app/?lang=fr&launchFromLara=true' +
              '&documentServer=https://example.com#shared=xyz')
    })
    test('R17a/GR2 — lang-only query yields no trailing &', () => {
      const res = handler(makeEvent('/app/static/dg/fr/cert/index.html'))
      expect(runClientScript(res.body, { search: '?lang=es' }))
        .toBe('https://codap.concord.org/app/?lang=fr')
    })
    test('GR3 — duplicate non-lang params preserved in order', () => {
      const res = handler(makeEvent('/app/static/dg/fr/cert/index.html'))
      expect(runClientScript(res.body, { search: '?foo=1&foo=2' }))
        .toBe('https://codap.concord.org/app/?lang=fr&foo=1&foo=2')
    })
  })
})

describe('R29 negative matrix — paths that must NOT redirect (fall through to origin)', () => {
  // [request uri, expected request.uri after the function runs]. Under IQ1=B1 the function
  // strips the /app prefix on /app/* fall-through paths (R1a); /releases/* is unchanged.
  // `/` is a routing-handled negative (function not attached to the default behavior) —
  // covered by the Cypress suite, not here.
  test.each([
    ['/app/static/js/bundle.js',                         '/static/js/bundle.js'],
    ['/app/favicon.ico',                                 '/favicon.ico'],            // GR4
    ['/app/manifest.json',                               '/manifest.json'],          // GR4
    ['/app/static/dg//cert/index.html',                  '/static/dg//cert/index.html'],     // empty {lang}
    ['/app/static/dg/abc123/cert/index.html',            '/static/dg/abc123/cert/index.html'], // digits
    ['/app/static/dg/<script>alert(1)<\/script>/cert/x', '/static/dg/<script>alert(1)<\/script>/cert/x'],
    ['/releases/',                                       '/releases/'],              // empty {name}
  ])('%s falls through (no synthetic response), uri -> %s', (uri, expected) => {
    const res = handler(makeEvent(uri))
    expect(res.statusCode).toBeUndefined()        // no synthetic redirect produced
    expect(res.uri).toBe(expected)
  })

  test('redirect destinations fall through, /app stripped — no loop (QA-F5)', () => {
    for (const qs of ['', 'lang=fr', 'lang=fr&foo=bar']) {
      const res = handler(makeEvent('/app/', { querystring: qs }))
      expect(res.statusCode).toBeUndefined()
      expect(res.uri).toBe('/')
    }
  })

  test('non-GET/HEAD methods fall through unchanged, not even stripped (R18a)', () => {
    for (const method of ['POST', 'OPTIONS', 'PUT']) {
      const res = handler(makeEvent('/app/static/dg/fr/cert/index.html', { method }))
      expect(res.statusCode).toBeUndefined()
      expect(res.uri).toBe('/app/static/dg/fr/cert/index.html')
    }
  })
})

describe('synthetic response shape (R19c, R20a)', () => {
  const res = handler(makeEvent('/app'))
  test('status 200 and the four mandated headers', () => {
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type'].value).toBe('text/html; charset=utf-8')
    expect(res.headers['cache-control'].value).toBe('no-store')
    expect(res.headers['x-content-type-options'].value).toBe('nosniff')
    expect(res.headers['content-security-policy'].value)
      .toBe("default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'")
  })
  test('body content (R19c)', () => {
    expect(res.body).toContain('<html lang="en">')
    expect(res.body).toContain('<title>CODAP</title>')
    expect(res.body).toContain('<p role="status">Loading CODAP…</p>')   // WCAG-I1
    expect(res.body).toContain('<noscript>')
    expect(res.body).toContain('<a href="https://codap.concord.org/app/">Open CODAP</a>')
  })
})

describe('logging + exception paths (R23, R30, R18b — SE-J1)', () => {
  test('per-match redirect line: tag + R17a-processed destination (LOG_ENABLED=true)', () => {
    const { handler, logs } = loadHandlerCapturingLogs(sourceFile)
    handler(makeEvent('/app/static/dg/fr/cert/index.html', { querystring: 'lang=es&foo=bar' }))
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatch(/^codap-redirect tag=app-lang /)
    // logged destination is server-side: path lang wins, query lang dropped (R30 / CR11)
    expect(logs[0]).toContain('dest=https://codap.concord.org/app/?lang=fr&foo=bar')
  })

  test('no-match line records the post-/app-strip newuri', () => {
    const { handler, logs } = loadHandlerCapturingLogs(sourceFile)
    handler(makeEvent('/app/static/js/bundle.js'))
    expect(logs[0]).toMatch(/^codap-redirect tag=no-match /)
    expect(logs[0]).toContain('newuri=/static/js/bundle.js')
  })

  test('logSafe neutralizes whitespace/control chars inside request-derived values', () => {
    const { handler, logs } = loadHandlerCapturingLogs(sourceFile)
    handler(makeEvent('/releases/a b\tc/'))            // space + tab inside {name}
    expect(logs[0]).toContain('uri=/releases/a?b?c/')  // ws within the value -> '?'
  })

  test('catch block emits the error-fallthrough line the R26b metric filter keys on', () => {
    const { handler, logs, sandbox } = loadHandlerCapturingLogs(sourceFile)
    sandbox.buildResponse = () => { throw new Error('induced') } // throw; uri stays a string
    const res = handler(makeEvent('/app'))
    expect(res.statusCode).toBeUndefined()             // R18b — falls through to origin
    expect(logs.some(l => l.indexOf('codap-redirect tag=error-fallthrough') === 0)).toBe(true)
  })
})
})  // end describe.each — runs the whole suite against the committed source and the artifact (SE-J3)
```

Per the skill's "tests may be summarized" allowance, the remaining R28/R29 rows (every
V2-historical language code, `/releases/codap_y2/`, the iframe-embed rows handled by Cypress,
etc.) extend the `test.each` tables above with no new structure.

---

### Function validation and deploy scripts

**Summary**: Four small scripts that operate on the function artifact: `build-function.sh`
strips comments from the committed source to produce the deployed artifact
`dist/v2-v3-redirect.js` (R20b); `check-size.sh` verifies both 10 KB budgets (R20c, gates
G4); `test-function.sh` runs `aws cloudfront test-function` over a sample of R28/R29 URIs and
checks `ComputeUtilization` (R30a, gates G3); `deploy-function.sh` builds, size-checks, then
creates or updates the function in CloudFront.

**Files affected**:
- `devops/cloudfront-functions/v2-v3-redirect/build-function.sh` — new; comment-stripping
  build of the deployed artifact (SE-I2).
- `devops/cloudfront-functions/v2-v3-redirect/check-size.sh` — new.
- `devops/cloudfront-functions/v2-v3-redirect/test-function.sh` — new.
- `devops/cloudfront-functions/v2-v3-redirect/deploy-function.sh` — new.
- `devops/cloudfront-functions/v2-v3-redirect/test-events/` — new dir; JSON event fixtures
  for `test-function` (a sample of R28 positive + R29 negative URIs).
- `dist/v2-v3-redirect.js` is a generated (git-ignored) build output, not a committed file.

**Estimated diff size**: ~240 lines.

`build-function.sh` (R20b / SE-I2) — produces the deployed artifact by stripping comments
from the committed source:

```bash
#!/usr/bin/env bash
# R20b / SE-I2 — build the deployed artifact dist/v2-v3-redirect.js by removing comments from
# the committed, fully-commented source. terser parses the JS properly (a naive regex strip
# would corrupt the RE_* regex literals and the https:// base-URL string). Comment removal
# ONLY (no -c/-m flags) — so the artifact is behavior-identical to the reviewed source.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p dist
# terser CLI: omitting -c/-m disables compression and mangling entirely (the defaults
# are OFF when the flags aren't passed). Trying to pass `false` as a value to -c/-m fails
# in current terser CLI builds with "`false` is not a supported option".
npx terser v2-v3-redirect.js --comments false --output dist/v2-v3-redirect.js
node --check dist/v2-v3-redirect.js          # parse-validity smoke check
echo "built dist/v2-v3-redirect.js ($(wc -c < dist/v2-v3-redirect.js) bytes)"
```

`check-size.sh` (R20c) — builds first, then checks the *deployed* artifact:

```bash
#!/usr/bin/env bash
# R20c — verify the DEPLOYED artifact AND the largest synthetic-response body are each under
# CloudFront's 10 KB limits. Exit non-zero on failure (a build failure, not a runtime one).
set -euo pipefail
cd "$(dirname "$0")"
LIMIT=10240

# Build the deployed artifact first (comment-stripping only; see build-function.sh).
./build-function.sh

# R20b — function package size = exact bytes of the deployed artifact dist/v2-v3-redirect.js.
pkg_bytes=$(wc -c < dist/v2-v3-redirect.js)
echo "deployed function: ${pkg_bytes} / ${LIMIT} bytes"
[ "$pkg_bytes" -le "$LIMIT" ] || { echo "FAIL: deployed function exceeds 10 KB (R20b)"; exit 1; }

# R20 — synthetic-response body size. The body grows with {lang}; the longest {lang} R3's
# pattern admits is 8 chars (xxx-yyyy, e.g. "abc-defg"). Render that worst case and measure it.
body_bytes=$(node -e '
  const { loadHandler, makeEvent } = require("./test-harness");
  const res = loadHandler()(makeEvent("/app/static/dg/abc-defg/cert/index.html"));
  process.stdout.write(String(Buffer.byteLength(res.body, "utf8")));
')
echo "synthetic body:   ${body_bytes} / ${LIMIT} bytes"
[ "$body_bytes" -le "$LIMIT" ] || { echo "FAIL: synthetic body exceeds 10 KB (R20)"; exit 1; }
echo "PASS — both 10 KB budgets satisfied (G4)."
```

`test-function.sh` (R30a) — runs `aws cloudfront test-function` for each fixture in
`test-events/`, parses `ComputeUtilization` from each `TestResult`, and checks the R30a
targets (median < 50 %, p99 < 100 %, none at/near 100 %). Pseudocode of the loop:

```bash
#!/usr/bin/env bash
# R30a — execution-time validation. Gates G3. ComputeUtilization is the measured quantity.
set -euo pipefail
cd "$(dirname "$0")"
source ./config.env
ETAG=$(aws cloudfront describe-function --name "$FUNCTION_NAME" --query 'ETag' --output text)
utils=()
for ev in test-events/*.json; do
  result=$(aws cloudfront test-function --name "$FUNCTION_NAME" --if-match "$ETAG" \
    --stage DEVELOPMENT --event-object "fileb://$ev" \
    --query 'TestResult.ComputeUtilization' --output text)
  echo "  $(basename "$ev"): ComputeUtilization=${result}"
  utils+=("$result")
done
# median < 50, p99 < 100, max not at/near 100 — computed with sort/awk; FAIL => exit 1.
# (full statistics block: sort the array, pick the median and p99 indices, compare.)
```

`deploy-function.sh` — runs `check-size.sh` first (which builds `dist/v2-v3-redirect.js` via
`build-function.sh` and gates on both 10 KB budgets); refuses to deploy unless it passes.
Then `aws cloudfront create-function` (first deploy) or `update-function` (subsequent) with
`--function-code fileb://dist/v2-v3-redirect.js`, runtime `cloudfront-js-2.0` — and, in
**both** cases, `aws cloudfront publish-function` as the final step (DO-J1). `create-function`
/ `update-function` leave the function in the `DEVELOPMENT` stage; a CloudFront Function MUST
be published to the `LIVE` stage before it can be associated with a distribution's cache
behavior. So even the first deploy must publish — otherwise `modify-clone.sh` (which attaches
the function by ARN, X2) has no `LIVE` version to bind and the attach fails. The function must
be in the `LIVE` stage before `modify-clone.sh` runs.

---

### Distribution clone pipeline

**Summary**: The three R26a-mandated scripts that build the new distribution: clone
`E3H9X49AG3GYSO`, apply the V3 cutover cache-behavior changes, and verify the result. These
are grouped as one commit because they form a single pipeline and would be reviewed together.
**Ordering dependency (X2)**: `modify-clone.sh` attaches the redirect function to cache
behaviors *by ARN*, so the function must already be deployed **and published to the `LIVE`
stage** — the "Function validation and deploy scripts" step must land and `deploy-function.sh`
must have run (including its `publish-function` step, DO-J1) — before this step's modify stage
executes.

**Files affected**:
- `devops/cloudfront-functions/v2-v3-redirect/clone-distribution.sh` — new (R26a steps 1-3).
- `devops/cloudfront-functions/v2-v3-redirect/modify-clone.sh` — new (R26).
- `devops/cloudfront-functions/v2-v3-redirect/verify-clone.sh` — new (R26a verification).
- `devops/cloudfront-functions/v2-v3-redirect/expected-diff.md` — new; the R26a allowlist of
  expected source-vs-clone config differences as a **machine-readable list of JSON-path
  entries**, each with a human-readable note on why that difference is expected.
  `verify-clone.sh` enforces it programmatically (SE-J2).

**Estimated diff size**: ~420 lines.

`clone-distribution.sh` (R26a steps 1-3):
1. `aws cloudfront get-distribution-config --id "$PROD_DIST_ID"` → capture `DistributionConfig`
   and `ETag`; save the raw config as `artifacts/prod-config.json` (the diff baseline).
2. `jq` transform: new `CallerReference` (timestamp), set `Aliases` to **only**
   `$TEMP_SUBDOMAIN` (R24a / RR6 — required so HTTPS works for pre-flip validation; not
   left empty), keep `ViewerCertificate.ACMCertificateArn = $ACM_CERT_ARN`, keep all origins
   and all cache behaviors with their existing function associations unchanged.
3. `aws cloudfront create-distribution --distribution-config file://...` → write the new
   distribution's `Id` and `DomainName` back into `config.env` as `CLONE_DIST_ID` /
   `CLONE_DIST_DOMAIN`. Print the `aws cloudfront wait distribution-deployed` command.
4. **Response-headers-policy determination (DO-I1)** — from the captured prod config plus a
   `curl -I` on `https://codap.concord.org/` and an `/app/...` URL, determine whether the
   security headers `codap.concord.org` serves today (HSTS etc.) come from a CloudFront
   response-headers policy or are emitted by the origin. This is a pure inspection of
   `E3H9X49AG3GYSO` — it needs no clone, so the decision is made *before* `modify-clone.sh`
   runs. Write the outcome to `config.env`: `RHP_REQUIRED` (`true` if the `/app` / `/app/*` /
   `/releases/*` behaviors carry no `ResponseHeadersPolicyId` and the headers are
   origin-emitted, so the origin swap would drop them; `false` if a policy already covers them
   and the clone inherits it) and, when a policy already exists, `RHP_ID`. `modify-clone.sh`
   consumes this; `verify-clone.sh` later confirms it on the clone.

`modify-clone.sh` (R26) — `jq`-edits the clone's `DistributionConfig` then
`update-distribution`. Concretely, on the clone only:
- **`/app/*`** and **`/app`**: change `TargetOriginId` to the V3 S3 origin
  `S3-Website-models-resources-codap3` (`OriginPath: /codap3`); attach the redirect function
  (`FunctionAssociations`, `EventType=viewer-request`). That one function both redirects
  V2-shape paths and strips the `/app` prefix on V3 passthrough paths (IQ1 = B1 / R1a) — no
  separate strip function and no extra cache behavior.
- **`/releases/*`**: change `TargetOriginId` to the V3 S3 origin; attach the redirect function.
- **New carve-out behaviors** → `codap server` (V2 origin), no function:
  `/releases/.gapikey`, `/releases/staging`, `/releases/staging/*`, `/releases/zips/*`,
  `/releases/var/*`, `/releases/apple-touch-icon.png`.
- **New `/v3` and `/v3/*` behaviors** → origin `S3-Website-models-resources-codap3` (V3 S3),
  with the redirect function attached. The function redirects every `/v3*` request to `/app/`
  (R6a), so the origin is never reached — V3 S3 is chosen only for consistency. No
  version-pinned origin (IQ4 = redirect to `/app/`, not version-pinning).
- **Cache-behavior precedence (GR1)**: the script inserts each carve-out and the existing
  TP-Sampler behaviors at **higher precedence** (earlier in `CacheBehaviors.Items`) than the
  general `/app/*` and `/releases/*` behaviors. `jq` builds the ordered array explicitly.
- **Response-headers policy (DO-I1)**: if `clone-distribution.sh`'s step-4 determination set
  `RHP_REQUIRED=true` in `config.env` (security headers are origin-emitted, so the origin swap
  would drop them), this script attaches a response-headers policy to `/app`, `/app/*`,
  `/releases/*` (R26a / SEC-F2). If `RHP_REQUIRED=false`, the clone already inherited the
  existing policy and nothing is added. This consumes a decision already made — it does **not**
  depend on `verify-clone.sh`.
- All other behaviors (default/WPEngine, `/codap-resources/*`, `/v2`, `/v2/*`, `/~user/*`,
  `/sage*`) are left untouched.

`verify-clone.sh` (R26a verification — two parts):
1. **Structured config diff**: `aws cloudfront get-distribution-config` for both
   distributions; normalize with `jq` (sort keys, drop wrapper fields); diff the two as a set
   of JSON-path differences; check **every** difference against the `expected-diff.md`
   machine-readable allowlist — `CallerReference`, `Aliases`, the `/app` / `/app/*` /
   `/releases/*` origin swaps + function attachments, the new carve-out behaviors, the `/v3`
   behaviors, the response-headers-policy attachments, and the carve-out/TP-Sampler precedence
   ordering. The script prints a human-readable summary of every difference and its allowlist
   match, and **exits non-zero on any difference not in the allowlist** (blocks the flip). The
   allowlist is the gate — the printed summary is for the reviewer who signs the G-criterion,
   not a substitute for the programmatic check (SE-J2).
2. **Response-header check** (`curl -I`) — *confirms* (does not decide — DO-I1) that the
   step-4 `RHP_REQUIRED` determination held: the security headers are present on the clone
   after the origin swap. Run against the clone at `$TEMP_SUBDOMAIN`, against
   **both** (a) an origin-served URL on an origin-swapped behavior (e.g.
   `/app/static/js/...`) and (b) a URL that triggers the function's **synthetic response**
   (e.g. `/app/static/dg/en/cert/index.html`). Assert `Strict-Transport-Security` and every
   other security header `codap.concord.org` serves today are present on **each**. If (b) is
   missing HSTS, the script prints the R20a HSTS-contingency instruction (add the header to
   `v2-v3-redirect.js` and redeploy).

**Manual step — Drive OAuth authorization (R27 clone step 6a, X1).** Once the clone is
reachable at `$TEMP_SUBDOMAIN`, the temp subdomain must be authorized in the Google Cloud
Console for the CODAP Drive OAuth client so Drive double-click can be validated end-to-end
pre-flip (R27 Path A → G6). This is a console action with no scripted artifact; it is listed
as an explicit task in the Step 10 runbook's pre-flip prerequisites, and its removal is a
post-flip follow-up (requirements Out of Scope / CC4).

---

### DNS audit script

**Summary**: `dns-audit.sh` performs and captures the R26c pre-flip DNS audit — every record
under `*.codap.concord.org`, the `concord.org` apex CAA records, and DNSSEC state.

**Files affected**:
- `devops/cloudfront-functions/v2-v3-redirect/dns-audit.sh` — new.
- `devops/cloudfront-functions/v2-v3-redirect/dns-audit-record.md` — generated; the captured
  audit output with each record classified (irrelevant / handled / unhandled-action-required).
  Committed as the R26c record — written at the folder root, **not** under the git-ignored
  `artifacts/`, so the one artifact meant to be committed is committed by intent (SEC-J1).

**Estimated diff size**: ~110 lines.

The script:
- `aws route53 list-resource-record-sets --hosted-zone-id "$HOSTED_ZONE_ID"` → filter to
  names at or under `codap.concord.org`; emit a Markdown table (name, type, current target)
  with a blank **Classification** column for the operator to fill.
- `dig CAA concord.org +short` → record apex CAA; flag any value that would block ACM renewal.
- `aws route53 get-dnssec --hosted-zone-id "$HOSTED_ZONE_ID"` → assert DNSSEC is disabled.
- Write everything to `dns-audit-record.md` (folder root, committed — not the git-ignored
  `artifacts/`). The classification step is human; the script produces the skeleton and the
  operator completes it before flip (G-criteria sign-off).

---

### CloudWatch alarms and synthetic monitors

**Summary**: `deploy-monitoring.sh` creates the seven R26b checks — five CloudWatch alarms
(incl. the `error-fallthrough` log metric filter), and two CloudWatch Synthetics canaries —
and a soak dashboard. Gates G5.

**Files affected**:
- `devops/cloudfront-functions/v2-v3-redirect/deploy-monitoring.sh` — new.
- `devops/cloudfront-functions/v2-v3-redirect/canaries/v3-reachability.js` — new; canary
  handler — HTTPS GET of `/app/`, assert the V3 marker `codap-app-id`.
- `devops/cloudfront-functions/v2-v3-redirect/canaries/redirect-correctness.js` — new; canary
  handler — HTTPS GET of `/app/static/dg/en/cert/index.html`, assert the synthetic-redirect
  body marker `<!-- codap-redirect -->`.
- `devops/cloudfront-functions/v2-v3-redirect/verify-alarms.sh` — new; induces an error
  against each of the seven checks and confirms each transitions to ALARM (G5's "verified to
  fire on a synthetic error"). Per-check induction methods are documented in the script — see
  the induction-method note below (DO-I3).

**Estimated diff size**: ~320 lines.

`deploy-monitoring.sh` creates:
1. **`FunctionExecutionErrors`** alarm — namespace `AWS/CloudFront`, dimensions
   `FunctionName=$FUNCTION_NAME`, threshold `> 0`, 1 datapoint of 1 min → high-severity.
2. **`error-fallthrough` metric filter + alarm** — first `aws logs create-log-group
   --log-group-name /aws/cloudfront/function/$FUNCTION_NAME --region us-east-1` (DO-I2 —
   idempotent, ignore `ResourceAlreadyExistsException`; CloudFront Function logs always land
   in `us-east-1`, and the group is otherwise created only lazily on the function's first log
   emission — so `put-metric-filter` would fail with `ResourceNotFoundException` if monitoring
   deploys before any traffic). Then `aws logs put-metric-filter` on that log group, pattern
   `"codap-redirect tag=error-fallthrough"` (the full log-line prefix, not the bare
   `tag=error-fallthrough` substring — SEC-I1: the genuine error line is the only place that
   contiguous token sequence appears, and a logged `uri`/`qs` value cannot forge it because
   the function `logSafe()`-strips whitespace from request-derived values); → custom metric;
   alarm `> 0`, 1 min → high-severity (R18b/REL-F1 — the only signal for caught exceptions).
   All `aws logs` calls in this script pin `--region us-east-1`. The metric-filter pattern
   `"codap-redirect tag=error-fallthrough"` MUST stay byte-identical to the prefix the
   function's catch block emits; the SE-J1 catch-block unit test pins that prefix, so the
   function and this filter cannot drift unnoticed.
3. **`FunctionThrottles`** alarm — `> 0` → high-severity.
4. **`5xxErrorRate`** alarm — namespace `AWS/CloudFront`, `DistributionId=$CLONE_DIST_ID`,
   `> 1 %` sustained 2 min → high-severity.
5. **`4xxErrorRate`** alarm — `> 5 %` sustained 5 min → informational.
6. **Two Synthetics canaries** — the `canaries/*.js` handlers, schedule `rate(1 minute)`.
   **Pre-flip both target `$TEMP_SUBDOMAIN`** (R26b / DO-F2 — pre-flip `codap.concord.org`
   still resolves to V2, so a `codap.concord.org` probe could not be green); re-pointing them
   to `codap.concord.org` is a flip-day runbook step.
7. A CloudWatch dashboard tiling all seven checks for the R25a soak.

**Per-check induction methods (DO-I3)** — `verify-alarms.sh` cannot fire every check with one
generic "synthetic error"; it documents and performs a method per check:
- **`error-fallthrough` metric filter, the two synthetic monitors, `4xxErrorRate`** — induced
  directly: emit a log line carrying the error tag / point a monitor at a deliberately-wrong
  URL / request a known-404 path repeatedly.
- **`FunctionExecutionErrors` (and `5xxErrorRate`, which rises with it)** — *cannot* be induced
  by any normal request: R18b's try/catch makes every caught error a *successful* execution
  that never touches `FunctionExecutionErrors`. To verify it, `verify-alarms.sh` temporarily
  `update-function` + `publish-function`s a deliberately-broken build of the function to the
  clone (a `handler` that throws uncaught / returns an invalid object), **waits for that
  publish to propagate to the edge** (DO-J2 — `publish-function` reaches edge locations
  asynchronously, typically minutes; the script polls function status or waits a documented
  propagation margin rather than driving requests immediately, which would otherwise hit the
  still-good version and fire nothing), drives a handful of real viewer requests at the clone
  (pre-flip — no real users), **waits out the alarms' evaluation periods**, confirms
  `FunctionExecutionErrors` and `5xxErrorRate` transition to ALARM, then restores the real
  function via `deploy-function.sh` and **waits for that restore publish to propagate** before
  reporting success. One induced break exercises both alarms (RB5 — function errors surface
  as 5xx).
- **`FunctionThrottles`** — shares the inducement difficulty: throttling needs a request rate a
  single operator cannot easily generate. `verify-alarms.sh` either drives a brief request
  burst against the clone or, if that is impractical, records a documented G5 exception for
  this one check (the lowest-likelihood failure mode of the seven) — the choice is made in
  implementation, not silently skipped.

**Abort safety (DO-J2)** — because `verify-alarms.sh` deliberately publishes a broken function
to the live clone, it MUST guarantee the restore even on failure: a shell `trap` on `EXIT` /
`ERR` re-runs the real `deploy-function.sh` publish on any exit (including an abort mid-run),
and the script makes a final post-condition check that the clone is serving the real function
before it reports success. Without this, a mid-run abort would leave the clone serving 5xx on
`/app`, `/app/*`, `/releases/*` — a worse state than a `flip.sh` abort, which DO-I4 already
made abort-safe; `verify-alarms.sh` gets the same guarantee.

The RUNBOOK's G5 evidence row records which method verified each check.

Per IR2, no alarm action targets are set — monitoring is a manual console/CLI watch; the
high-severity / informational tags are severity classifications, not routing.

---

### Flip and rollback scripts

**Summary**: `flip.sh` and `rollback.sh` — the two-step flip-day procedure (R24/R24a) and its
reverse (R25), each with the mandatory `Deployed`-wait between the `associate-alias` move and
the Route 53 swap (DO-F6).

**Files affected**:
- `devops/cloudfront-functions/v2-v3-redirect/flip.sh` — new.
- `devops/cloudfront-functions/v2-v3-redirect/rollback.sh` — new.
- `devops/cloudfront-functions/v2-v3-redirect/route53-change.sh` — new; shared helper that
  UPSERTs a Route 53 ALIAS A record. Takes two positional args: record name and target
  CloudFront DomainName. Used by `flip.sh`, `rollback.sh`, and `setup-temp-subdomain.sh`.
- `devops/cloudfront-functions/v2-v3-redirect/setup-temp-subdomain.sh` — new; pre-flip
  setup that points the temp subdomain at the clone. `clone-distribution.sh` adds the
  temp subdomain to the clone's CloudFront `Aliases` (cert validation), but DNS still
  needs a Route 53 record for `https://$TEMP_SUBDOMAIN` to actually resolve (R27 /
  Technical Notes step 6). Thin wrapper around `route53-change.sh` with idempotency
  pre-check and a verification hint.

**Estimated diff size**: ~250 lines.

`flip.sh` — refuses to run without an explicit `--confirm` flag; **resumable** — on startup it
probes the current state and skips any already-completed action (DO-I4), printing what it
detected (e.g. "step 1 done — resuming at the wait"). It prints each step:
1. **Step 1** — `aws cloudfront associate-alias --target-distribution-id "$CLONE_DIST_ID"
   --alias codap.concord.org` (moves the CNAME off `E3H9X49AG3GYSO` onto the clone, R24a).
   *Skipped* if `codap.concord.org` is already in the clone's `Aliases`.
2. **Wait** — `aws cloudfront wait distribution-deployed --id "$CLONE_DIST_ID"` (DO-F6 — step 3
   MUST NOT be issued until this returns). Naturally idempotent — safe to re-run.
3. **Step 2** — `route53-change.sh codap.concord.org "$CLONE_DIST_DOMAIN"` UPSERTs the
   ALIAS A record in `$HOSTED_ZONE_ID` to target `$CLONE_DIST_DOMAIN` (AliasTarget
   HostedZoneId `Z2FDTNDATAQYW2` — CloudFront's fixed alias zone —
   `EvaluateTargetHealth=false`). UPSERT is idempotent; reported as already-done if the
   record already targets the clone.
4. Print the post-flip checklist pointer (re-point canaries; R31b active-watch).

`rollback.sh` — the same actions reversed and equally resumable: `associate-alias` back to
`$PROD_DIST_ID` (skipped if the alias is already on prod), wait for `distribution-deployed` on
`$PROD_DIST_ID`, then the Route 53 ALIAS back to `$PROD_DIST_DOMAIN` (reported as already-done
if already there). Both scripts document the expected brief `403` window between steps.

**Mid-abort recovery (DO-I4)** — the danger window is between step 1 and step 3: the
`codap.concord.org` CNAME has moved off `E3H9X49AG3GYSO` (which then `403`s every request)
while DNS still resolves there. R24a documents this as a *brief* window — but if `flip.sh`
aborts inside it, the window stays open until a human acts. The window is only indefinite
while no one is acting: recovery is to either **re-run `flip.sh`** (it resumes forward — DNS
moves to the clone, closing the window) **or run `rollback.sh`** (re-associates the alias onto
prod, closing the window) — the operator chooses by whether the flip should still proceed.
Because both scripts are resumable, a re-run after an abort is always safe. The RUNBOOK's
forward-flip and rollback sections both restate this recovery path.

---

### Pre-flip conformance suite (Cypress)

**Summary**: A Cypress spec that drives a real browser through the full R28 positive / R29
negative matrix against the temp subdomain — following the client-side JS redirect
end-to-end, asserting the final landing URL (hash + query preserved), and exercising the
iframe-embed / iframe-phone re-handshake rows of R28. Produces the G1/G2 evidence.

**Files affected**:
- `v3/cypress/e2e/v2-v3-redirect.spec.ts` — new; the conformance spec (see Open Question IQ3
  for placement; assumes `v3/cypress/e2e/` with exclusion from the default/regression glob).
- `v3/cypress/fixtures/v2-v3-redirect-iframe-harness.html` — new; minimal harness page that
  hosts the test `<iframe>` for the R28 iframe-embed rows.
- `v3/cypress.config.ts` — modified; add a `redirectBaseUrl` env default
  (`https://codap2to3.concord.org`) and exclude `v2-v3-redirect.spec.ts` from the default
  `specPattern` run (it requires the temp subdomain, which exists only pre-flip).

**Estimated diff size**: ~230 lines.

The spec is table-driven from the R28/R29 matrices. Each R28 row: `cy.visit()` the V2-shape
URL on `redirectBaseUrl`, wait for the client-side redirect, assert `cy.location()` is the
expected `/app/...` URL with `?lang=` / query / hash exactly as R28 specifies.

Each R29 row: `cy.request()` (no redirect-follow) the URL and assert **two** things —
(a) the redirect function did not fire (body has no `<!-- codap-redirect -->`), **and**
(b) the response came from the *expected origin* (QA-I1 — G2 requires "serves the expected
origin," not merely "not the synthetic page"; assertion (a) alone would pass a misrouted
carve-out that serves a V3-S3 404, the precise GR1 cache-behavior-precedence failure this
suite must catch). Each row carries its expected origin and an origin-identifying signal:

| Expected origin | R29 paths | Identifying signal |
|---|---|---|
| Marketing site (WPEngine) | `/` | `x-powered-by` response header contains `WP Engine` |
| V2 origin (`codap server`) | `/releases/.gapikey`, `/releases/staging`, `/releases/staging/...`, `/releases/zips/...`, `/releases/var/...`, `/releases/apple-touch-icon.png`, `/v2/...`, `/~user/...` | a distinctive V2/`codap server` header or body marker (exact string TBD in implementation, per the same "marker TBD" latitude R26b uses) |
| V3 S3 | malformed-`{lang}` fall-through, `/app/*` V3-asset paths, `/app/favicon.ico`, redirect-destination paths, `/releases/` | S3-website signature — an `x-amz-*` / `Server` response header, or the known V3-S3 404 body for the 404 cases |
| S3 (TP-Sampler) | `/releases/latest/extn/plugins/TP-Sampler/*`, `/app/extn/plugins/TP-Sampler/*` | TP-Sampler asset served (200, asset content-type) |

The exact marker strings are settled during implementation; the step pins the requirement
that every R29 row asserts its expected origin positively.

The iframe rows load the harness page (which hosts `<iframe src="<V2-shape-URL>">`) and
assert **only** that the iframe's final `src` / `location` is the expected `/app/?...` URL
with query + hash preserved — once for English (no `?lang=`) and once for a non-English
`{lang}` (`?lang=` injected). This confirms the client-side redirect works in an iframe
context; it deliberately does **not** test postMessage or iframe-phone (QA-I3 — whether V3's
iframe-phone channel re-handshakes after the redirect is a property of V3 / the LARA-AP
integration, not the redirect function, and is out of scope). The spec is run on demand
during pre-flip validation
(`npx cypress run --spec cypress/e2e/v2-v3-redirect.spec.ts --env redirectBaseUrl=...`), not in
CI regression.

---

### Pre-flight pipeline document

**Summary**: `PREFLIGHT.md` — the ordered build-and-validate pipeline that stands up the
clone at the temp subdomain and collects G1 – G6 evidence. Run BEFORE `RUNBOOK.md`. The
spec's individual phases each list "Files affected" but never tie them together into a
single ordered runlist; `PREFLIGHT.md` is that runlist, plus pointers at the manual
steps (Google OAuth temp-subdomain authorization for Drive, DNS-audit classification,
Drive double-click validation).

**Files affected**:
- `devops/cloudfront-functions/v2-v3-redirect/PREFLIGHT.md` — new.

**Estimated diff size**: ~190 lines.

`PREFLIGHT.md` contents (each step is a single command unless noted):
- **0. Configure** — copy `config.env.example` to `config.env`; confirm identifier values.
- **1. Build, size-check, and deploy the redirect function** — `deploy-function.sh`.
- **2. Clone the production distribution** — `clone-distribution.sh` then
  `aws cloudfront wait distribution-deployed`.
- **3. Point the temp subdomain at the clone** — `setup-temp-subdomain.sh` (creates the
  Route 53 record so `https://$TEMP_SUBDOMAIN` resolves).
- **4. Apply the V3 cutover cache-behavior changes** — `modify-clone.sh` then wait
  `distribution-deployed`.
- **5. Verify the clone matches the expected config diff** — `verify-clone.sh` (the
  SE-J2 automated gate).
- **6. DNS audit** — `dns-audit.sh`; operator classifies each row.
- **7. Deploy monitoring** — `deploy-monitoring.sh`.
- **8. Verify alarms (G5 gate)** — `verify-alarms.sh`.
- **9. Function execution-time validation (G3 gate)** — `test-function.sh`.
- **10. Final size budget (G4 gate)** — `check-size.sh` (also run by `deploy-function.sh`;
  standalone run produces clean evidence).
- **11. Authorize the temp subdomain in Google OAuth (X1)** — manual console action.
- **12. Run the Cypress conformance suite (G1 + G2 gates)** — `npx cypress run --spec
  cypress/e2e/v2-v3-redirect.spec.ts --env redirectBaseUrl=https://codap2to3.concord.org`.
- **13. Drive double-click validation (G6 gate)** — manual end-to-end check (R27 Path A).

The README's "Where to start" section points readers at PREFLIGHT.md first, RUNBOOK.md
second.

---

### Flip-day runbook

**Summary**: `RUNBOOK.md` — the R31-mandated checked-in operational runbook. It must exist
before any G1–G9 sign-off begins. This is the source of truth for *who does what and when*
on flip day; the requirements spec is the source of truth for *what must be true*.

A pointer at the top of `RUNBOOK.md` directs readers to run `PREFLIGHT.md` first.

**Files affected**:
- `devops/cloudfront-functions/v2-v3-redirect/RUNBOOK.md` — new.

**Estimated diff size**: ~270 lines.

`RUNBOOK.md` contains exactly the R31 enumerated sections:
- **G1–G9 go/no-go checklist** — one row per criterion with sign-off slots (name, date,
  evidence link). Evidence links point at the script artifacts: G1/G2 → the Cypress run
  report; G3 → `test-function.sh` output; G4 → `check-size.sh` output; G5 →
  `verify-alarms.sh` output; G6 → R27 Path A/B record; G7 → sibling-story status; G8 →
  CODAP-1322; G9 → the named rollback authorities.
- **Pre-flip manual prerequisites** — non-scripted actions, each with an owner and a
  done-check, that must be completed before G-criteria sign-off: authorize
  `codap2to3.concord.org` in the Google Cloud Console for the CODAP Drive OAuth client (R27
  clone step 6a — prerequisite for the G6 Drive double-click validation via Path A, X1);
  complete the R26c DNS-audit record classification; confirm the R25c rollback authorities.
- **Forward flip** — the exact `flip.sh` invocation, expanded into its three commands
  (`associate-alias`, `aws cloudfront wait distribution-deployed`, `change-resource-record-sets`
  with zone `Z2P4W3M7MDAUV6`, record `codap.concord.org`, ALIAS target, `EvaluateTargetHealth`
  flag, source/target distribution IDs), the mandated ordering and the `Deployed`-before-DNS
  wait, and the expected brief `403` window.
- **Rollback** — the `rollback.sh` invocation expanded the same way (reverse order); the R25
  propagation caveat (declare "complete" on error-rate metrics returning to baseline, not
  elapsed time).
- **Mid-abort recovery** (DO-I4) — what to do if `flip.sh` or `rollback.sh` aborts between the
  `associate-alias` move and the Route 53 swap (the `403` window): both scripts are resumable,
  so re-run the same script to continue forward, or run the opposite script to back out —
  either closes the window. The window stays open only while no one is acting.
- **Canary re-pointing** — the flip-day step that moves both Synthetics canaries from
  `codap2to3.concord.org` to `codap.concord.org` (R26b / DO-F2).
- **Alarm + monitor URLs** and the soak dashboard URL (R26b).
- **Rollback authorities** — primary (CODAP V3 engineering lead) and secondary on-call,
  name + phone/Slack/email (R25c; filled in before flip).
- **Pointer to CC operational / on-call docs** for detection and rollback-response timing
  (IR3 — not restated here).
- **Post-flip first-hour active-watch protocol** (R31b — 60 min, dedicated attention, alarm
  check ≥ every 5 min).
- **Support tier-1 diagnosis path** (CS2 — reproduce in an anonymous window, inspect the URL
  bar after redirect, distinguish redirect-didn't-fire from V3-app-failure, escalation
  contact).
- **`LOG_ENABLED` enable/revert protocol** (Fin2 — max-enablement window, revert-date
  tracking, post-debug verification that committed source has `LOG_ENABLED = false`).
- **Post-soak old-distribution disposition** (R25a / XR1) — the post-soak lifecycle of
  `E3H9X49AG3GYSO`, with no implementation script (it is a one-time manual operation long
  after the code work): once R25a's soak exit conditions are met, the exact `aws cloudfront`
  invocations to detach `codap.concord.org` from its `Aliases` and set it `Disabled`; then,
  90 days later (~2026-09, the date the Out of Scope list anticipates), the
  `aws cloudfront delete-distribution` step. A note that until deletion the disabled
  distribution remains a one-click re-enable for rollback (R25a).

The runbook ships with the rollback-authority names and the `CLONE_DIST_ID` as fill-in
placeholders (the clone ID is known only after `clone-distribution.sh` runs).

---

### Playbook -- ongoing-maintenance recipes

**Summary**: `PLAYBOOK.md` -- recipes for changes that come up **after** the cutover
lands. Each recipe lists the file edits in order plus the verification step. This is
the sibling of `RUNBOOK.md` (cutover-day operational) and `PREFLIGHT.md` (one-time
setup): it's the maintenance reference for "the cutover is done, now what do I do when
the rules need to change."

The need for this surfaced during Phase 3 testing -- when a redirect rule changes, the
edit touches 5+ files (requirements row, function code, Jest test, Cypress test,
test-events fixture, and sometimes `modify-clone.sh` + `expected-diff.md`) that must
stay in sync. `cc-code-review` catches drift, but having the mechanical edit list in
one place saves the discovery time.

**Files affected**:
- `devops/cloudfront-functions/v2-v3-redirect/PLAYBOOK.md` -- new.

**Estimated diff size**: ~150 lines.

`PLAYBOOK.md` is a living document; recipes are added when the same multi-file update
is performed twice. The initial set:

- **Recipe 1 -- Add a new URL pattern that SHOULD redirect.** Spec row in `requirements.md`
  (R1-R6, R28), function `RE_*` + handler branch, Jest + Cypress positive-matrix rows, a
  `test-events/r28-*.json` fixture, and (rarely) a new `modify-clone.sh` cache behavior.
- **Recipe 2 -- Stop redirecting a path (false positive / new carve-out).** R29 row, regex
  tightening OR a higher-priority handler branch, Jest + Cypress negative-matrix rows
  with origin signal, an `r29-*.json` fixture, and (commonly) a new `modify-clone.sh`
  carve-out behavior plus the matching `expected-diff.md` allowlist entry.
- **Recipe 3 -- Roll a debugging window with `LOG_ENABLED = true`.** Fin2 protocol
  ported into a step-by-step.
- **Recipe 4 -- Things that do NOT need updating when redirect rules change.** Saves a
  reader from looking.
- **Recipe 5 -- Renaming the `error-fallthrough` log-line prefix.** A "do not do this
  lightly" recipe; the prefix is the only signal for caught exceptions and three places
  must stay byte-identical (the function source, the SE-J1 test, and the
  `deploy-monitoring.sh` filter pattern).

The README's "Where to start" section lists PLAYBOOK alongside PREFLIGHT and RUNBOOK.

## Open Questions

<!-- Implementation-focused questions only. Requirements questions go in requirements.md. -->

### RESOLVED: IQ1 — Exact `/app` / `/app/*` → V3 S3 origin configuration on the clone
**Context**: R26 says change the `/app` and `/app/*` behaviors' origin to "the V3 S3 origin"
so post-redirect requests serve V3. But V3 is deployed to `s3://models-resources/codap3/`
(release workflow: `PREFIX=codap3`, `index.html` at `codap3/index.html`). If the `/app/*`
behavior simply points at the `models-resources` S3 origin with `OriginPath: /codap3`, a
request for `/app/static/js/bundle.js` reaches origin as `/codap3/app/static/js/bundle.js` —
which does not exist (V3 assets are at `codap3/static/...`, not `codap3/app/static/...`).
Something must reconcile the `/app` URL prefix with the V3 S3 layout. The redirect function
deliberately does **not** rewrite URIs for fall-through paths (R1, R29). `codap3.concord.org`
already serves V3 from this bucket — its distribution's working origin/behavior config is the
reference. This must be pinned before `modify-clone.sh` is written.
**Options considered**:
- A) The `/app/*` behavior uses an S3 origin with `OriginPath: /codap3/app` and the V3 build
  is deployed under `codap3/app/` (a V3-deploy-side change — likely a CODAP-1322 concern).
- B) A second, separate CloudFront Function (a URI prefix-strip, like `StripCodapResourcesPrefix`)
  is attached to `/app/*` to strip the leading `/app` before origin — so `/app/static/...` →
  `codap3/static/...`. This function would be in scope for CODAP-1323's `modify-clone.sh`.
- C) The `/app/*` behavior mirrors exactly how `codap3.concord.org`'s distribution
  (`E7WVRGISCR2VR`) serves the V3 app today — clone that behavior/origin verbatim. Requires
  inspecting that distribution first.
- D) V3-at-`/app/` serving is out of scope for CODAP-1323 and owned by a sibling/CODAP-1322;
  `modify-clone.sh` only swaps the origin and a separate story makes `/app/` resolve.

**Decision**: **B1** (interview, 2026-05-22). AWS-CLI investigation confirmed the V3 S3 origin
`S3-Website-models-resources-codap3` (`OriginPath: /codap3`) serves V3 rooted at `codap3/`
(index `codap3/index.html`, hashed assets `codap3/version/{tag}/…`) — exactly as
`codap3.concord.org` (distribution `E7WVRGISCR2VR`) serves it from its default behavior with
no rewrite. The only mismatch on the new `codap.concord.org` clone is the `/app` URL segment.
The redirect function — already the lone viewer-request function permitted on `/app/*` —
strips the `/app` prefix on its fall-through path; a *separate* strip function cannot share
the behavior (one function per event type per behavior). So one combined function, no new
cache behavior: `modify-clone.sh` swaps the `/app` / `/app/*` origins to
`S3-Website-models-resources-codap3` and attaches that function. requirements.md is amended —
new **R1a**, with notes added to R1/R21/R26 — to record the strip, which the requirements
named the origin for but never reconciled against the `/app`-prefix-vs-S3-key mismatch.
Options A (deploy V3 under `codap3/app/`) and the separate-function variant of B were
rejected: A pushes a V3-deploy change into a date-critical story; a separate function would
need an extra cache behavior + precedence rule for no functional gain over the combined
function. C/D folded into this decision (C = the codap3.concord.org reference was used; the
V3 content layout itself needs no change).

### RESOLVED: IQ2 — Where do the function's Jest unit tests live and run?
**Context**: `v2-v3-redirect.js` is repo-root infrastructure under `devops/`, not `v3/` app
code. Its Jest suite needs `jest` + `jsdom`. The draft assumes a **self-contained**
`package.json` in `devops/cloudfront-functions/v2-v3-redirect/` (its own small `node_modules`,
`npm test` run from that folder).
**Options considered**:
- A) Self-contained `package.json` + `node_modules` under the function folder (draft
  assumption) — keeps the devops tooling fully independent of the `v3/` build.
- B) Add the test files to `v3/`'s existing Jest project (`jest` + `jsdom` already present
  there) — no new `node_modules`, but couples repo-root infra tests to the `v3/` package and
  its `testRegex`.
- C) Add them to the repo-root (v2) `package.json`'s test setup.

**Decision**: **A** (interview, 2026-05-22) — a self-contained `package.json` + `node_modules`
under `devops/cloudfront-functions/v2-v3-redirect/`, with `npm test` run from that folder.
The CloudFront Function is infrastructure independent of both CODAP apps; its test tooling
stays independent too and does not inherit `v3/`'s MST/transform/`moduleNameMapper` Jest
config. Matches the draft (Step 3).

### RESOLVED: IQ3 — Where does the Cypress conformance spec live, and how is it kept out of CI regression?
**Context**: The R28/R29 conformance spec drives a browser against the temp subdomain
`codap2to3.concord.org` — a transient external host, not the V3 app. The draft assumes it
lives in `v3/cypress/e2e/` (reusing the existing Cypress install per the Q3=B decision),
parameterized by a `redirectBaseUrl` env var, and **excluded** from the default `specPattern`
so it does not run in the v3 regression suite (it would fail whenever the temp subdomain does
not exist).
**Options considered**:
- A) `v3/cypress/e2e/v2-v3-redirect.spec.ts`, excluded from the default `specPattern`; run
  on demand with `--spec` (draft assumption).
- B) A standalone Cypress install + config under `devops/cloudfront-functions/v2-v3-redirect/cypress/`
  — fully isolated from `v3/`, but a second Cypress dependency tree.
- C) Keep it in `v3/cypress/e2e/` with the default glob but guard the whole spec with a
  runtime skip unless `redirectBaseUrl` is supplied.

**Decision**: **A** (interview, 2026-05-22) — `v3/cypress/e2e/v2-v3-redirect.spec.ts`,
parameterized by a `redirectBaseUrl` env var and **excluded** from the default `specPattern`
so it never runs in v3 regression; run on demand with `--spec` during pre-flip validation.
Reuses the existing Cypress install per foundational decision Q3 = B (a standalone Cypress
under `devops/` would undercut that rationale). Matches the draft (Step 9).

### RESOLVED: IQ4 — `/v3` / `/v3/*` version-pinned origin and version selection
**Context**: R26 / Q13 add `/v3` and `/v3/*` behaviors serving a version-pinned V3 build. V3
version-pinned builds live at `s3://models-resources/codap3/version/{tag}/`. The draft
assumes `modify-clone.sh` adds a new S3 origin with `OriginPath: /codap3/version/$V3_FLIP_VERSION`
and that `V3_FLIP_VERSION` (a V3 release tag like `v3.0.0`) is set in `config.env` before the
flip. Confirm: (a) is a *new* origin correct (vs. reusing an existing one), and (b) is
`V3_FLIP_VERSION` chosen at flip time, or should `/v3/*` track the same build `/app/*` serves?
**Options considered**:
- A) New S3 origin, `OriginPath: /codap3/version/$V3_FLIP_VERSION`, version set before flip
  (draft assumption).
- B) `/v3/*` points at the same origin/build as `/app/*` initially (Q13 option C "stub now"),
  version-pinned later.
- C) `/v3` is deferred entirely to a sibling story (Q13 option B — but Q13 resolved A).

**Decision**: None of A/B/C — **`/v3` and `/v3/*` redirect to `/app/`** (interview,
2026-05-22). Once the flip lands, `/app/` *is* V3, so `/v3` is simply another name for
current V3 — a redirect `/v3*` → `/app/` is correct and far simpler than standing up a
version-pinned origin. No new origin, no version-pinned S3 path, no `V3_FLIP_VERSION`. The
redirect function gains one rule (new requirement **R6a**): `/v3` and `/v3/*` → redirect to
`https://codap.concord.org/app/`, **collapsing** the path and preserving query + hash,
exactly as R1 does for `/app` (collapse, not literal prefix-swap — V3 carries document state
in the hash, not the path, and nothing links to deep `/v3/...` paths). `modify-clone.sh` adds
`/v3` and `/v3/*` cache behaviors with the redirect function attached (origin = V3 S3 for
consistency, but never reached — the function always redirects `/v3*`). True version-pinning
(freezing `/v3` at a build while `/app` advances to `/v4`) is deferred to the future V3→V4
cutover, when it is actually needed. This supersedes Q13's "serve the V3 app directly / No
function attachment" resolution; requirements.md is amended — Q13 annotated, R26's `/v3`
bullet revised, new **R6a**, R28 gains `/v3` rows, decision-log entry **IF2**.

### IQ-Note — R17a / `URLSearchParams` (not a question; flagged for Phase 3) — RESOLVED
The Step 2 design note records that the client-side query rebuild uses raw-string
manipulation, **not** `URLSearchParams.toString()` (which re-encodes values and would break
R15 verbatim preservation). R17a's parenthetical "a `URLSearchParams`-based implementation
provides this for free" refers only to duplicate-pair preservation, which the raw-string
filter also satisfies. No requirements change is proposed; this note exists so the Phase 3
cross-reference review can confirm the reading is correct and the implementation conforms.

**Phase 3 outcome (XR2, 2026-05-22)**: Confirmed — the raw-string filter conforms to R17a's
normative content, and the reading is correct. requirements.md R17a was clarified (it now
states `URLSearchParams` may be used to parse but `.toString()` MUST NOT be used to rebuild
the query, because it re-encodes values and breaks R15). See Self-Review issue XR2.

## Self-Review

<!-- Phase 3 multi-role review, 2026-05-22. Process one at a time; OPEN → RESOLVED as resolved. -->

### Senior Engineer

#### RESOLVED: SE-I1 — `jsStringEscape` regex embeds literal U+2028 / U+2029 characters in source
The escape regex on the `jsStringEscape` line is written as `/[\\"'<>&\/\r\n??]/g`, where the
two characters after `\n` are literal **U+2028 (LINE SEPARATOR)** and **U+2029 (PARAGRAPH
SEPARATOR)** — confirmed by a byte dump (`342 200 250 342 200 251`). Escaping those code
points is *correct* (in ES5 they terminate string literals; the `cloudfront-js-2.0` runtime is
ES2015+, where they are legal in string literals but still worth normalizing), but embedding
them as invisible literal glyphs in the source is a defect: they are unreviewable in a diff,
survive copy-paste unpredictably, and an editor or lint autofix could silently strip or
mangle them. **Suggested resolution**: write them as explicit escapes in the regex —
`/[\\"'<>&\/\r\n\u2028\u2029]/g` — so the source is all-ASCII and the intent is visible.

**Resolution (2026-05-22)**: Applied. The regex character class now writes the line/paragraph separators as the ASCII escapes `\u2028 \u2029` rather than literal characters, and an expanded comment above `jsStringEscape` documents every escaped character and why U+2028 / U+2029 are covered.

---

#### RESOLVED: SE-I2 — Function source is ~9 KB against the 10 KB limit with no build/minify escape hatch
A byte count of the function code block is **~9.0 KB** (and ~9.8 KB after the SE-I1 comment
expansion). R20b's limit is 10 KB measured on the
exact deployed artifact, and the foundational decision (Overview) is explicit: *"single
committed `.js` file — the committed source IS the deployed artifact; no build/minify step."*
That leaves ~1 KB of headroom for a file that is mostly verbose comments. Two concrete ways it
gets consumed: (a) R20a's HSTS contingency (CR8) adds a fifth response header plus its
explanatory comment if `verify-clone.sh` finds the response-headers policy doesn't cover the
synthetic response; (b) review feedback on this very spec tends to *add* explanatory comments.
`check-size.sh` (R20c) catches an overflow as a build failure — but with no minify step the
plan has **no remediation path** beyond hand-trimming comments under time pressure near flip
day. **Suggested resolution**: either (1) explicitly budget headroom — state a soft target
(e.g. ≤ 8 KB) for the committed source and keep comments terse, or (2) reconsider the
foundational "no build step" decision enough to allow a comment-stripping step (the deployed
artifact would be source-with-comments-removed; the byte count R20b measures is still the
deployed bytes, satisfying the requirement). Decide now, not at the `check-size.sh` failure.

**Resolution (2026-05-22)**: Option (2) chosen. The foundational decision is revised: the
committed `v2-v3-redirect.js` keeps its full rationale comments; a new `build-function.sh`
strips comments with `terser` (JS-aware — `--compress false --mangle false --comments false`,
so the deployed artifact is behavior-identical) to produce `dist/v2-v3-redirect.js`, which is
what `check-size.sh` measures for R20b and what `deploy-function.sh` deploys. Updated: the
Foundational decisions bullet, the README script table (new `build-function.sh` row), the
"Implement the redirect CloudFront Function" step summary, the "Function validation and deploy
scripts" step (new `build-function.sh` script + code block, `check-size.sh` now builds first
and measures the artifact, `deploy-function.sh` deploys `dist/`), the unit-test step (`terser`
devDep added; tests still load the committed source), and the Scaffold step `.gitignore`
(`dist/` added). R20b explicitly permits this ("minification is an optional size-reduction
tactic"), so no requirements.md change is needed.

---

### Security Engineer

#### RESOLVED: SEC-I1 — `error-fallthrough` metric-filter pattern is a bare substring; a crafted URL can false-fire the high-severity alarm
`deploy-monitoring.sh` creates the R26b caught-exception alarm with a CloudWatch Logs metric
filter whose pattern is `"tag=error-fallthrough"`. That is an unanchored substring match.
Every *normal* log line (when `LOG_ENABLED = true`) also echoes the request URI and query
string verbatim — `... uri=<request.uri> qs=<reconstructed query> ...`. A request whose path
or query literally contains the text `tag=error-fallthrough` (e.g.
`/app/static/dg/fr/cert/index.html?x=tag=error-fallthrough`) produces a normal log line that
*contains* the filter's substring, increments the custom metric, and trips the **high-severity**
alarm — a spurious rollback signal. Post-flip the committed `LOG_ENABLED = false` narrows this
(only the exception line logs, and it always carries the real tag), but **pre-flip validation
runs with `LOG_ENABLED = true`** (R23) — exactly when scanners and the conformance suite are
hammering the temp subdomain, and exactly when a false high-severity alarm is most disruptive.
**Suggested resolution**: anchor the metric filter on the log-line *prefix*, not a free
substring — the function's own lines all start `codap-redirect tag=<tag> uri=...`, so a
pattern that matches `codap-redirect tag=error-fallthrough` at the start of the message (CW
Logs filter patterns support this for space-delimited terms / JSON) is far harder to forge.
Secondarily, the function could strip whitespace/control characters from the logged `uri` and
`qs` values so a logged line cannot contain spaces an attacker controls.

**Resolution (2026-05-22)**: Both parts applied. (1) `deploy-monitoring.sh`'s metric-filter
pattern is now `"codap-redirect tag=error-fallthrough"` — the full log-line prefix. (2) The
function gains a `logSafe()` helper that replaces whitespace and control characters with `?`,
applied to every request-derived value (`uri`, the reconstructed query, `newuri`, the log
destination, and `e.message`) at all three `console.log` sites. Together these make the
contiguous token sequence the metric filter keys on unforgeable, and also close general
CloudWatch log-line injection (a newline forging a fake entry). JSON-structured logging was
considered as a more robust alternative but declined as a larger change — it would touch the
function code and reinterpret R30's `tag=…` line format; the prefix-anchored pattern plus
`logSafe()` is sufficient.

---

### QA Engineer

#### RESOLVED: QA-I1 — Cypress negative tests assert "not the synthetic page" — weaker than G2's "serves the expected origin"
The Cypress conformance step describes each R29 row as: `cy.request()` the URL and *"assert the
body is **not** the synthetic page (no `<!-- codap-redirect -->`) — i.e. it served origin."*
That assertion only proves the redirect function didn't fire. It does **not** prove the
*correct* origin answered. G2 explicitly requires each negative URL to *"serve the expected
origin (V2 origin, the V3 app or a V3 asset from V3 S3, a V3 S3 404, or the marketing site)."*
A misconfigured carve-out — e.g. `/releases/staging/*` ordered after `/releases/*`, or pointed
at the wrong origin — could serve a V3-S3 404 page instead of V2 staging content; that 404 is
"not the synthetic page" and would pass the assertion while G2 is actually violated. This is
the precise failure mode GR1 (cache-behavior precedence) warns about, and the negative suite
is where it should be caught. **Suggested resolution**: each R29 row asserts a positive,
origin-distinguishing marker — V2 pages carry SproutCore/`static/dg` markers, the marketing
site carries the `x-powered-by: WP Engine` header (already used in Technical Notes), V3 S3
404s carry an identifiable body. Assert the *expected* origin's marker, not merely the absence
of the synthetic marker.

**Resolution (2026-05-22)**: Applied. The Cypress conformance step now specifies each R29 row
asserts **two** things — (a) the function did not fire (no `<!-- codap-redirect -->`), and
(b) a positive origin-identifying signal. A marker map was added to the step covering the
four expected origins (marketing site, V2 origin, V3 S3, TP-Sampler S3); exact marker strings
are settled in implementation under the same "marker TBD" latitude R26b uses.

---

#### RESOLVED: QA-I2 — No unit test for a HEAD request that matches a redirect path
R18a requires the function to intercept **`GET` and `HEAD`**. The Jest negative matrix tests
that `POST`/`OPTIONS`/`PUT` fall through unchanged, and PLUG2 resolved that HEAD returns the
same status+headers as GET (body stripped by CloudFront). But no test exercises
`handler(makeEvent('/app', { method: 'HEAD' }))` — i.e. nothing pins that a HEAD request to a
redirect-shape path actually produces the synthetic `200`. A future refactor that tightened
the method guard to `=== 'GET'` would pass the entire suite while silently breaking R18a/PLUG2.
**Suggested resolution**: add a HEAD row to the positive matrix asserting the synthetic `200`
response is produced (status + headers identical to the GET case).

**Resolution (2026-05-22)**: Applied. A test was added to the R28 positive-matrix describe
block — `handler(makeEvent('/app', { method: 'HEAD' }))` asserts `statusCode === 200` and
`headers` identical to the GET response, pinning R18a/PLUG2 against a future GET-only refactor.

---

#### RESOLVED: QA-I3 — Cypress reduces R28's "iframe-phone re-handshake" to a generic postMessage round-trip
R28's iframe-embed row requires the iframe to "end up at `/app/?...` **with iframe-phone
re-handshake completing against the V3 page**." The implementation step says the Cypress spec
"assert[s] the iframe's final `src` plus a postMessage round-trip **to stand in for** the
iframe-phone re-handshake." A bare postMessage echo does not exercise iframe-phone's actual
handshake protocol (the `hello`/`init` sequence CODAP uses with LARA/AP) — it proves
postMessage works, not that a real embedder re-establishes its RPC channel after the
redirect's ~50–500 ms synthetic-page window. The gap matters because PLUG1 already flagged
that messages sent during that window are lost; a generic echo can't detect a regression
there. **Suggested resolution**: either (a) drive a real iframe-phone handshake in the harness
(load actual CODAP V3 in the iframe and assert the iframe-phone connection establishes), or
(b) explicitly accept the stand-in and record in the spec that full iframe-phone re-handshake
verification is delegated to a sibling plugin/AP test — so G1 sign-off isn't claimed on a
weaker check than R28's wording promises.

**Resolution (2026-05-22)**: Neither (a) nor (b) — iframe-phone is **descoped entirely**. Per
the user's call, the redirect function's contract is purely "redirect the iframe to the
correct V3 URL"; whether V3's iframe-phone channel re-handshakes is a property of V3 / the
LARA-AP integration, not this function, and the conformance suite should not test it. The
Cypress iframe rows now assert only that the iframe lands at the expected `/app/?...` URL
(query + hash preserved), once for English and once for a non-English `{lang}`; the
postMessage round-trip is removed. requirements.md R28's iframe row was edited in the same
change — the clause "with iframe-phone re-handshake completing against the V3 page" became
"confirming the client-side redirect works in an iframe context," with iframe-phone verification
explicitly marked out of scope; PLUG3's resolution was annotated as superseded.

---

### DevOps / SRE Engineer

#### RESOLVED: DO-I1 — Circular ordering between `modify-clone.sh` (attaches the response-headers policy) and `verify-clone.sh` (decides whether it's needed)
The clone-pipeline step lists `modify-clone.sh` *before* `verify-clone.sh`, but `modify-clone.sh`'s
response-headers-policy bullet reads: *"if Step 5's verification finds security headers are
origin-emitted, this script also attaches a response-headers policy…"* — and Step 5 *is*
`verify-clone.sh`. So `modify-clone.sh` is told to act on a finding produced by a script that
runs after it. The real sequence has to be: clone → modify (no RHP) → verify (discovers
whether security headers are origin-emitted, and whether they reach the synthetic response) →
modify again (attach RHP if needed) → verify again. That two-pass loop is never stated, so an
implementer following the step linearly would attach nothing and `verify-clone.sh` would fail.
**Suggested resolution**: make the response-headers-policy attachment its own explicitly
re-runnable action — either a fourth small script (`apply-response-headers-policy.sh`) gated
on the verify finding, or an explicit "run modify-clone.sh again after verify-clone.sh
reports" instruction in the step text. State the iterate-twice flow.

**Resolution (2026-05-22)**: Resolved not by a re-run loop but by moving the *decision*
earlier — it never needed the clone. `clone-distribution.sh` gains a step 4 that determines,
from the prod distribution config plus a `curl -I` on `codap.concord.org`, whether security
headers are origin-emitted or policy-based, and writes `RHP_REQUIRED` (and `RHP_ID`) to
`config.env`. `modify-clone.sh` consumes `RHP_REQUIRED` and attaches the response-headers
policy when `true` — with no dependency on `verify-clone.sh`. `verify-clone.sh`'s `curl -I`
check is now framed as *confirming* the determination held on the clone, not deciding it. The
pipeline is a clean decide → apply → confirm sequence.

---

#### RESOLVED: DO-I2 — `deploy-monitoring.sh`'s `put-metric-filter` targets a log group that may not exist yet
The `error-fallthrough` alarm is built with `aws logs put-metric-filter` on "the function's log
group." CloudFront Functions stream `console.log` output to a CloudWatch Logs group in
`us-east-1` that is **created lazily on first log emission** — if `deploy-monitoring.sh` runs
before the function has ever logged (entirely plausible: monitoring is a separate step that
could run right after deploy, before any test traffic), `put-metric-filter` fails with
`ResourceNotFoundException`. **Suggested resolution**: `deploy-monitoring.sh` explicitly
creates the log group first (`aws logs create-log-group` for `/aws/cloudfront/function/<name>`,
idempotently ignoring `ResourceAlreadyExists`), or the step documents that the function must
have been invoked at least once (e.g. via `test-function.sh`) before monitoring deploys.
Also pin `--region us-east-1` for the logs calls — CloudFront Function logs always land there
regardless of the operator's default region.

**Resolution (2026-05-22)**: Applied. `deploy-monitoring.sh` step 2 now runs
`aws logs create-log-group --log-group-name /aws/cloudfront/function/$FUNCTION_NAME
--region us-east-1` (idempotent, ignoring `ResourceAlreadyExistsException`) before
`put-metric-filter`, and all `aws logs` calls in the script pin `--region us-east-1`.

---

#### RESOLVED: DO-I3 — `FunctionExecutionErrors` cannot be induced by ordinary means, yet G5 requires it "verified to fire"
`verify-alarms.sh` is described as inducing "a synthetic error against each of the seven checks
and confirm[ing] each transitions to ALARM." That works for the synthetic monitors, the
`error-fallthrough` log filter, the throttle and the error-rate alarms — but **not** for
`FunctionExecutionErrors`. R18b wraps the entire handler in a top-level try/catch that returns
a valid `request`; a caught error is a *successful* execution and never registers on
`FunctionExecutionErrors` (this is exactly why REL-F1 added the `error-fallthrough` filter).
So there is no input to the *real* function that makes `FunctionExecutionErrors` increment.
G5 nonetheless demands all five alarms be verified-fires. The plan doesn't say how.
**Suggested resolution**: `verify-alarms.sh` induces `FunctionExecutionErrors` with a
*deliberately broken throwaway function* — a one-line function that throws at top level (or
returns an invalid response object) deployed under a temporary name/behavior on the clone,
just long enough to drive the metric, then removed. Document that procedure in the step and in
the RUNBOOK G5 evidence row, so "verified to fire" has a concrete, repeatable method.

**Resolution (2026-05-22)**: Applied, with a refinement — because the `FunctionExecutionErrors`
alarm is dimensioned on `FunctionName=$FUNCTION_NAME`, the *real* function must fail (a
throwaway function under a different name would not move that alarm's metric). The monitoring
step gains a "Per-check induction methods (DO-I3)" note: `verify-alarms.sh` temporarily
`update-function` + `publish-function`s a deliberately-broken build of the function to the
clone, drives real viewer requests (pre-flip — no real users), confirms `FunctionExecutionErrors`
and the co-rising `5xxErrorRate` transition to ALARM, then restores the real function via
`deploy-function.sh`. The note also covers the other six checks, and flags `FunctionThrottles`
as sharing the inducement difficulty — `verify-alarms.sh` drives a brief request burst or
records a documented G5 exception for it. The RUNBOOK G5 evidence row records the method used
per check.

---

#### RESOLVED: DO-I4 — `flip.sh` / `rollback.sh` partial-failure recovery is unspecified for the single most critical operation
`flip.sh` runs three actions: `associate-alias` → `wait distribution-deployed` → Route 53
UPSERT. The README claims scripts are "idempotent where practical," but the step never says
what happens if `flip.sh` dies *between* actions — the highest-stakes window in the whole
story. If it dies after `associate-alias` but before the Route 53 swap, the alias has already
moved off `E3H9X49AG3GYSO` (which now `403`s `codap.concord.org`) and DNS still points there:
re-running `flip.sh` would re-issue `associate-alias` — does that no-op or error if the alias
is already on the clone? — and the operator has no scripted "where am I" check. **Suggested
resolution**: `flip.sh` (and `rollback.sh`) should be resumable — each step preceded by a
state check (`associate-alias` only if the alias isn't already on the target;
`change-resource-record-sets` only if the record isn't already pointed correctly) so a re-run
safely continues from wherever it stopped. At minimum, the step and the RUNBOOK must document
the recovery procedure for a mid-flip abort, since this is precisely when an operator is under
the most pressure.

**Resolution (2026-05-22)**: Applied. The Flip-and-rollback step now specifies both scripts as
**resumable**: each of the three actions is preceded by a state check (skip `associate-alias`
if the alias is already on the target; `wait` is naturally idempotent; the Route 53 UPSERT is
idempotent and reported as already-done if the record already points correctly), and on
startup the script prints the detected state. A "Mid-abort recovery (DO-I4)" paragraph was
added: if a script aborts inside the `403` window, re-run the same script to continue forward
or run the opposite script to back out — either closes the window, which is indefinite only
while no one acts. The RUNBOOK step gained a matching "Mid-abort recovery" bullet.

---

### Performance Engineer

#### RESOLVED: PERF-I1 — `check-size.sh` worst-case `{lang}` is not actually the longest the regex admits
`check-size.sh` measures the synthetic body by rendering
`/app/static/dg/zh-Hans/cert/index.html`, with the comment "the longest BCP-47 code is 8 chars
(e.g. `zh-Hans`)." `zh-Hans` is **7** characters, and R3's `{lang}` pattern
`[A-Za-z]{2,3}(-[A-Za-z]{2,4})?` admits up to **8** (`xxx-yyyy`, e.g. `abc-defg`). The body
size is essentially insensitive to a one-character `{lang}` difference against a 10 KB budget,
so this is not a real overflow risk — but the script states a worst case it doesn't actually
test, and the comment is factually wrong. **Suggested resolution**: render an 8-character
`{lang}` (e.g. `abc-defg`) as the worst case and correct the comment, so the check is honestly
the worst case it claims to be.

**Resolution (2026-05-22)**: Applied. `check-size.sh`'s body-size check now renders
`/app/static/dg/abc-defg/cert/index.html` (an 8-character `{lang}`, the longest R3's pattern
admits), and the comment is corrected to "the longest `{lang}` R3's pattern admits is 8 chars
(`xxx-yyyy`)."

---

### WCAG Accessibility Expert

#### RESOLVED: WCAG-I1 (minor) — The `Loading CODAP…` message is not announced to assistive tech
The synthetic page shows `<p>Loading CODAP…</p>` for ~50–500 ms before `location.replace()`.
For a sighted user that's a fine "not blank" cue (R19c's intent). For a screen-reader user the
`<p>` is static content with no live-region semantics, so it is unlikely to be announced
before navigation occurs — the SR user gets silence, then lands on V3. The `<noscript>` cohort
is already handled (a real anchor). This is genuinely minor: the page is a sub-second
interstitial and over-engineering it isn't warranted. **Suggested resolution**: optionally add
`role="status"` to the loading paragraph (a handful of bytes — but see SE-I2's budget
pressure) so AT *may* announce it; or consciously accept the current behavior and note in
R19c's rationale that the interstitial is intentionally not announced. Either is defensible —
the point is to make it a decision, not an oversight.

**Resolution (2026-05-22)**: `role="status"` added. The `HTML_HEAD` constant now emits
`<p role="status">Loading CODAP…</p>`; the R19c body-content unit test was tightened to assert
the full `<p role="status">…</p>` element. requirements.md R19c was amended to require
`role="status"` on the message element (parity with WCAG1's `<html lang>` clause). The byte
cost is negligible against the now-comment-stripped deployed artifact (SE-I2).

---

### Cross-Reference / Traceability

#### RESOLVED: XR1 — R25a's old-distribution disposition has no implementation step
R25a mandates a concrete post-soak lifecycle for `E3H9X49AG3GYSO`: detach `codap.concord.org`
from `Aliases`, set the distribution to `Disabled`, hold 90 days, then delete. Every other
requirement traces to a step, but this one has no script and no runbook section — it would
simply be forgotten ~90+ days after flip day, leaving a disabled-but-undeleted distribution
and an un-actioned calendar item (the Out of Scope list even notes "calendar reminder for
~2026-09"). **Suggested resolution**: this doesn't need a dedicated script, but it should be a
named section in `RUNBOOK.md` — a post-soak checklist item with the exact
`aws cloudfront` archive/disable invocation and the 90-day-later delete step — so it lands
under the runbook's ownership rather than depending on memory. Folds naturally into the
existing RUNBOOK step.

**Resolution (2026-05-22)**: Applied. The Flip-day runbook step's contents list gained a
"Post-soak old-distribution disposition" section — the exact `aws cloudfront` detach-alias /
`Disabled` invocations (done when R25a's soak exit conditions are met) and the 90-day-later
`delete-distribution` step (~2026-09), with the re-enable-for-rollback note. No script — it is
a one-time manual operation owned by the runbook. RUNBOOK step diff estimate bumped ~250→~270.

---

#### RESOLVED: XR2 (minor) — R17a's `URLSearchParams` parenthetical is misleading given the chosen implementation
Cross-reference of IQ-Note: the implementation's raw-string query filter is **correct** and
*does* conform to R17a's normative content (an ordered list of `name=value` pairs, duplicates
preserved, no name-keyed map). The conflict is only with R17a's non-normative parenthetical,
"a `URLSearchParams`-based implementation provides this for free" — which, read naively, would
point an implementer at `URLSearchParams.toString()`, which re-encodes values and violates
R15's verbatim-preservation rule (and R28's literal expected outputs). No implementation
change is needed. **Suggested resolution**: a one-line clarification in `requirements.md` R17a
— note that `URLSearchParams` may be used to *parse* but its `.toString()` MUST NOT be used to
*rebuild* the query, because it percent-re-encodes and breaks R15. This is a requirements-file
edit; flagging here so it's a conscious decision (amend R17a, or leave it and rely on this
cross-reference note as the record).

**Resolution (2026-05-22)**: requirements.md R17a amended — a "Clarification (XR2)" sentence
now states `URLSearchParams` may be used to parse/iterate the original query but
`.toString()` MUST NOT be used to rebuild the destination query (it percent-re-encodes values,
violating R15 and R28's literal expected outputs); a raw-string filter satisfies both. The
implementation.md IQ-Note was annotated with the Phase 3 outcome. No implementation-code
change — the raw-string filter already conforms.

---

#### RESOLVED: XR3 (re-review, minor) — `config.env.example` doesn't list the new `RHP_REQUIRED` / `RHP_ID` variables
Surfaced by the post-resolution re-review. The DO-I1 fix added a step 4 to `clone-distribution.sh`
that writes `RHP_REQUIRED` (and `RHP_ID`) into `config.env`, consumed by `modify-clone.sh` —
but the Scaffold step's `config.env.example` template still listed only `CLONE_DIST_ID` /
`CLONE_DIST_DOMAIN` as script-filled values, so an operator reading the template would not
know the two new variables exist. Pure documentation-completeness gap.

**Resolution (2026-05-22)**: Applied. `config.env.example` in the Scaffold step now lists
`RHP_REQUIRED` and `RHP_ID`, each annotated "filled in by clone-distribution.sh step 4 (DO-I1)".

---

## Self-Review — Re-run (2026-05-22, lean pass)

<!-- Phase 3 re-run. Roles: Senior Engineer, Security Engineer, DevOps/SRE Engineer.
     Calibrated re-review of a mature implementation spec (one prior Phase 3 pass, all
     resolved). Process one at a time; OPEN → RESOLVED as resolved. -->

### Senior Engineer

#### RESOLVED: SE-J1 — The function's logging and exception paths are entirely untested; the `error-fallthrough` log line the R26b alarm keys on has no regression guard
The Jest suite ("Unit-test the redirect function" step) exercises path matching, English
detection, the synthetic response, headers, and the client-side query/hash construction. It
does **not** exercise the function's logging code — and cannot, as written. `LOG_ENABLED` is
`false` in the committed source (R23), and `test-harness.js` loads the committed source
verbatim. So `reconstructQuery`, `logSafe`, `logDestination`, and the two `LOG_ENABLED`-gated
`console.log` sites are never run by any test. The `catch` block — and the unconditional
`error-fallthrough` `console.log` inside it — is likewise never exercised: no R28/R29 row
induces an exception.

Two of those untested pieces are load-bearing:
- `logSafe()` is a **security control** (resolved issue SEC-I1) — it strips
  whitespace/control characters so a crafted URI cannot forge the metric-filter token
  sequence or inject a fake CloudWatch log line. A regression in `logSafe` reopens SEC-I1 and
  no test would catch it.
- The `error-fallthrough` log line is the **sole** detection signal for caught exceptions
  (R18b / REL-F1): a caught error returns a valid `request`, so `FunctionExecutionErrors`
  never moves, and `deploy-monitoring.sh`'s metric filter `"codap-redirect tag=error-fallthrough"`
  is the only alarm. If a future edit changes the catch block's log-line prefix, every Jest
  test still passes while the only alarm for that failure class silently stops firing.

`verify-alarms.sh` induces the `error-fallthrough` filter once, pre-flip, against the deployed
function — but that is a one-time manual check, not a committed regression guard against later
code changes.

**Why it matters**: A security control and the function's only caught-exception alarm both
depend on exact log-line text that nothing pins. The "Unit-test" step claims it exercises
"the full R28 positive and R29 negative matrices" yet leaves the entire logging/exception
surface — including a security control — at zero coverage.

**Suggested resolution**: Extend the Jest suite and `test-harness.js` to cover the logging
path: (1) add a harness loader variant that flips `LOG_ENABLED` to `true` (a string
substitution on `SOURCE` before `vm.runInContext`) plus a `console.log` capture, so
`reconstructQuery` / `logSafe` / `logDestination` and the per-match log line are asserted;
(2) add a test that forces a caught exception by overriding a function-scope global the
handler calls (e.g. replacing `buildResponse` in the VM context with a throwing stub, so the
exception occurs while `request.uri` remains a normal string) and asserts the catch block
emits a line beginning exactly `codap-redirect tag=error-fallthrough` — the literal prefix the
metric filter matches; (3) add a `logSafe` unit test asserting whitespace and control
characters (including a newline) are neutralized. Optionally note in `deploy-monitoring.sh`
that its metric-filter pattern is pinned by the SE-J1 test, so the two cannot drift unnoticed.

**Resolution (2026-05-22)**: Applied. `test-harness.js` gains a `loadHandlerCapturingLogs()`
loader that flips `LOG_ENABLED` to `true` on the loaded `SOURCE` and captures `console.log`
output, returning `{ handler, logs, sandbox }`. The "Unit-test" step's suite gains a
"logging + exception paths" `describe` block asserting (a) the per-match redirect log line's
tag and R17a-processed destination, (b) the no-match line's post-`/app`-strip `newuri`,
(c) `logSafe` neutralizing whitespace/control characters inside a request-derived value, and
(d) — by overriding `buildResponse` in the VM context with a throwing stub — that the catch
block falls through to origin and emits a line beginning exactly
`codap-redirect tag=error-fallthrough`. The step summary and the `test-harness.js`
"Files affected" bullet now mention the logging/exception coverage, and the estimate is
bumped ~320 → ~390 lines. `deploy-monitoring.sh`'s step-2 note records that its metric-filter
pattern is pinned byte-for-byte by the SE-J1 catch-block test, so the function and the filter
cannot drift unnoticed.

---

#### RESOLVED: SE-J2 — `verify-clone.sh`'s structured-diff check is specified as both an automated gate and a human prose review
The "Distribution clone pipeline" step describes `expected-diff.md` as "the R26a allowlist of
expected source-vs-clone config differences, **in prose, used by `verify-clone.sh`'s
reviewer**." But `verify-clone.sh` part 1 says the script `diff`s the two normalized configs
and "**assert[s] every difference is in the `expected-diff.md` allowlist** … Any unexpected
difference **exits non-zero (blocks the flip)**."

A script cannot assert against, or exit non-zero based on, a prose document. The two
descriptions specify two different mechanisms: either (a) `verify-clone.sh` emits the diff and
a **human** compares it to the prose `expected-diff.md` — in which case "asserts" /
"exits non-zero" is wrong, it is a human gate; or (b) the allowlist is **machine-readable**
and `verify-clone.sh` enforces it programmatically — in which case "in prose, used by the
reviewer" is wrong. R26a itself ("produce a structured diff … and verify the differences are
exactly the expected set") does not disambiguate.

**Why it matters**: This verification gates the flip on the clone being config-identical to
prod except for the intended V3 changes (R26a, G-criteria). Whether it is an automated gate
or a human checklist materially changes what `verify-clone.sh` must implement and how
reliable the gate is — and an implementer reading the step gets contradictory instructions.

**Suggested resolution**: Pick one. Recommended: make the allowlist machine-readable —
`expected-diff.md` becomes (or is accompanied by) a structured list of expected JSON-path
differences that `verify-clone.sh` checks the normalized `diff` against, exiting non-zero on
any unlisted difference and also printing a human-readable summary. If the intent is a human
gate, drop "asserts" / "exits non-zero" from the part-1 description and state that
`verify-clone.sh` produces the diff for a named reviewer to sign off against `expected-diff.md`
(and reflect that in the G-criteria evidence).

**Resolution (2026-05-22)**: Applied — the automated gate. `expected-diff.md` is redefined as
a machine-readable list of expected JSON-path differences, each with a human-readable note on
why it is expected; the "in prose, used by `verify-clone.sh`'s reviewer" framing is removed
from its "Files affected" bullet. `verify-clone.sh` part 1 now normalizes both configs with
`jq`, diffs them as a set of JSON-path differences, checks every difference against the
allowlist, prints a human-readable summary, and exits non-zero on any unlisted difference
(blocks the flip). The script is the gate; the printed summary is what the G-criterion signer
reads.

---

#### RESOLVED: SE-J3 (minor) — Nothing verifies the deployed artifact `dist/v2-v3-redirect.js` behaves like the reviewed source
`build-function.sh` produces the deployed artifact by running the committed source through
`terser --compress false --mangle false --comments false`, and `deploy-function.sh` deploys
`dist/v2-v3-redirect.js`. The Jest suite runs against the **committed source**, not the
artifact; the only check on the artifact is `build-function.sh`'s `node --check`, which
verifies it *parses*, not that it *behaves identically*. The "Unit-test" step states the
artifact "is behavior-identical and need not be separately unit-tested."

That is a reasonable trust in `terser` with compress and mangle disabled — but it is the
deployed bytes that run in production, and "behavior-identical" is currently an assertion,
not a verified fact.

**Why it matters**: Minor — the regression risk from comment-stripping with no other
transforms is genuinely small. But the deployed artifact serves every redirected user, and a
one-line guard would convert the assertion into a check.

**Suggested resolution**: Either accept the `terser`-trust explicitly and record it as a
conscious decision, or have `test-harness.js` accept a target-file parameter and run a small
smoke subset (e.g. the synthetic-response-shape block plus a couple of R28/R29 rows) against
`dist/v2-v3-redirect.js` after `build-function.sh`, so the deployed artifact is exercised at
least minimally.

**Resolution (2026-05-22)**: Applied — and stronger than the suggested smoke subset (user
direction). `test-harness.js`'s `loadHandler` / `loadHandlerCapturingLogs` take an optional
target-file argument (default the committed source), and the suite is wrapped in a Jest
`describe.each` over both `COMMITTED_SOURCE` and `BUILT_ARTIFACT` (`dist/v2-v3-redirect.js`),
so the **entire** R28/R29/synthetic-response/logging matrix runs against the deployed artifact
as well as the reviewed source. A `pretest` npm script runs `build-function.sh` so `dist/`
exists before the suite runs. `loadHandlerCapturingLogs` matches the `LOG_ENABLED` toggle with
a regex — and throws if it is absent — since terser's default output drops the spaces around
`=` in the artifact. The step summary, the `package.json` and `test-harness.js`
"Files affected" bullets, and the estimate (~390 → ~410 lines) are updated; the
"behavior-identical … need not be separately unit-tested" claim is removed.

---

### Security Engineer

#### RESOLVED: SEC-J1 — `artifacts/prod-config.json` (a raw production CloudFront config dump) is not git-ignored
The Scaffold step's `.gitignore` covers `config.env`, `dist/`, and `node_modules/`. It does
**not** cover `artifacts/`. `clone-distribution.sh` step 1 writes the full production
distribution config to `artifacts/prod-config.json` ("the diff baseline"), and `dns-audit.sh`
writes `artifacts/dns-audit.md` which the plan explicitly commits ("Committed as the R26c
record") — so `artifacts/` is a partly-committed directory and `artifacts/prod-config.json`
defaults to committed in the public `concord-consortium/codap` repo.

A raw `aws cloudfront get-distribution-config` dump is not a curated identifier list — it
includes every origin's full configuration, and in particular **origin custom headers**, a
common place to carry origin-auth shared secrets (e.g. an `X-Origin-Verify`-style token
proving a request came through CloudFront). It may also expose the WAF web ACL ID,
logging-bucket configuration, and other operational detail. Resolved issue SEC-F3 consciously
accepted infrastructure **identifiers** (account ID, distribution IDs, zone ID, ACM ARN) in
the public repo — but a raw config dump is a different class of artifact: it can contain
header *values*, not just identifiers, and was never reviewed for what it carries.

**Why it matters**: Committing a raw production CDN config to a public repo risks leaking an
origin-auth secret if one is configured as a custom origin header — a real exposure, and one
a config-level review of *identifiers* (SEC-F3) did not cover.

**Suggested resolution**: Add `artifacts/prod-config.json` (and any other raw
`get-distribution-config` / `get-distribution` dumps) to the Scaffold step's `.gitignore` — or
`.gitignore` the whole `artifacts/` directory and have `dns-audit.sh` write the committed R26c
record to a deliberately-named, reviewed file outside it. Add a note that any config dump
checked in (or pasted into a spec) must first be inspected for origin custom-header values and
other non-identifier data.

**Resolution (2026-05-22)**: Applied — the directory-level approach. The Scaffold step's
`.gitignore` now also covers `artifacts/`, with a note that it holds raw working dumps
(notably `prod-config.json`) which MUST NOT be committed to the public repo because a raw
distribution config can carry origin custom-header values and other non-identifier data
(SEC-J1, distinguished from SEC-F3's accepted *identifiers*). The one artifact meant to be
committed — the R26c DNS-audit record — is moved out of `artifacts/` to a folder-root file
`dns-audit-record.md`, so it is committed by intent; the DNS-audit step's "Files affected"
bullet and its write target are updated accordingly. The Scaffold note also requires any
config dump checked in or pasted into a spec to first be inspected for origin custom-header
values. Scaffold-step estimate bumped ~90 → ~95 lines.

---

### DevOps / SRE Engineer

#### RESOLVED: DO-J1 — `deploy-function.sh`'s first-deploy path omits `publish-function`, so the function cannot be attached to the clone
The "Function validation and deploy scripts" step specifies `deploy-function.sh` as:
"`aws cloudfront create-function` (first deploy) **or** `update-function` + `publish-function`
(subsequent)." The first-deploy path is `create-function` only.

`create-function` creates the function in the `DEVELOPMENT` stage. A CloudFront Function must
be **published to the `LIVE` stage** (`publish-function`) before it can be associated with a
distribution's cache behavior. The "Distribution clone pipeline" step's ordering note (X2)
states `modify-clone.sh` attaches the function to cache behaviors *by ARN* and so must run
*after* `deploy-function.sh`. But after a first deploy the function exists only in
`DEVELOPMENT` — `modify-clone.sh`'s `FunctionAssociations` attach has no `LIVE` version to
bind, and the attach (or the subsequent `update-distribution`) fails.

**Why it matters**: Followed literally, the very first run of the pipeline cannot attach the
function to the clone — a flip-blocking break, on the critical path, that surfaces only when
`modify-clone.sh` runs. The "subsequent" path correctly publishes; only the first-deploy path
is wrong.

**Suggested resolution**: Make the first-deploy path `create-function` **then
`publish-function`** (the size gate, and if desired a `test-function` DEVELOPMENT check, run
between them). State explicitly that the function must be in the `LIVE` stage before
`modify-clone.sh` runs, and reflect that in the X2 ordering note.

**Resolution (2026-05-22)**: Applied. `deploy-function.sh`'s description now ends **both** the
first-deploy (`create-function`) and subsequent (`update-function`) paths with
`aws cloudfront publish-function`, with a sentence explaining that `create-function` /
`update-function` leave the function in `DEVELOPMENT` and a CloudFront Function must be
published to `LIVE` before it can be associated with a distribution — so even the first
deploy must publish, or `modify-clone.sh`'s by-ARN attach has no `LIVE` version to bind. The
X2 ordering note in the "Distribution clone pipeline" step now requires the function to be
deployed **and published to `LIVE`** before `modify-clone.sh` runs.

---

#### RESOLVED: DO-J2 — `verify-alarms.sh` publishes a deliberately-broken function to the live clone with no propagation wait and no guaranteed restore
Per the DO-I3 induction note, `verify-alarms.sh` verifies the `FunctionExecutionErrors` /
`5xxErrorRate` alarms by `update-function` + `publish-function`-ing "a deliberately-broken
build of the function to the clone," driving real viewer requests, confirming the alarms
fire, then "restores the real function via `deploy-function.sh`."

Two operational hazards are unaddressed:
- **Propagation timing.** `publish-function` propagates to CloudFront edge locations
  asynchronously (typically minutes). If `verify-alarms.sh` drives requests immediately after
  publishing the broken build, the requests may still hit the good version and nothing fires;
  and after the restore publish, the script may exit while edges still serve the broken
  version. The step says "drives a handful of real viewer requests" with no `wait` /
  propagation step, and the alarms themselves need their evaluation period (e.g.
  `FunctionExecutionErrors` "1 datapoint of 1 min") to elapse.
- **Abort safety.** If `verify-alarms.sh` aborts between the broken publish and the restore,
  the clone is left serving a broken viewer-request function — 5xx on `/app`, `/app/*`,
  `/releases/*` — with no specified recovery. `flip.sh` / `rollback.sh` were explicitly made
  resumable and abort-safe (DO-I4); `verify-alarms.sh`, which deliberately puts the clone into
  a worse state than a flip abort would, has no equivalent guarantee.

**Why it matters**: The broken-function induction is the DO-I3-mandated way to verify two of
the seven G5 checks. As specified it can produce a false "verified" (requests hit the wrong
version) or leave the clone broken on abort. Pre-flip there are no real users, but the clone
is internet-reachable at the temp subdomain and the broken state is silent.

**Suggested resolution**: Specify in the monitoring step that `verify-alarms.sh` (1) waits for
each `publish-function` to reach all edges before driving requests and before declaring
restore complete — e.g. poll function status or wait a documented propagation margin — and
allows for the alarms' evaluation periods; and (2) guarantees the restore even on failure — a
shell `trap` that re-runs the real `deploy-function.sh` publish on any exit, plus a final
post-condition check that the clone is serving the real function before the script reports
success.

**Resolution (2026-05-22)**: Both parts applied to the monitoring step's DO-I3 induction
note. (1) The `FunctionExecutionErrors` bullet now has `verify-alarms.sh` wait for the
broken-build `publish-function` to propagate to the edge (poll function status / a documented
propagation margin) before driving requests, wait out the alarms' evaluation periods before
reading alarm state, and wait for the restore publish to propagate before reporting success.
(2) A new "Abort safety (DO-J2)" paragraph requires a shell `trap` on `EXIT` / `ERR` that
re-runs the real `deploy-function.sh` publish on any exit, plus a final post-condition check
that the clone serves the real function before success is reported — giving `verify-alarms.sh`
the same abort-safety `flip.sh` got from DO-I4. Monitoring-step estimate bumped ~310 → ~320
lines.

---

### Re-review (after the lean-pass resolutions)

Fresh scan of `implementation.md` after SE-J1 / SE-J2 / SE-J3 / SEC-J1 / DO-J1 / DO-J2 were
resolved, checking for problems introduced by the resolutions themselves. SE-J2's
machine-readable `expected-diff.md`, SEC-J1's `dns-audit-record.md` relocation, DO-J1's
dual-path `publish-function`, and DO-J2's propagation-wait / abort-safety are internally
consistent with the steps they touch. One issue was introduced by SE-J3's resolution:

#### RESOLVED: RR-J1 (minor) — SE-J3's `dist/` build runs only as an `npm test` `pretest` hook; direct `jest` / watch-mode runs get a missing or stale artifact
SE-J3 added a `pretest` npm script that runs `build-function.sh` so `dist/v2-v3-redirect.js`
exists before the `describe.each` suite loads it. But the `pretest` hook fires only for
`npm test`. A developer who runs `npx jest`, `jest --watch`, or an IDE test runner directly
bypasses `pretest`: if `dist/` was never built, `loadHandler(BUILT_ARTIFACT)`'s
`fs.readFileSync` throws and the **whole** suite errors out (both targets, not just the
artifact one); if `dist/` exists but is stale, the "deployed artifact" target silently tests
stale bytes — the exact drift SE-J3 set out to eliminate. Watch mode is the sharp case: the
suite re-runs on every source edit, but `dist/` is not rebuilt, so the artifact target tests
pre-edit output for the rest of the session.

**Why it matters**: Minor — `npm test` (CI's path) works correctly. But the artifact target's
value is "test what deploys," and a stale or missing `dist/` defeats that without failing
loudly in the watch / direct-`jest` case (stale) or fails too loudly in the never-built case
(whole suite down).

**Suggested resolution**: Replace the `pretest` hook with a Jest `globalSetup` script that
runs `build-function.sh` — `globalSetup` fires once per `jest` invocation regardless of how
Jest is started (`npm test`, `npx jest`, watch, IDE), so `dist/` is always present and freshly
built at the start of a run. Note that in watch mode the artifact target still reflects the
build from the run's start, not per-edit — acceptable, and worth a one-line comment in the
suite. Update the `package.json` "Files affected" bullet (a `globalSetup` entry instead of
`pretest`) and the step summary.

**Resolution (2026-05-22)**: Applied. The `pretest` npm script is replaced by a Jest
`globalSetup` module (`jest.globalSetup.js`) that runs `build-function.sh`; `package.json`'s
Jest config points `globalSetup` at it. `globalSetup` fires once per `jest` invocation
however Jest is started, so `dist/v2-v3-redirect.js` is always freshly built before the
SE-J3 dual-target suite. The step summary, the `package.json` "Files affected" bullet, and
the SE-J3 wrapper comment in the suite are updated; the suite comment notes that in watch
mode the artifact target reflects the build from the run's start, not per-edit. A new
`jest.globalSetup.js` "Files affected" entry is added.

---
