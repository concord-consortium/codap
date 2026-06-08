'use strict'
// CloudFront Function -- V2 cached-launch recovery for codap.concord.org   [CODAP-1323]
// Runtime: cloudfront-js-2.0   Stage: viewer-request
// Spec: specs/CODAP-1323-v2-cached-launch-recovery.md
// This is the committed, fully-commented source; the deployed artifact is
// dist/v2-asset-recovery.js -- comments stripped by build-function.sh (matches v2-v3-redirect's R20b).
//
// TEMPORARY. Attached ONLY to the recovery carve-out behaviors on the CLONED distribution:
//   /app/static/*, /app/codap-config.js, /app/extn/*
// Those behaviors target the V2 (Apache) origin. This function remaps the /app-rooted URL
// onto the pinned final V2 build so a stale cached V2 shell's relative subresource requests
// resolve to the REAL V2 files instead of the v2-v3-redirect function's synthetic
// "Loading CODAP..." HTML (which a cached shell would try to execute as JavaScript and fail
// on -- `Uncaught SyntaxError: Unexpected token '<'`). It NEVER produces a synthetic
// response and NEVER redirects -- it only rewrites request.uri and returns the request.
//
// Remove at teardown once pre-cutover V2 shells have aged out of browser caches
// (~2-3 weeks; see the spec's "Blast radius / teardown" section). It is gated on the clone
// behind modify-clone.sh's RECOVERY_APP_V2_ASSETS flag, so it is inert until an operator
// opts in.
//
// Origin-selection note: CloudFront picks the cache behavior from the ORIGINAL request URI
// (the recovery patterns are more specific than /app/* and sit at head-of-array). The
// rewrite below happens AFTER behavior/origin selection, so rewriting to /releases/...
// still goes to THIS behavior's V2 origin -- it does not re-trigger the /releases/* behavior.

// Pinned final V2 build (build_0745, 2026-05-22). Frozen; a one-line change retargets it.
// Build choice rationale (cross-build shell compatibility) is in the spec.
var BUILD_PREFIX = '/releases/build_0745'

function handler(event) {
  var request = event.request
  var uri = request.uri
  // Defensive guard: the attached behaviors only match /app/static/*, /app/codap-config.js,
  // and /app/extn/*, so uri always begins with "/app/". The guard keeps the function a
  // no-op for any unexpected path rather than corrupting it.
  if (uri.indexOf('/app/') === 0) {
    // Drop the 4-char "/app" prefix and prepend the pinned build directory:
    //   /app/static/dg/en/cert/javascript-packed.js -> /releases/build_0745/static/dg/en/cert/javascript-packed.js
    //   /app/codap-config.js                        -> /releases/build_0745/codap-config.js
    //   /app/extn/plugins/...                       -> /releases/build_0745/extn/plugins/...
    request.uri = BUILD_PREFIX + uri.slice(4)
  }
  return request
}
