# CloudFront /codap-resources Proxy for CODAP Plugin Same-Origin Access

**Jira**: https://concord-consortium.atlassian.net/browse/CODAP-1218

**Status**: **Closed**

## Overview

Add a `/codap-resources` proxy path on the `codap.concord.org` and `codap3.concord.org` CloudFront distributions so that plugins from the `codap-resources` S3 bucket are served as same-origin resources. Update CODAP v3 to use these same-origin URLs instead of cross-origin `codap-resources.concord.org` URLs, eliminating per-plugin proxy workarounds and enabling drag-and-drop and other same-origin features for all plugins.

## Requirements

- **R1**: Add a `/codap-resources/*` cache behavior on the `codap.concord.org` CloudFront distribution that proxies requests to the `codap-resources` S3 bucket (stripping the `/codap-resources` prefix).
- **R2**: Add a `/codap-resources/*` cache behavior on the `codap3.concord.org` CloudFront distribution that proxies requests to the same `codap-resources` S3 bucket (stripping the `/codap-resources` prefix).
- **R3**: Update CODAP v3 code so that plugin, guide, and resource URLs use the relative path `/codap-resources/...` instead of `https://codap-resources.concord.org/...` when running on a deployed CODAP instance.
- **R4**: When CODAP v3 is running on `localhost` (development), plugin URLs must use the absolute proxy URL `https://codap.concord.org/codap-resources` since there is no local CloudFront proxy. This ensures localhost development uses the same proxy path as production.
- **R5**: The `pluginURL` query parameter override must continue to work for testing/debugging.
- **R6**: The special-case rewrites for plugins currently pointing to `codap3.concord.org/plugins/` (onboarding, NOAA weather) should be updated to use the new `/codap-resources/` path as well, eliminating the need for separate proxy configurations per plugin.
- **R7**: Existing saved documents with absolute `codap-resources.concord.org` URLs or `codap3.concord.org/plugins/` URLs should be rewritten in `processWebViewUrl()` to use `/codap-resources/` URLs, ensuring same-origin access for old documents.
- **R8**: All existing tests must be updated to reflect the new URL patterns.
- **R9**: CloudFront infrastructure changes (cache behaviors + CloudFront Function) must be deployed and verified before the v3 code changes are deployed. Rollback plan: revert the code change (simple redeploy); CloudFront behavior changes take 5-15 minutes to propagate.
- **R10**: Functional testing should verify that drag-and-drop, data transfer, and plugin state work identically when plugins load via `/codap-resources/` — and that same-origin access resolves the drag-and-drop issues that motivated this change.

## Technical Notes

### CloudFront Infrastructure

- **S3 Bucket**: `codap-resources` (not `codap-resources.concord.org`)
- **codap3.concord.org** (`E7WVRGISCR2VR`): Already has `codap-resources.s3.us-east-1.amazonaws.com` as an origin. New cache behavior: `codap-resources/*` (no leading slash, matching existing convention).
- **codap.concord.org** (`E3H9X49AG3GYSO`): Needs new S3 origin added. New cache behavior: `/codap-resources/*` (with leading slash, matching existing convention). Existing `/resources/*` routes to Rails backend — no conflict.
- A single shared CloudFront Function (`StripCodapResourcesPrefix`) strips the prefix from URIs before forwarding to S3.
- Cache policy should match `codap-resources.concord.org` distribution with conservative TTLs (plugins are not versioned).

### Localhost Detection

On `localhost`, the relative `/codap-resources` path won't resolve. The code detects localhost and uses `https://codap.concord.org/codap-resources` instead. Plugins are still cross-origin during local development (same as current behavior).

### Key Files Modified

| File | What Changes |
|------|-------------|
| `v3/src/constants.ts` | `getCodapResourcesUrl()` function with localhost detection; removed `kCodap3RootUrl` / `kCodap3RootPluginsUrl` |
| `v3/src/components/web-view/web-view-utils.ts` | New `kAbsoluteUrlRewrites` for old URLs; removed onboarding special cases; NOAA rewrite uses `kRootPluginsUrl` |
| `v3/src/components/web-view/web-view-registration.ts` | Added `processWebViewUrl()` call to WebView importer (was missing, inconsistent with other importers) |

