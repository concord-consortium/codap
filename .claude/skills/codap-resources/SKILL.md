---
name: codap-resources
description: Use when deploying, updating, or syncing assets to the codap-resources S3 bucket - plugins, example documents, boundary files, banners, or notification configs
---

# codap-resources

Manage assets in the `s3://codap-resources/` S3 bucket using the AWS CLI.

The bucket is served via CloudFront at `codap-resources.concord.org`.

## When Invoked

Display this to the user:

> **codap-resources** — Deploy and manage assets in the `codap-resources` S3 bucket
> (served at `codap-resources.concord.org`).
>
> This skill helps with copying files, syncing plugin builds, and invalidating
> the CloudFront cache for the CODAP resource bucket.
>
> **Requirements:**
> - AWS CLI installed (`aws --version`)
> - Authenticated with credentials that have write access to the `codap-resources` bucket
>   and permission to create CloudFront invalidations
>
> **What do you want to do?**

Then ask the user what they want to do, or proceed with the task if it was already specified.

## Bucket Structure

| Folder | Contents | ACL | Cache |
|--------|----------|-----|-------|
| `notifications/` | Banners, announcements (JSON) | `public-read` | `no-cache, no-store, must-revalidate` |
| `boundaries/` | GeoJSON boundary documents (US states, counties, etc.) | `public-read` | default |
| `example-documents/` | CODAP example documents | `public-read` | default |
| `plugins/` | Built CODAP plugins (folders) | `public-read` | default |

## Common Commands

### Copy a single file

```bash
aws s3 cp <local-file> s3://codap-resources/<folder>/<filename> --acl public-read
```

For `notifications/` assets, always add no-cache:

```bash
aws s3 cp <local-file> s3://codap-resources/notifications/<filename> \
  --acl public-read \
  --cache-control "no-cache, no-store, must-revalidate"
```

### Sync a folder (plugins, examples, etc.)

**Always use `--size-only`** — timestamps never match between local files and S3, so without this flag every file will appear changed. **Always dry-run first** so the user can review what will change before anything is uploaded:

```bash
# 1. Dry run — show what would change
aws s3 sync <local-folder> s3://codap-resources/<folder>/<name>/ \
  --acl public-read --size-only --dryrun

# 2. After user confirms, run for real
aws s3 sync <local-folder> s3://codap-resources/<folder>/<name>/ \
  --acl public-read --size-only
```

Add `--delete` to remove S3 files that no longer exist locally. Omit it to preserve old files.

### CloudFront Invalidation

After updating cached assets (plugins, documents, boundaries), invalidate the CloudFront cache so changes are served immediately. Not needed for `notifications/` since those use no-cache headers.

**There are three distributions, and the one you invalidate depends on how the asset is consumed:**

| Distribution | Serves | Viewer path | **Invalidation path** |
|--------------|--------|-------------|------------------------|
| `E1RS9TZVZBEEEC` | `codap-resources.concord.org` (direct bucket access) | `/<folder>/...` | `/<folder>/*` |
| `E7WVRGISCR2VR` | `codap3.concord.org` | `/codap-resources/<folder>/...` | `/<folder>/*` |
| `E26XOJN7T3CJO` | `codap.concord.org`, `codap2to3.concord.org` | `/codap-resources/<folder>/...` | `/<folder>/*` |

> ⚠️ **Production V3 does NOT load assets from `codap-resources.concord.org`.** It loads them
> from a **relative** `/codap-resources/...` path (see `kCodapResourcesUrl` in
> `v3/src/constants.ts`, which resolves to `"/codap-resources"` when not in local dev). That
> path is served by the **app** distributions — `E7WVRGISCR2VR` (codap3) and `E26XOJN7T3CJO`
> (codap / codap2to3) — each with its own edge cache. **Invalidating only `E1RS9TZVZBEEEC`
> leaves production users on stale files.** Anything production V3 loads (plugins,
> example-document guides, boundaries) needs the app distributions invalidated too.

> 🛑 **On the app distributions, invalidate the STRIPPED path (`/<folder>/*`), NOT
> `/codap-resources/<folder>/*`.** The `/codap-resources/*` behavior has a viewer-request
> CloudFront function (`StripCodapResourcesPrefix`) that rewrites the URI
> `/codap-resources/...` → `/...` **before** the cache key is computed. Objects are therefore
> cached under the stripped key (e.g. `/plugins/onboarding/strings.json`). An invalidation for
> `/codap-resources/plugins/onboarding/*` matches nothing — it reports `Completed` while
> purging zero objects, and stale content keeps being served. Always invalidate the
> post-rewrite path: `/plugins/onboarding/*`.

