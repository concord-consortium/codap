# CODAP-1323 — V2 cached-launch recovery (post-cutover)

**Status:** Draft / proposed
**Relates to:** [CODAP-1323 — V2 → V3 redirect](CODAP-1323-redirect-v2-to-v3.md) (the cutover this follows on from)
**Owner:** _unassigned_
**Implementation:** `devops/cloudfront-functions/v2-asset-recovery/` (new function) plus gated
edits to `devops/cloudfront-functions/v2-v3-redirect/{modify-clone.sh,expected-diff.md,config.env.example}`

---

## 1. Summary

On flip day (2026-06-07) `codap.concord.org/app` was cut over from CODAP **V2** (SproutCore,
served from the Apache origin) to **V3** (served from the `codap3/` S3 origin), via the
CloudFront redirect function described in CODAP-1323.

Some users — on some browsers — report that CODAP now **fails to launch (hangs on a blank /
"Loading" screen)**, and that **clearing the browser cache fixes it**. This spec:

1. Lays out the **failure analysis** — the specific chain of conditions under which a
   *cached* V2 app fails to launch after the cutover (Section 3).
2. Gives an engineer a concrete way to **verify that assumed failure mode** before
   implementing anything — the diagnosis here is well-supported by response evidence but
   has **not** been reproduced end-to-end in a browser (Section 4).
3. Proposes a **recovery** that lets a stale cached V2 app **finish booting and keep
   running V2** until its cached HTML naturally expires, at which point it migrates to V3 on
   its own — with no forced redirect and no change for fresh V3 users (Sections 5–7).

The fix is intentionally **transitional**: it is needed only while pre-cutover V2 documents
are still fresh in browser caches, then it is torn down (Section 9).

---

## 2. Background — the relevant cutover mechanics

The cutover (CODAP-1323) is implemented on a **clone** of the production CloudFront
distribution. On the clone, the viewer-request function `v2-v3-redirect.js` is attached to
the `/app`, `/app/*`, `/releases/*`, `/v3`, `/v3/*` cache behaviors. For this spec only two
of its behaviors matter:

- **V2-shape paths redirect.** `RE_APP_LANG = /^\/app\/static\/dg\/{lang}\/cert(?:\/.*)?$/`
  matches the **entire V2 cert tree** — the shell `index.html`, `javascript-packed.js`, and
  everything under `resources/` — and returns a synthetic `200 text/html` "Loading CODAP…"
  page (`cache-control: no-store`) whose inline JS redirects to `/app/`.
- **Other `/app/*` paths fall through to V3.** Anything under `/app/*` that is *not* a V2
  cert path has its `/app` prefix stripped and resolves against the V3 S3 origin
  (`codap3/`).

Both behaviors are correct for their intended audience (new visitors and old deep-link
bookmarks). The failure is a **side effect** on already-cached V2 apps, analyzed next.

---

## 3. Failure analysis — why a cached V2 app fails to launch

### 3.1 The ingredients

1. **The V2 entry documents were served with no `Cache-Control`.** The Apache origin sends
   only `Last-Modified` / `ETag` on the V2 shell, `javascript-packed.js`, and
   `codap-config.js`. With no explicit freshness, browsers apply **heuristic caching**
   (~10% of the time since `Last-Modified`). The build `/app` actually served (see §3.4) is
   dated **2026-02-20**, so a document last fetched just before the flip can be treated as
   fresh **without revalidation for up to ~10 days**.

2. **The V2 app loads its code via relative paths.** The cert shell
   `…/cert/index.html` references:
   ```
   src="../../../../static/dg/en/cert/javascript-packed.js"
   src="../../../../codap-config.js"
   ```
   Served under `/app/…/cert/index.html`, those resolve to `/app/static/dg/en/cert/javascript-packed.js`
   and `/app/codap-config.js`.

3. **After the cutover those same URLs no longer return V2 assets:**

   | Request (from a cached V2 shell) | Response today | Why |
   |---|---|---|
   | `GET /app/static/dg/en/cert/javascript-packed.js` | `200` **`text/html`** ("Loading CODAP…"), `no-store` | matches `RE_APP_LANG` → synthetic redirect page |
   | `GET /app/static/dg/en/cert/index.html` | `200` **`text/html`** ("Loading CODAP…") | matches `RE_APP_LANG` |
   | `GET /app/codap-config.js` | `404` (S3) | not a cert path → `/app` stripped → not in `codap3/` |
   | _(reference)_ `GET /v2/static/dg/en/cert/javascript-packed.js` | `200` `text/javascript` | `/v2` is untouched by the cutover |