## Out of Scope

- Changes to the `codap-resources.concord.org` CloudFront distribution itself — all existing direct links, curriculum materials, and bookmarked URLs referencing that domain will continue to work
- Migration of plugins between S3 buckets
- Changes to CODAP v2 plugin URL handling (v2 is legacy)
- Setting up a local dev proxy for `/codap-resources` (developers use the public URL directly)

## Decisions

### How should the CloudFront `/codap-resources` prefix be stripped?
**Context**: CloudFront forwards the full request path to the origin, so `/codap-resources/plugins/Foo/index.html` would look for a nonexistent S3 key. The prefix must be stripped.
**Options considered**:
- A) CloudFront Function on viewer-request
- B) Origin Path configuration
- C) Lambda@Edge origin-request function

**Decision**: A — CloudFront Function. Lightest-weight option (sub-ms latency, no extra cost). Option B doesn't solve the problem. Lambda@Edge is overkill for a simple URI rewrite.

---

### Should `kCodap3RootUrl` / `kCodap3RootPluginsUrl` be removed entirely?
**Context**: These constants existed specifically to give onboarding and NOAA weather plugins same-origin access via per-plugin proxy. With `/codap-resources` providing same-origin for all plugins, they're unnecessary.
**Options considered**:
- A) Remove entirely
- B) Keep as fallback
- C) Keep unchanged

**Decision**: A — Remove entirely. The per-plugin proxy workaround is no longer needed. The `plugins/onboarding/*` cache behavior on codap3 can be cleaned up later.

---

### How should old absolute `codap-resources.concord.org` URLs in saved documents be handled?
**Context**: Existing saved documents contain absolute URLs like `https://codap-resources.concord.org/plugins/...`.
**Options considered**:
- A) Rewrite in `processWebViewUrl()` to `/codap-resources/` URLs
- B) Leave as-is (cross-origin but functional)
- C) Redirect at CloudFront level

**Decision**: A — Rewrite in `processWebViewUrl()` so old documents also get same-origin plugin loading. Also rewrites `codap3.concord.org/plugins/` URLs.

---

### Does codap.concord.org (v2) also need the `/codap-resources` behavior?
**Context**: Active development is v3 only. Is the v2 CloudFront change needed?

**Decision**: Yes, both distributions need it. codap3.concord.org is the beta/development URL and will eventually be served from codap.concord.org, so both need the proxy configured.

---

### The `/resources/*` path on codap.concord.org is already taken — what to do?
**Context**: codap.concord.org already has `/resources/*` routing to the Rails backend.
**Options considered**:
- A) Repurpose the existing behavior
- B) Use a different prefix (`/codap-resources/*`)
- C) Defer codap.concord.org

**Decision**: B — Use `/codap-resources/*` on both distributions. Avoids the conflict entirely.

---

### Deployment ordering
**Context**: Code changes depend on CloudFront infrastructure being in place.

**Decision**: CloudFront changes must be deployed and verified first. Rollback: revert the code change (simple redeploy); CloudFront changes take 5-15 minutes to propagate. Added as R9.

---

### V2 document export writes relative URLs — is this acceptable?
**Context**: Exports will now contain `/codap-resources/` URLs instead of absolute `codap-resources.concord.org` URLs.

**Decision**: Yes — using the proxy URL in exports is the whole point. Old absolute URLs are rewritten on import via `processWebViewUrl()`.

---

### WebView importer was not calling `processWebViewUrl()` — should it?
**Context**: GameView, GuideView, and ImageComponentView importers all call `processWebViewUrl()`, but WebView importer did not. This meant DG.WebView components with `codap-resources.concord.org` URLs would remain cross-origin.

**Decision**: Yes — added `processWebViewUrl()` to the WebView importer for consistency with other importers. This was a pre-existing gap, fixed as part of this work.

---

### Localhost fallback URL
**Context**: On localhost, relative `/codap-resources` won't resolve. Need an absolute URL.

**Decision**: Use `https://codap.concord.org/codap-resources` (not `codap-resources.concord.org`). This uses the proxy on codap.concord.org and will survive the codap3 → codap migration. Plugins are still cross-origin during local dev (not a regression).