```bash
# codap-resources.concord.org (direct bucket access — no prefix function)
aws cloudfront create-invalidation --distribution-id E1RS9TZVZBEEEC \
  --paths "/<folder>/*"

# production app hosts (what V3 users actually hit) — use the STRIPPED path, repeat for both
aws cloudfront create-invalidation --distribution-id E7WVRGISCR2VR \
  --paths "/<folder>/*"
aws cloudfront create-invalidation --distribution-id E26XOJN7T3CJO \
  --paths "/<folder>/*"
```

To confirm an invalidation actually took effect (not just `Completed`), re-request the asset
and check the response: `x-cache: Miss from cloudfront` on the first hit plus the expected
`last-modified`/content means the edge refetched. A `Hit` with stale `last-modified` after a
`Completed` invalidation is the tell-tale sign you invalidated the wrong (pre-rewrite) path.

### List contents of a folder

```bash
aws s3 ls s3://codap-resources/<folder>/
```

## When to Use No-Cache

Use `--cache-control "no-cache, no-store, must-revalidate"` for any asset that:
- May be updated frequently
- Must take effect immediately after changes (e.g., banners, feature flags, notifications)

Immutable, content-hashed files (webpack chunks with a hash in the filename) can use default
caching — their name changes when the content changes.

**But mutable, unversioned plugin entry files** — `index.html`, and any top-level
same-named-across-deploys files like `onboarding.js`, `strings.json`, `init_*.js`,
`task_descriptions*.js` — should be uploaded with `--cache-control "no-cache"` so browsers
revalidate via ETag and pick up changes immediately instead of waiting out CloudFront's (and
the browser's heuristic) default TTL:

```bash
aws s3 cp onboarding.js s3://codap-resources/plugins/onboarding/onboarding.js \
  --acl public-read --cache-control "no-cache"
```

**`no-cache` does NOT mean "don't cache" — it means "cache, but revalidate before reusing."**
It does not force a full download on every load:
- **First load:** the browser downloads the file and stores it along with its `ETag` (the
  content fingerprint S3 returns).
- **Later loads:** the browser sends a conditional request (`If-None-Match: <etag>`). If the
  file is unchanged, the server returns **`304 Not Modified`** with an **empty body** and the
  browser reuses its cached copy — a tiny header-only round-trip, no payload. Only when the
  content actually changed does the server return `200` with the new body.

