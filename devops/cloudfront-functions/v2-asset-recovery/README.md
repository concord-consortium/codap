# V2 cached-launch recovery CloudFront Function

CODAP-1323 (post-cutover). **Temporary** viewer-request function that lets a stale, cached
CODAP **V2** app finish booting after the V2→V3 cutover, instead of hanging on a blank
screen. See [`specs/CODAP-1323-v2-cached-launch-recovery.md`](../../../specs/CODAP-1323-v2-cached-launch-recovery.md)
for the full failure analysis, how to verify the failure mode, and the teardown plan.

## Why this exists

A browser that cached a V2 entry document before the cutover may serve it stale (the V2
origin sent no `Cache-Control`, so heuristic caching applies for days). The cached shell
re-requests its relative assets under `/app/static/*` and `/app/codap-config.js`, but after
the cutover those URLs return the `v2-v3-redirect` function's synthetic "Loading CODAP…"
**HTML** (or 404) instead of the V2 JavaScript — so the shell fails with
`Uncaught SyntaxError: Unexpected token '<'` and never launches.

## What it does

Attached **only** to three recovery carve-out behaviors on the cloned distribution
(`/app/static/*`, `/app/codap-config.js`, `/app/extn/*`), each targeting the **V2 (Apache)
origin**. The function rewrites the `/app`-rooted URL onto the pinned final V2 build so those
requests resolve to real V2 files:

```
/app/static/dg/en/cert/javascript-packed.js -> /releases/build_0745/static/dg/en/cert/javascript-packed.js
/app/codap-config.js                        -> /releases/build_0745/codap-config.js
/app/extn/plugins/...                       -> /releases/build_0745/extn/plugins/...
```

It never returns a synthetic response and never redirects. Fresh visitors get V3 (which uses
`/app/version/3.0.0/*` and never requests these paths), so the carve-outs are invisible to
them.

## Deploy / teardown

This function is **gated off by default**. Enabling it is a two-part operation:

1. Build, size-gate, create/update, publish to LIVE:
   ```bash
   ./deploy-function.sh        # FUNCTION_NAME defaults to codap-app-v2-recovery
   ```
2. Turn on the carve-outs in the cutover tooling: in
   `../v2-v3-redirect/config.env` set `RECOVERY_APP_V2_ASSETS=true` (and
   `RECOVERY_FUNCTION_NAME=codap-app-v2-recovery`), then run `../v2-v3-redirect/modify-clone.sh`,
   wait for `distribution-deployed`, and run `../v2-v3-redirect/verify-clone.sh`.

**Teardown** (~2–3 weeks after the cutover; see the spec): set `RECOVERY_APP_V2_ASSETS=false`,
re-run `modify-clone.sh` → wait → `verify-clone.sh`, then optionally delete the function.

## Files

| File | Purpose |
|---|---|
| `v2-asset-recovery.js` | the CloudFront Function — committed, fully-commented source |
| `v2-asset-recovery.test.js` | Jest unit tests (dual-target: source + built artifact) |
| `test-harness.js` | loads the function in a VM, builds CloudFront events |
| `build-function.sh` | strip comments → `dist/v2-asset-recovery.js` |
| `check-size.sh` | verify the 10 KB function-package budget |
| `deploy-function.sh` | create/update + publish to LIVE |
| `test-events/` | sample CloudFront `test-function` events |

Run scripts from this directory. `npm test` builds `dist/` then runs the suite.
