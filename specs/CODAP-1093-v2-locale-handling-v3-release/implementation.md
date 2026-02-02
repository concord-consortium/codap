# Implementation Plan: V2 to V3 Locale Redirect

**Jira**: https://concord-consortium.atlassian.net/browse/CODAP-1093
**Requirements Spec**: [requirements.md](requirements.md)
**Status**: **In Development**

## Implementation Plan

### Create client-side redirect page template

**Summary**: Build a single HTML+JS redirect page that can be deployed to V2 language paths. This page reads the current URL (including hash fragment), constructs the appropriate V3 destination URL, and redirects.

**Files affected**:
- `redirect-template.html` (new) — The redirect page template

**Estimated diff size**: ~50 lines

**Implementation**:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Redirecting to CODAP...</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
    .message { text-align: center; }
  </style>
</head>
<body>
  <div class="message">
    <p>Redirecting to CODAP...</p>
    <p><a id="manual-link" href="">Click here if not redirected automatically</a></p>
  </div>
  <script>
    (function() {
      // Configuration: set by deployment
      var LANG = '{{LANG}}';  // e.g., 'es', 'ja', 'en'
      var V3_BASE = 'https://codap3.concord.org/';  // V3 destination base URL

      // Build destination URL
      var destUrl = V3_BASE;
      var queryString = window.location.search;
      var hash = window.location.hash;

      // Add lang parameter for non-English languages
      if (LANG && LANG !== 'en') {
        var langParam = 'lang=' + encodeURIComponent(LANG);
        if (queryString) {
          queryString += '&' + langParam;
        } else {
          queryString = '?' + langParam;
        }
      }

      destUrl += queryString + hash;

      // Update manual link
      document.getElementById('manual-link').href = destUrl;

      // Redirect
      window.location.replace(destUrl);
    })();
  </script>
</body>
</html>
```

---

### Generate redirect pages for each V2 language

**Summary**: Create a build script that generates redirect pages for each V2 language path by substituting the `{{LANG}}` placeholder in the template.

**Files affected**:
- `bin/generate-v2-redirects.sh` (new) — Script to generate redirect pages
- `redirect-pages/` (new directory) — Output directory for generated pages

**Estimated diff size**: ~80 lines

**Implementation**:

```bash
#!/bin/bash
# generate-v2-redirects.sh
# Generates redirect pages for V2 language paths

TEMPLATE="redirect-template.html"
OUTPUT_DIR="redirect-pages"

# V2 supported languages (13)
LANGUAGES="de el en es he ja nb nn pt-BR th tr zh-Hans zh-TW"

mkdir -p "$OUTPUT_DIR"

for lang in $LANGUAGES; do
  mkdir -p "$OUTPUT_DIR/static/dg/$lang/cert"
  sed "s|{{LANG}}|$lang|g" "$TEMPLATE" > "$OUTPUT_DIR/static/dg/$lang/cert/index.html"
  echo "Generated redirect for $lang"
done

# Generate root redirect (auto-detect, no lang param)
mkdir -p "$OUTPUT_DIR"
sed "s|{{LANG}}||g" "$TEMPLATE" > "$OUTPUT_DIR/index.html"
echo "Generated root redirect"

echo "Done. Deploy contents of $OUTPUT_DIR using the existing CODAP V2 release process."
```

---

### Deploy redirect pages to V2 hosting

**Summary**: Deploy the generated redirect pages using the existing CODAP V2 release process.

**Infrastructure note**: The CloudFront distribution uses an EC2 server at `https://codap-server.concord.org/` as the origin. The server uses symlinks where `/releases/latest` points to a unique per-release folder (e.g., `/releases/build_XXXX/`). Use the existing V2 release process to handle paths correctly.

**Files affected**:
- EC2 server file system (via existing release process)
- CloudFront invalidation (as part of release process)

**Estimated diff size**: N/A (deployment operation)

**Implementation notes**:
1. Before deploying redirects, copy the current V2 release to `/v2/` path so V2 remains accessible at `codap.concord.org/v2/` indefinitely
2. Use the existing CODAP V2 release process to deploy the redirect pages as a new "release"
3. The release process will handle:
   - Creating the release folder structure
   - Updating the `/releases/latest` symlink
   - CloudFront cache invalidation
4. Verify redirects work before and after symlink update

---

### Handle /app path redirect

**Summary**: The `/app` path in V2 redirects to `/static/dg/en/cert/` by default. Update this to redirect to V3 root without a language parameter (let V3 auto-detect).

**Files affected**:
- EC2 server: `/app/index.html` or server configuration

**Estimated diff size**: N/A (infrastructure configuration)