### 3.2 The launch failure

A browser that still holds the V2 shell from before the flip serves it **from cache without
revalidating** (it's heuristically fresh). The shell then re-requests `javascript-packed.js`
and gets back an **HTML page instead of JavaScript** → the script fails to parse/execute
(`Uncaught SyntaxError: Unexpected token '<'`) → SproutCore never initializes → the app
hangs on a blank / "Loading" screen. (`codap-config.js` independently 404s.) Clearing the
cache forces the shell URL to revalidate, which now resolves to V3, and the app loads.

### 3.3 Why only *some* users / *some* browsers

The browser HTTP cache evicts entries independently (size/LRU pressure). The failure needs a
**partial** cache state:

- **Shell cached _and_ `javascript-packed.js` cached** → the old V2 app boots **entirely
  from cache**, never contacts the server, and **works** (no failure).
- **Shell cached _but_ `javascript-packed.js` evicted** → the JS is re-fetched, comes back
  as HTML → **hang**.

Since `javascript-packed.js` is the largest asset (~2.77 MB) it is the most likely single
item to be evicted while the small (~11 KB) shell survives — which is exactly the failing
combination. This is why the symptom is intermittent across users and browsers rather than
universal.

### 3.4 A complicating finding (does not change the fix, but the engineer should know)

`/app` was **supposed** to serve the May 22 build (`build_0745`) but the promotion to
`latest` apparently never ran: `/releases/latest` and `/v2` both still resolve to the
**Feb 20** build (confirmed by matching `ETag` mtime tokens), while `build_0745` (May 22)
sits at its own path. So the cached-and-broken documents are **Feb-20-dated**, which sets the
heuristic-freshness window (~10 days) and therefore the recovery's teardown horizon (§9).
Fixing the `latest` promotion is **separate** from this recovery and is noted as an open
item (§11).

---

## 4. Verifying the failure mode (do this before implementing)

The diagnosis in §3 is supported by response evidence but has **not** been reproduced in a
browser. An engineer picking this up should confirm the assumption first. Three levels, in
increasing fidelity:

### 4.1 Confirm the server-side smoking gun (seconds, no browser)

```bash
# A V2 JS URL under /app now returns HTML, not JavaScript:
curl -sI https://codap.concord.org/app/static/dg/en/cert/javascript-packed.js \
  | grep -iE 'content-type|x-cache'        # expect: text/html ; FunctionGeneratedResponse
# The same file at the untouched /v2 path is real JS:
curl -sI https://codap.concord.org/v2/static/dg/en/cert/javascript-packed.js \
  | grep -i  content-type                  # expect: text/javascript
# codap-config.js (referenced by the shell) 404s under /app:
curl -sI https://codap.concord.org/app/codap-config.js | grep -i '^HTTP'   # expect: 404
# The V2 origin sends no Cache-Control (=> heuristic caching):
curl -sI https://codap.concord.org/v2/static/dg/en/cert/index.html \
  | grep -iE 'cache-control|last-modified'  # expect: no cache-control; a Last-Modified
```

A `.js` URL returning `text/html` is the whole mechanism. If this no longer holds (e.g. the
function changed), revisit the analysis.

### 4.2 Reproduce the hang in a browser — DevTools Local Overrides (recommended)

This recreates "stale V2 shell at the `/app` URL + live post-cutover endpoints":

1. Capture the real V2 shell:
   `curl https://codap.concord.org/v2/static/dg/en/cert/index.html > shell.html`
2. DevTools → **Sources → Overrides** → enable, choose a folder, allow access.
3. Override **only** `https://codap.concord.org/app/static/dg/en/cert/index.html` with
   `shell.html`. Leave the asset URLs (`javascript-packed.js`, `codap-config.js`)
   **un-overridden** so they hit the live function.
4. Navigate to the overridden URL. **Expected:** Console shows
   `Uncaught SyntaxError: Unexpected token '<'` from `javascript-packed.js`, the Network tab
   shows that request returning `text/html`, and the app hangs — i.e. the production symptom.

### 4.3 Reproduce the *cache* path faithfully — local MITM proxy (optional)

Overrides bypass the HTTP cache. To exercise the real "served stale from the browser's own
cache" path and to test which `Cache-Control` value would have prevented it, use a proxy
(mitmproxy/Charles): serve the V2 shell with a long `max-age`, load `/app/…`, then flip the
proxy upstream to today's state and reload.

### 4.4 What to capture either way

- **Network:** the `javascript-packed.js` request returning `Content-Type: text/html`
  (the synthetic page), and/or `codap-config.js` `404`.
- **Console:** `SyntaxError: Unexpected token '<'` / SproutCore boot errors.
- Confirm a **fully-cached** profile (shell + JS both cached) does **not** fail — this
  validates the "partial cache" explanation in §3.3.

> If the failure is **not** reproduced this way, stop and re-open the analysis before
> deploying the recovery — the proposed change assumes precisely this mechanism.

---

## 5. Proposed recovery

**Goal:** let a stale cached V2 app **finish booting and run V2** until its cached HTML
expires (after which it migrates to V3 unaided). We do **not** try to force cached users to
V3 — letting V2 run is simpler, has no redirect-loop risk, and the fully-cached users were
never broken to begin with.

**Mechanism:** stop the redirect function from shadowing the V2 asset paths under `/app/` by
routing them to the **V2 (Apache) origin**, pinned to the May 22 build, so the cached shell's
subresource requests resolve to real V2 files instead of synthetic HTML / 404.

This reuses the cutover system's existing **carve-out** pattern (`modify-clone.sh` already
creates V2-origin, no-redirect-function carve-outs such as `/releases/staging/*`), with one
addition: a tiny path-rewrite function, because the `/app/`-rooted URL must map onto the
build directory on the V2 origin.

