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

**Always dry-run first** so the user can review what will change before anything is uploaded:

```bash
# 1. Dry run — show what would change
aws s3 sync <local-folder> s3://codap-resources/<folder>/<name>/ \
  --acl public-read --dryrun

# 2. After user confirms, run for real
aws s3 sync <local-folder> s3://codap-resources/<folder>/<name>/ \
  --acl public-read
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

## Related Repositories

Assets are typically built from sibling repos in the `codap-build` directory:
- `cloud-file-manager` - banner configs, file storage integration
- `codap-data-interactives` - plugin builds
- `codap-data` - example documents and boundary files
