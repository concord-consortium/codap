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

```bash
aws cloudfront create-invalidation --distribution-id E1RS9TZVZBEEEC \
  --paths "/<folder>/*"
```

### List contents of a folder

```bash
aws s3 ls s3://codap-resources/<folder>/
```

## When to Use No-Cache

Use `--cache-control "no-cache, no-store, must-revalidate"` for any asset that:
- May be updated frequently
- Must take effect immediately after changes (e.g., banners, feature flags, notifications)

Static assets (plugins, documents, boundaries) can use default caching.

## Syncing from V2 Build

During the V2-to-V3 transition, the V2 build on `codap-server.concord.org` is the source of truth for plugins and example documents. CODAP V3 accesses these assets from S3 rather than bundling them in the build. After a V2 build is deployed, the relevant assets can be synced from the server to S3.

The V2 build stores these assets under `extn/` in the release directory:

| Server path | S3 destination |
|-------------|----------------|
| `extn/plugins/` | `s3://codap-resources/plugins/` |
| `extn/example-documents/` | `s3://codap-resources/example-documents/` |
| `extn/boundaries/` | `s3://codap-resources/boundaries/` |

### Warning: `.codap` file path rewriting

The V2 build process (`makeCodapZip`) rewrites `%_url_%` placeholders in `.codap` files to relative paths like `../../../../extn/example-documents/guides/...`. These rewritten paths are correct for V2 (which serves everything from the build directory) but **wrong for V3** (which resolves `%_url_%` at runtime).

When syncing example documents, **do not overwrite `.codap` files that already exist in S3** unless you are certain the new version is correct. Compare modified `.codap` files individually (using `jq -S` for readable diffs) and skip any whose only change is a URL path rewrite. New `.codap` files that don't yet exist in S3 are safe to upload.

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

3. **Dry-run the S3 sync** so the user can review changes:
   ```bash
   aws s3 sync /tmp/codap-sync/example-documents/ s3://codap-resources/example-documents/ \
     --acl public-read --size-only --dryrun
   ```

   Present changed files in two groups: **new** (not in S3) and **modified** (already in S3 with different size). For modified `.codap` files, download the S3 version and diff with `jq -S` to check whether the change is real content or just a URL path rewrite (see warning above).

4. **After user confirms, run for real:**
   ```bash
   aws s3 sync /tmp/codap-sync/example-documents/ s3://codap-resources/example-documents/ \
     --acl public-read --size-only
   ```

   If some files need to be excluded (e.g., `.codap` files with only path rewrites), use `--exclude` patterns or upload specific files individually with `aws s3 cp`.

5. **Invalidate CloudFront cache:**
   ```bash
   aws cloudfront create-invalidation --distribution-id E1RS9TZVZBEEEC \
     --paths "/example-documents/*"
   ```

6. **Clean up the temp directory:**
   ```bash
   rm -rf /tmp/codap-sync/
   ```

## Related Repositories

Assets are typically built from sibling repos in the `codap-build` directory:
- `cloud-file-manager` - banner configs, file storage integration
- `codap-data-interactives` - plugin builds
- `codap-data` - example documents and boundary files