### 5.1 Why this is safe for each population

| Population | Behavior after the change |
|---|---|
| **Cached V2, partially evicted** (the broken users) | re-fetches `/app/static/*` + `/app/codap-config.js` → real V2 → **boots and runs V2**; migrates to V3 when the cached shell expires |
| **Cached V2, fully cached** | unchanged — still runs V2 from cache (was never broken) |
| **Fresh visitor** | `/app/` → V3 index (`no-cache`) → loads `/app/version/3.0.0/assets/*`. V3 **never requests** `/app/static/*` or `/app/codap-config.js`, so the carve-outs are invisible to it |
| **Old V2 deep-link bookmark** | now serves V2 instead of redirecting to V3. Acceptable during the window — they asked for V2 — and these paths are V2-only |

### 5.2 Build pinning rationale

The carve-outs are pinned to **`build_0745`** (May 22), not the mutable `latest`. Verified
facts that make this safe:

- The cached shells are Feb-20-dated, but the V2 **`cert/index.html` (11 007 B) and
  `codap-config.js` (192 B) are byte-identical** between the Feb 20 and May 22 builds; only
  `javascript-packed.js` differs (2 774 685 vs 2 775 174 B). The shell is a build-agnostic
  bootstrap that loads a stable-named packed bundle, so a cached Feb 20 shell boots the
  May 22 app cleanly — there is no cross-build mismatch at the shell level.
- Pinning to an explicit build (not `latest`) **decouples** this recovery from the separate
  `latest`→`build_0745` promotion fix (§11): fixing `latest` won't disturb the carve-outs.

Residual (negligible) risk: a user with the Feb 20 *packed JS* cached but the *shell*
evicted, who then loads a resource that changed between builds. Requires the 2.77 MB file to
be the surviving cached item (unlikely) plus a changed resource. If literally-zero risk is
required, pin to the Feb 20 build instead.

---

## 6. Scope of paths (verified)

The complete set the V2 app requests under `/app/`, from the cert shell and a scan of
`javascript-packed.js` (`../../../../{dir}/` tokens):

| Pattern | Contents | Boot-critical? |
|---|---|---|
| `/app/static/*` | cert shell, `javascript-packed.js`, all `resources/*`, every language under `static/dg/{lang}/cert/` | **yes** |
| `/app/codap-config.js` | runtime config (GA id, Google Drive client id) | **yes** |
| `/app/extn/*` | on-demand V2 plugins (`extn/plugins/NOAA-weather/…`, `extn/plugins/noaa-codap-plugin/…`) | no (loads on demand) |

All three resolve at `build_0745` on the origin (verified `200`, multiple languages). None of
these patterns overlap V3, which lives at `/app/` and `/app/version/3.0.0/*`.

---

## 7. Implementation

### 7.1 New CloudFront Function — `v2-asset-recovery`

`devops/cloudfront-functions/v2-asset-recovery/v2-asset-recovery.js` — viewer-request,
`cloudfront-js-2.0`. It is **separate** from the redirect function and is attached **only**
to the recovery carve-outs. It strips `/app` and prepends the pinned build:

```js
var BUILD_PREFIX = '/releases/build_0745'   // pinned final V2 build (frozen); one-line retarget
function handler(event) {
  var request = event.request
  var uri = request.uri
  if (uri.indexOf('/app/') === 0) {
    request.uri = BUILD_PREFIX + uri.slice(4)   // /app/static/x -> /releases/build_0745/static/x
  }
  return request
}
```

Because CloudFront selects the cache behavior by the **original** URI (these patterns are
more specific than `/app/*` and sit at head-of-array), the rewrite to `/releases/build_0745/…`
is sent to **this behavior's** origin (the V2 Apache origin) — it does **not** re-trigger the
`/releases/*` behavior. The function is packaged exactly like `v2-v3-redirect` (build /
test / check-size / deploy scripts; dual-target Jest suite; `test-events/`).

### 7.2 `modify-clone.sh` (gated, default-off)

Add, alongside the existing function lookup, a recovery-function ARN lookup; a jq helper that
attaches it; and three head-of-array carve-outs — **gated behind `RECOVERY_APP_V2_ASSETS`
(default `false`)** so merging this PR changes nothing until an operator opts in:

```jq
def new_behavior_recovery(path; origin):
    ($template + { PathPattern: path, TargetOriginId: origin })
    | .FunctionAssociations = { Quantity: 1,
        Items: [{ FunctionARN: $recoveryFnArn, EventType: "viewer-request" }] }
    | maybe_rhp(.) ;
```
```jq
# prepended (head-of-array) only when RECOVERY_APP_V2_ASSETS=true:
new_behavior_recovery("/app/static/*";        $v2Origin),
new_behavior_recovery("/app/codap-config.js"; $v2Origin),
new_behavior_recovery("/app/extn/*";          $v2Origin),
```

These target the existing V2 origin (`$v2Origin`), so the existing post-step that clears
`ForwardedValues.Headers` on *V3-origin* behaviors correctly leaves their Host forwarding
intact, matching the other V2 carve-outs. The existing dedup-by-`PathPattern` and
`CacheBehaviors.Quantity` recompute handle idempotency and the count.

### 7.3 `expected-diff.md` allowlist additions

So `verify-clone.sh` stays green when the carve-outs are present (and harmless when absent at
teardown):

```text
+ .CacheBehaviors.Items[?(@.PathPattern=='/app/static/*')]
+ .CacheBehaviors.Items[?(@.PathPattern=='/app/codap-config.js')]
+ .CacheBehaviors.Items[?(@.PathPattern=='/app/extn/*')]
+ .CacheBehaviors.Items[?(@.PathPattern=='/app/static/*')].FunctionAssociations.Items
+ .CacheBehaviors.Items[?(@.PathPattern=='/app/codap-config.js')].FunctionAssociations.Items
+ .CacheBehaviors.Items[?(@.PathPattern=='/app/extn/*')].FunctionAssociations.Items
```
(`CacheBehaviors.Quantity` is already allowlisted `~`. No `Origins` entry: the V2 origin is
reused, not added.)

### 7.4 `config.env.example` additions

```bash
RECOVERY_APP_V2_ASSETS=false                       # set true to enable the V2 cached-launch recovery carve-outs
RECOVERY_FUNCTION_NAME=codap-app-v2-recovery       # CloudFront Function that strips /app -> build_0745
```

### 7.5 Deploy order (operator)

1. `cd devops/cloudfront-functions/v2-asset-recovery && ./deploy-function.sh` (build, size-gate, create/update, **publish to LIVE**).
2. In `v2-v3-redirect/config.env`: set `RECOVERY_APP_V2_ASSETS=true` (and `RECOVERY_FUNCTION_NAME`).
3. `./modify-clone.sh` → `aws cloudfront wait distribution-deployed …` → `./verify-clone.sh` (expect zero unexpected diffs).
4. Verify (§8). Optionally `create-invalidation` for `/app/static/*`, `/app/codap-config.js`, `/app/extn/*` (the old synthetic responses were `no-store`, so this is belt-and-suspenders).

---

## 8. Post-deploy verification