**Implementation options**:
- **Option A**: EC2 server redirect rule (nginx/Apache config) for `/app` → V3 root
- **Option B**: CloudFront function to handle `/app` redirect
- **Option C**: Deploy redirect HTML page at `/app/index.html` on EC2

Recommend Option C for consistency with language redirects and hash preservation.

---

### Configure CloudFront cache behaviors

**Summary**: Ensure CloudFront is configured to serve the redirect pages correctly and with appropriate caching. CloudFront uses `codap-server.concord.org` (EC2) as the origin.

**Files affected**:
- CloudFront distribution configuration

**Estimated diff size**: N/A (infrastructure configuration)

**Implementation notes**:
1. Set short TTL (e.g., 60 seconds) initially for easy updates
2. Ensure `index.html` is the default root object
3. After validation, increase TTL for better performance
4. Consider using CloudFront Functions for simple query-string-only redirects (faster, but can't preserve hash)

---

### Set up monitoring and alerting

**Summary**: Configure CloudWatch alarms to detect redirect failures or unexpected traffic patterns.

**Files affected**:
- CloudWatch alarm configuration

**Estimated diff size**: N/A (infrastructure configuration)

**Implementation notes**:
1. Monitor 4xx/5xx error rates on V2 paths
2. Monitor V3 traffic to detect successful redirects
3. Set up alerts for sudden traffic drops (may indicate broken redirects)
4. Monitor for `lang` parameter distribution in V3 analytics

---

### Create rollback procedure

**Summary**: Document and test a rollback procedure in case redirects cause issues.

**Files affected**:
- `docs/v2-redirect-rollback.md` (new) — Rollback procedure documentation

**Estimated diff size**: ~30 lines

**Implementation notes**:
1. The previous V2 release folder remains on EC2 after deploying redirects (release process creates a new folder, doesn't overwrite)
2. To rollback: Update `/releases/latest` symlink to point to the previous V2 release folder
3. Invalidate CloudFront cache after symlink change: `aws cloudfront create-invalidation --distribution-id <DIST_ID> --paths "/*"`
4. Test rollback procedure before go-live by temporarily switching the symlink and verifying V2 loads

---

### Update curriculum author documentation

**Summary**: Add guidance for curriculum authors who need language consistency in their materials.

**Files affected**:
- Release notes or documentation (location TBD)

**Estimated diff size**: ~20 lines

**Content**:
> **Language handling in CODAP V3**
>
> CODAP V3 automatically detects the user's preferred language from their browser settings. If you need to ensure all users see CODAP in a specific language (e.g., for classroom consistency), add `?lang=XX` to your CODAP URL, where `XX` is the language code (e.g., `?lang=en` for English, `?lang=es` for Spanish).

---

## Open Questions

### RESOLVED: What is the V3 production URL?
**Context**: The redirect pages need to know the V3 destination URL. Is it `https://codap.concord.org/v3/`, `https://codap3.concord.org/`, or something else?
**Options considered**:
- A) `https://codap.concord.org/v3/`
- B) `https://codap3.concord.org/`
- C) Other

**Decision**: B — `https://codap3.concord.org/`

---

### RESOLVED: Should V2 be kept available at a backup URL?
**Context**: For rollback and debugging, it may be useful to keep V2 accessible at a different path (e.g., `/v2/` or `/releases/latest-v2/`).
**Options considered**:
- A) Yes, keep V2 at a backup path indefinitely
- B) Yes, keep V2 at a backup path temporarily (e.g., 6 months)
- C) No, fully replace V2 with redirects

**Decision**: A — Keep V2 available indefinitely at `/v2/`

---

### RESOLVED: Deployment timing and phased rollout?
**Context**: Should redirects be deployed all at once, or phased (e.g., non-English first, then English)?
**Options considered**:
- A) All at once
- B) Phased: non-English languages first, English last
- C) Phased: start with low-traffic languages, expand gradually

**Decision**: A — Deploy all redirects at once

## Self-Review

### Senior Engineer

#### RESOLVED: Script output path doesn't match deployment path
The bash script generates files at `$OUTPUT_DIR/static/dg/$lang/cert/` but the deployment notes specify `/releases/latest/static/dg/{lang}/cert/`. The script output structure doesn't include the `/releases/latest/` prefix.

**Resolution**: B — The existing CODAP V2 release process handles copying files to the correct release folder and updating the symlink. The script generates the file structure relative to the release root; the deployment process places it in the correct location.

---

#### RESOLVED: Template has hardcoded V3_BASE but script tries to substitute it
The redirect template has `var V3_BASE = 'https://codap3.concord.org/';` hardcoded in the JavaScript, but the bash script tries to substitute `{{V3_BASE}}`. The substitution won't work because there's no `{{V3_BASE}}` placeholder in the template.