So the cost is one lightweight revalidation per load (a `304` when nothing changed), and the
benefit is that a deploy is picked up on the **next** load. Contrast:
- `no-store` — never cache; full download every time (heavier than needed here).
- `max-age=N` / immutable — no revalidation round-trip at all; correct only for
  **content-hashed** files (the chunk's filename changes when its content does).
- *(no `Cache-Control`)* — browsers fall back to **heuristic** freshness (~10% of age since
  `Last-Modified`); a year-old `Last-Modified` ⇒ ~weeks of staleness. This is the bug to avoid.

Without `no-cache`, different entry files age out of cache at different times and a deploy can
leave users on a **half-updated plugin** — e.g. a new `onboarding.js` that references string
keys a stale `strings.json` doesn't have yet, so lookups return raw keys like
`~onboarding1.mammals.table.title` instead of the translated text.

## Syncing from V2 Build

During the V2-to-V3 transition, the V2 build on `codap-server.concord.org` is the source of truth for plugins and example documents. CODAP V3 accesses these assets from S3 rather than bundling them in the build. After a V2 build is deployed, the relevant assets can be synced from the server to S3.

The V2 build stores these assets under `extn/` in the release directory:

| Server path | S3 destination |
|-------------|----------------|
| `extn/plugins/` | `s3://codap-resources/plugins/` |
| `extn/example-documents/` | `s3://codap-resources/example-documents/` |
| `extn/boundaries/` | `s3://codap-resources/boundaries/` |

### Plugins to exclude from sync

The V2 build still ships some plugin folders that are no longer used. **Skip these** when syncing `plugins/` — they're dead weight and uploading them just wastes bandwidth and pollutes S3.

| Folder | Why it's dead | Use instead |
|--------|---------------|-------------|
| `NOAA-weather/` | Renamed; V2's plugin map points to `noaa-codap-plugin/`. V3 has an explicit URL rewriter at `v3/src/components/web-view/web-view-utils.ts:28` that translates `/plugins/NOAA-weather/...` → `/plugins/noaa-codap-plugin/...` so old saved documents still load. | `noaa-codap-plugin/` |

When using `aws s3 sync ... s3://codap-resources/plugins/`, pass `--exclude "NOAA-weather/*"` (repeat `--exclude` for any others added in future).

### Sync workflow

Read `~/.codap-build.rc` to get `CODAP_SERVER` (defaults to `codap-server.concord.org`) and `CODAP_SERVER_WWW_BASE` (defaults to `/var/www/html`).

1. **Ask the user what to sync and which build to sync from:**
   - All plugins, a specific plugin, example documents, or boundaries
   - Build number (e.g., `build_0743`)

2. **Download from the server to a local temp directory:**

   For example documents:
   ```bash
   rsync -avz codap-server.concord.org:/var/www/html/releases/build_XXXX/extn/example-documents/ /tmp/codap-sync/example-documents/
   ```

   For all plugins:
   ```bash
   rsync -avz codap-server.concord.org:/var/www/html/releases/build_XXXX/extn/plugins/ /tmp/codap-sync/plugins/
   ```

   For a specific plugin (e.g., `TP-Sampler`):
   ```bash
   rsync -avz codap-server.concord.org:/var/www/html/releases/build_XXXX/extn/plugins/TP-Sampler/ /tmp/codap-sync/plugins/TP-Sampler/
   ```

3. **Dry-run the S3 sync** so the user can review changes.

   For **plugins**, use `--delete` to remove orphaned chunks from previous builds:
   ```bash
   aws s3 sync /tmp/codap-sync/plugins/TP-Sampler/ s3://codap-resources/plugins/TP-Sampler/ \
     --acl public-read --size-only --delete --dryrun
   ```

   For **example documents and boundaries**, omit `--delete` to preserve files:
   ```bash
   aws s3 sync /tmp/codap-sync/example-documents/ s3://codap-resources/example-documents/ \
     --acl public-read --size-only --dryrun
   ```

   Present changed files in two groups: **new** (not in S3) and **modified** (already in S3 with different size).

4. **After user confirms, run for real:**
   ```bash
   aws s3 sync /tmp/codap-sync/plugins/TP-Sampler/ s3://codap-resources/plugins/TP-Sampler/ \
     --acl public-read --size-only --delete
   ```

5. **Fix up entry-point files missed by `--size-only`:**

   Webpack-built plugins use content hashes in JS/CSS filenames, so when code
   changes the chunk filenames change but `index.html` stays the same size while
   referencing different chunks. The `--size-only` flag will miss this update,
   leaving the plugin broken (index.html pointing to chunks that no longer exist).

   **After every plugin sync, explicitly copy `index.html`** to ensure it is
   current:

   ```bash
   aws s3 cp /tmp/codap-sync/plugins/TP-Sampler/index.html \
     s3://codap-resources/plugins/TP-Sampler/index.html --acl public-read
   ```

   This step is not needed for example documents or boundaries since they don't
   have entry-point files with hashed references.

6. **Invalidate CloudFront cache** on every distribution that serves the asset — see the
   [CloudFront Invalidation](#cloudfront-invalidation) section. For a plugin, that means the
   direct distribution **and** the two app distributions production V3 actually loads from:
   ```bash
   aws cloudfront create-invalidation --distribution-id E1RS9TZVZBEEEC \
     --paths "/plugins/TP-Sampler/*"
   # app distributions: STRIPPED path (the StripCodapResourcesPrefix function), NOT /codap-resources/...
   aws cloudfront create-invalidation --distribution-id E7WVRGISCR2VR \
     --paths "/plugins/TP-Sampler/*"
   aws cloudfront create-invalidation --distribution-id E26XOJN7T3CJO \
     --paths "/plugins/TP-Sampler/*"
   ```

7. **Verify the invalidation actually purged (required — do NOT skip):**

   A `Completed` status does **not** mean anything was purged — CloudFront reports no
   match/purge count, so a wrong-path (no-op) invalidation looks identical to a real one.
   The only reliable check is to re-request the asset on each app host and confirm the edge
   refetched. Request an entry file that changed (e.g. a plugin's `index.html` or, for the
   onboarding plugin, `strings.json`):

   ```bash
   for host in codap.concord.org codap3.concord.org; do
     echo "--- $host ---"
     curl -sI "https://$host/codap-resources/plugins/TP-Sampler/index.html" \
       | grep -iE "x-cache|last-modified"
   done
   ```

   **Expect:** `x-cache: Miss from cloudfront` on the first request after the invalidation,
   plus the **new** `last-modified` (or the new content). ✅

   **Red flag:** `x-cache: Hit from cloudfront` with a **stale** `last-modified` after a
   `Completed` invalidation means you invalidated the wrong path (most often the pre-rewrite
   `/codap-resources/...` instead of the stripped `/...` — see the CloudFront Invalidation
   section). Re-invalidate with the correct path and re-verify.

8. **Clean up the temp directory:**
   ```bash
   rm -rf /tmp/codap-sync/
   ```

## Related Repositories

Assets are typically built from sibling repos in the `codap-build` directory:
- `cloud-file-manager` - banner configs, file storage integration
- `codap-data-interactives` - plugin builds
- `codap-data` - example documents and boundary files