```bash
# Was text/html (synthetic) — must become real JS from Apache:
curl -sI https://codap.concord.org/app/static/dg/en/cert/javascript-packed.js \
  | grep -iE 'content-type|server'        # text/javascript ; Apache (not FunctionGeneratedResponse)
curl -sI https://codap.concord.org/app/codap-config.js | grep -i '^HTTP'   # 200 (was 404)
curl -s  https://codap.concord.org/app/static/dg/en/cert/index.html | head -c 60  # V2 shell, not "Loading CODAP…"
# V3 must be untouched:
curl -sI https://codap.concord.org/app/ | grep -i cache-control            # no-cache (V3 index)
curl -sI https://codap.concord.org/app/version/3.0.0/assets/index.cfbbd7f4b5b8f1de70cd.js | grep -i '^HTTP'  # 200 (S3)
```
Then re-run the §4.2 Local Overrides reproduction: the cached shell should now **boot V2**
instead of hanging.

---

## 9. Blast radius, freshness window, and teardown

- **Window:** these carve-outs are needed only while pre-cutover (Feb-20-dated) V2 shells
  remain heuristically fresh — up to ~10 days from a user's last pre-cutover visit. Keep them
  **~2–3 weeks**, then tear down. Target teardown: **on/after 2026-06-28**.
- **Self-migration:** once a user's cached shell expires, its next load revalidates `/app/`
  (`no-cache`) → V3, and it never requests `/app/static/*` again.
- **Teardown:** set `RECOVERY_APP_V2_ASSETS=false`, re-run `modify-clone.sh` →
  `wait distribution-deployed` → `verify-clone.sh`. Optionally delete the
  `v2-asset-recovery` function. Leave the `expected-diff.md` entries in place (harmless when
  the behaviors are absent). After teardown, any rare remaining stale shell simply falls
  through to V3 — no worse than today.

---

## 10. Risks & alternatives considered

- **Do nothing / rely on the support doc.** Affected users self-heal within the heuristic
  window or by clearing cache / hard-reloading. Viable, but leaves a broken first impression
  on launch day for an unknown number of users. The recovery is low-cost and reversible.
- **Force cached users to V3 (recovery shim returning executable JS that navigates).** More
  fragile (redirect-loop risk), and does nothing for fully-cached users who never hit the
  server. Rejected in favor of "let V2 run."
- **Repoint `/v2` (or `latest`) to May 22.** Does not address the failing users — they
  request `/app/…`, not `/v2/…`. It also risks a *new* partial-cache mismatch for `/v2`
  visitors. Tracked separately (§11) as a deploy-correctness fix, not recovery.

---

## 11. Open items for the implementing engineer

1. **Verify the failure mode** per Section 4 before deploying. The whole change assumes the
   §3 mechanism.
2. **`config.env` inputs** (git-ignored): confirm the V2 origin is the auto-detected
   "codap server" origin in `modify-clone.sh`, and whether `RHP_REQUIRED=true` (so the
   carve-outs match the other behaviors on the response-headers policy).
3. **Confirm the teardown date** once the actual last-pre-cutover traffic is known; adjust
   §9 if `/app` turns out to have served a build with a more recent `Last-Modified`.
4. **Separate fix — the `latest` promotion that never ran** (§3.4): `/releases/latest` and
   `/v2` still serve the Feb 20 build instead of `build_0745`. Decide whether to repoint
   `latest`→`build_0745` (with a `/releases/latest/*` + `/v2/*` invalidation). Independent of
   this recovery.

---

## 12. Evidence appendix (captured 2026-06-07)

| Probe | Result |
|---|---|
| `GET /app/static/dg/en/cert/javascript-packed.js` | `200`, `content-type: text/html`, `x-cache: FunctionGeneratedResponse`, `cache-control: no-store` |
| `GET /app/codap-config.js` | `404` (`server: AmazonS3`) |
| `GET /v2/static/dg/en/cert/javascript-packed.js` | `200`, `content-type: text/javascript` (`server: Apache`) |
| `GET /v2/static/dg/en/cert/index.html` | `200`, **no `cache-control`**, `last-modified: Fri, 20 Feb 2026 13:38:50 GMT` |
| `GET /releases/build_0745/static/dg/en/cert/index.html` (origin) | `last-modified: Fri, 22 May 2026 17:18:04 GMT` |
| `cert/index.html` Feb 20 vs May 22 | **byte-identical** (11 007 B) |
| `codap-config.js` Feb 20 vs May 22 | **byte-identical** (192 B) |
| `javascript-packed.js` Feb 20 vs May 22 | 2 774 685 B vs 2 775 174 B (differs) |
| `/app/` (V3 index) | `200`, `cache-control: no-cache, max-age=0` (S3) |
| `/app/version/3.0.0/assets/index.<hash>.js` | `200`, `cache-control: max-age=31536000` (S3, content-hashed) |