**Resolution**: Since the V3 URL is now decided (`https://codap3.concord.org/`), remove the `{{V3_BASE}}` substitution from the script. The hardcoded value in the template is correct.

---

#### RESOLVED: What happens to V2 assets (CSS, images, JS)?
The redirect pages only replace the `index.html` files. What about other V2 assets that might be referenced by external links or bookmarks?

**Resolution**: V2 will remain fully accessible at `/v2/`, so any direct links to V2 assets can be redirected or manually updated to use the `/v2/` path prefix. In practice, external links to V2 are almost exclusively to the `index.html` entry points (with query strings/hashes for documents), not to internal assets like CSS or JS files. Internal asset references within V2 are relative and will continue working at `/v2/`.

---

### DevOps Engineer

#### RESOLVED: Deployment method not specified
How will redirect pages be deployed to the EC2 server?

**Resolution**: Use the existing CODAP V2 release process. This provides a consistent deployment method with established access controls, audit trail (via release folder naming), and rollback capabilities (by updating the symlink to point to a previous release folder).

---

#### RESOLVED: Rollback procedure references S3 but V2 is on EC2
The rollback procedure step mentions "Keep V2 application files in a backup S3 path" but V2 is hosted on EC2 (`codap-server.concord.org`), not S3.

**Resolution**: Updated the rollback procedure to reference the EC2 filesystem. The symlink-based release structure (`/releases/latest` → unique release folder) provides natural rollback capability — simply update the symlink to point to the previous V2 release folder.

---

#### RESOLVED: CloudFront invalidation commands not documented
The implementation mentions CloudFront cache invalidation but didn't specify commands.

**Resolution**: Added invalidation command to rollback procedure. The existing V2 release process already handles CloudFront invalidation as part of deployment. For manual invalidation: `aws cloudfront create-invalidation --distribution-id <DIST_ID> --paths "/*"` (distribution ID to be obtained from AWS console or infrastructure documentation).

---

### QA Engineer

#### RESOLVED: No test matrix for redirect verification
The implementation should include a test matrix for verification.

**Resolution**: Test matrix to be created during QA phase. Key test cases:
| Source | Expected Destination |
|--------|---------------------|
| `/` (root) | `https://codap3.concord.org/` |
| `/static/dg/en/cert/` | `https://codap3.concord.org/` |
| `/static/dg/es/cert/` | `https://codap3.concord.org/?lang=es` |
| `/static/dg/es/cert/?url=X` | `https://codap3.concord.org/?url=X&lang=es` |
| `/static/dg/ja/cert/#shared=Y` | `https://codap3.concord.org/?lang=ja#shared=Y` |
| `/app` | `https://codap3.concord.org/` |

Each language should be tested with: (1) no params, (2) query string only, (3) hash only, (4) both query string and hash.

---

#### RESOLVED: iframe redirect testing method not specified
Given that many V2 embeds are in iframes, how will we verify that iframe redirects work correctly?

**Resolution**: Create a test HTML page that embeds CODAP via iframe using various V2 language URLs. Verify:
1. Redirect occurs within iframe (not blocked by X-Frame-Options)
2. V3 loads successfully in the iframe after redirect
3. No console errors in parent page
4. Cross-origin communication still works (if applicable to the embed scenario)

The redirect pages themselves don't set X-Frame-Options, so they won't block iframe embedding. V3's X-Frame-Options/CSP settings determine whether the final destination can be framed.

---

### Security Engineer

#### RESOLVED: X-Frame-Options / CSP for redirect pages
The redirect pages will be served from `codap.concord.org` but redirect to `codap3.concord.org`.

**Resolution**:
1. **Redirect pages**: The HTML template doesn't set X-Frame-Options or CSP headers. Server configuration should not add restrictive framing headers to these pages.
2. **V3**: Must allow being framed from curriculum sites. This is a V3 deployment configuration concern, not specific to redirects. Verify V3's current X-Frame-Options/CSP settings allow framing from expected curriculum domains before deploying redirects.

Action item: Before deploying redirects, verify V3 allows iframe embedding from known curriculum sites (e.g., LARA, Portal, etc.).

---

#### RESOLVED: Verify no open redirect vulnerability
Confirmed this is not an open redirect vulnerability:
- The destination base URL (`https://codap3.concord.org/`) is hardcoded in the template, not derived from user input
- User-controlled data (query string, hash fragment) is appended to the URL but cannot change the destination domain
- The `lang` parameter is derived from the `{{LANG}}` template variable set at build time, not from user input
- No URL parsing that could be exploited (e.g., no handling of `@` in URLs that could redirect to attacker-controlled domains)

**Security review complete**: This implementation follows secure redirect patterns.
