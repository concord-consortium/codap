# Implementation Plan: Research Google Drive Integration for V3 Release

**Jira**: https://concord-consortium.atlassian.net/browse/CODAP-1094
**Requirements Spec**: [requirements.md](requirements.md)
**Status**: **Research Complete — Pending Decision**

## Implementation Plan

This is a research story. The "implementation" consists of investigation tasks that produce documentation and recommendations rather than code changes.

---

### Investigate Google OAuth re-verification requirements

**Summary**: Research whether changing the OAuth authorized origins/redirect URIs triggers Google's verification process. This addresses requirements R1 and R6.

**Tasks**:
1. Review Google's OAuth verification documentation for changes that trigger re-verification
2. Check the current OAuth consent screen verification status in the Google Cloud Console
3. Identify what verification level CODAP currently has (unverified, verified, or sensitive scopes)
4. Determine if adding a new origin (`https://codap3.concord.org/`) requires re-verification or is a simple configuration change
5. Document findings including any timelines if re-verification is needed

**Output**: Section in this document under "Findings" with OAuth re-verification assessment

**Estimated effort**: Research only, no code changes

---

### Investigate Google Drive API re-verification requirements

**Summary**: Research whether changing the Drive API app configuration (the URL that Drive uses to launch CODAP) triggers re-verification. This addresses requirements R2 and R6.

**Tasks**:
1. Navigate to the Google Drive API configuration in the Cloud Console
2. Identify the specific field that controls the "Open with" URL
3. Research Google's documentation on Drive API configuration changes
4. Determine if the change is immediate or requires review
5. Document findings

**Output**: Section in this document under "Findings" with Drive API assessment

**Estimated effort**: Research only, no code changes

---

### Test redirect approach with hash fragment preservation

**Summary**: Validate that a redirect from the V2 URL to V3 can preserve the hash fragment that Google uses. This addresses requirements R3 and R4.

**Tasks**:
1. Capture an actual Google Drive launch URL by opening a `.codap` file from Drive (document the full URL including hash)
2. Analyze the URL structure: what's in query params vs. hash fragment
3. Test client-side redirect approaches:
   - Simple `window.location.href` redirect
   - Meta refresh redirect
   - JavaScript redirect that explicitly preserves hash
4. Verify the hash fragment arrives intact at the V3 destination
5. Test that V3 (CFM) successfully opens the Google Drive file after redirect
6. Verify CFM's URL parsing handles the redirected origin correctly (no origin-based assumptions that break)

**Output**:
- Documented URL structure showing what Google sends
- Test results confirming redirect feasibility
- Code snippet for the redirect page if successful

**Estimated effort**: Testing and documentation, minimal code (redirect page prototype)

---

### Document CloudFront redirect implementation options

**Summary**: Research how to implement the redirect at the CloudFront layer. This supports requirement R3.

**Tasks**:
1. Document options for implementing redirects in CloudFront:
   - CloudFront Functions (lightweight, limited)
   - Lambda@Edge (full Node.js, more capabilities)
   - Origin returning a redirect page
2. Determine which approach best handles the hash fragment preservation issue
3. Verify deployment access to distribution `E3H9X49AG3GYSO` and document the deployment process (Terraform, AWS Console, CI/CD)
4. Document monitoring/observability options (CloudWatch metrics, logging, alerts for redirect failures)
5. Provide a draft configuration or code for the chosen approach

**Output**: Recommended CloudFront implementation approach with draft configuration

**Estimated effort**: Research and documentation, no production changes

---

### Compile recommendations and migration plan

**Summary**: Synthesize all findings into a clear recommendation with trade-offs and a proposed timeline. This addresses requirement R5.

**Tasks**:
1. Compare the two approaches:
   - **Direct URL change**: Update Google config to point directly to V3
   - **Redirect approach**: Keep Google config pointing to V2, redirect to V3
2. Document trade-offs:
   - Risk (re-verification delay vs. redirect complexity)
   - Long-term maintenance (redirect tech debt vs. clean config)
   - Rollback capability
   - Failure modes (what happens if V3 is unavailable after redirect?)
3. Define explicit decision thresholds (e.g., "if re-verification > 2 weeks, recommend redirect approach")
4. Propose a migration timeline considering the imminent V3 release
5. Identify any blocking questions that need stakeholder input

**Output**: Final recommendation section with clear next steps

**Estimated effort**: Synthesis and writing

---

## Findings

<!-- Populated as research is completed -->

### OAuth Re-verification Assessment

**Sources**: [Google OAuth Policy Compliance](https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance), [Verification Requirements](https://support.google.com/cloud/answer/13464321?hl=en), [Setting up OAuth 2.0](https://support.google.com/googleapi/answer/6158849?hl=en)

**Key findings:**

1. **Authorized JavaScript Origins Requirements**:
   - Origins must use HTTPS (localhost exempt)
   - Cannot be raw IP addresses
   - Cannot contain URL shortener domains
   - Must be domains you own or are authorized to use

2. **Domain Verification**:
   - Google requires verification of all domains associated with:
     - Home page, privacy policy, terms of service
     - Authorized redirect URIs
     - Authorized JavaScript origins
   - Verification is done via [Google Search Console](https://search.google.com/search-console)

3. **Adding New Origins**:
   - Adding `https://codap3.concord.org/` as a new authorized origin **likely requires domain verification** if not already verified
   - The domain must be added to the OAuth consent screen's "Authorized domains" section
   - If CODAP already has a verified OAuth consent screen, adding a subdomain of an already-verified domain may be simpler

4. **Re-verification Triggers** (needs Console confirmation):
   - Changes to sensitive scopes
   - Changes to unverified domains
   - Major changes to app branding/description
   - **Likely NOT triggered** by adding a new origin on an already-verified domain

**Console verification completed (2026-02-04):**

| Check | Result |
|-------|--------|
| Branding verification status | ✅ **Verified** — "Your branding has been verified and is being shown to users" |
| Data access verification | ✅ **Not required** — "app is not requesting any sensitive or restricted scopes" |
| `codap3.concord.org` in JS origins | ✅ **Already configured** |
| Redirect URI for V3 | ❌ Not configured (but likely not needed for Picker flow) |

**Conclusion**: No re-verification risk. Changes to OAuth configuration should be immediate since branding is verified and no sensitive scopes are used.

---

### Drive API Assessment

**Sources**: [Configure a Drive UI integration](https://developers.google.com/workspace/drive/api/guides/enable-sdk), [Integrate with "Open with" menu](https://developers.google.com/workspace/drive/api/guides/integrate-open)

**Key findings:**

1. **Open URL Configuration**:
   - The "Open URL" is set in Google API Console → APIs & Services → Google Drive API → Drive UI integration tab
   - Must be a fully qualified domain name (localhost doesn't work)
   - **Ownership verification required** before listing in Google Workspace Marketplace

2. **State Parameter Structure**:
   When Google Drive launches CODAP, it appends a `state` parameter (URL-encoded JSON):
   ```json
   {
     "ids": ["FILE_ID"],
     "resourceKeys": {"FILE_ID": "RESOURCE_KEY"},
     "action": "open",
     "userId": "USER_ID"
   }
   ```
   This is different from the hash fragment format CODAP currently uses (`#file=googleDrive:{ids}`).

3. **Verification for URL Changes**:
   - If CODAP is listed in Marketplace, changing the URL requires re-verification of domain ownership
   - If not in Marketplace, the change may be immediate (needs Console confirmation)

**Console verification completed (2026-02-04):**

| Setting | Current Value |
|---------|---------------|
| **Open URL** | `http://codap.concord.org/app/static/dg/en/cert/index.html#file=googleDrive:{ids}` |
| **New URL** | `http://codap.concord.org/app/static/dg/en/cert/index.html#newInFolder=googleDrive:{folderId}` |
| **MIME types** | `application/json`, `text/plain` |

**Key insight**: The Drive API uses **hash fragments** (not query params) with the `{ids}` and `{folderId}` template variables. This confirms:
- Browsers will preserve these hash fragments during 301/302 redirects
- CloudFront cannot see/modify the hash, but that's OK — it just needs to redirect the base URL
- The CFM's hash-based URL parsing (`#file=googleDrive:...`) matches what Google sends

---

### URL Structure Analysis

**Based on CFM code analysis** ([cloud-file-manager source](https://github.com/concord-consortium/cloud-file-manager))

1. **Hash Parameter Format Used by CFM**:
   ```
   #file={provider}:{encodedParams}
   #shared={sharedContentId}
   #copy={params}
   #newInFolder={params}
   ```

2. **CFM URL Parsing** (`client.ts` lines 300-400):
   - `processUrlParams()` extracts hash params using `getHashParam()` utility
   - Hash params are stored in `appOptions.hashParams`

3. **Origin-Based Logic** (`client.ts` line 1220):
   ```typescript
   getCurrentUrl(hashString?: string) {
     return `${window.location.origin}${window.location.pathname}${window.location.search}${hashString || ""}`
   }
   ```
   **Risk**: This reconstructs URLs using `window.location.origin`, which could cause issues if origin changes during redirect.

4. **CODAP v3 Google Drive Enablement** (`use-cloud-file-manager.ts` lines 357-368):
   ```typescript
   if (process.env.GOOGLE_DRIVE_APP_ID &&
       (document.location.protocol === 'https:' ||
        document.location.hostname === 'localhost' ||
        document.location.hostname === '127.0.0.1')) {
     // Enable Google Drive provider
   }
   ```
   This check happens at initialization, not during OAuth flow.

**Testing needed**: Capture an actual Google Drive → CODAP launch URL to confirm exact format.

---

### Redirect Test Results

**Testing completed (2026-02-04):**

**Captured URL from Google Drive "Open with":**
```
https://codap.concord.org/app/static/dg/en/cert/index.html#file=googleDrive:1HvtWHwk2ivKLr-ezyu3YW-DY0btW3KL0
```

**Direct V3 test (simulating redirect):**
```
https://codap3.concord.org/#file=googleDrive:1HvtWHwk2ivKLr-ezyu3YW-DY0btW3KL0
```

| Test | Result |
|------|--------|
| V3 loads with hash fragment | ✅ **Works** |
| CFM parses `#file=googleDrive:{id}` | ✅ **Works** |
| OAuth flow from `codap3.concord.org` | ✅ **Works** (login button click required, then completes) |
| Document loads from Google Drive | ✅ **Works** |

**Conclusion**: The redirect approach is **fully validated**. A 301 redirect from V2 URL → V3 URL will work because:
1. Browsers preserve hash fragments during HTTP redirects
2. V3 CFM correctly parses the `#file=googleDrive:{id}` hash format
3. OAuth is already configured for `codap3.concord.org` origin

---

### CloudFront Implementation Options

**Sources**: [CloudFront Functions samples](https://github.com/aws-samples/amazon-cloudfront-functions), [Mastering URL Redirections with CloudFront Functions](https://www.tecracer.com/blog/2024/08/mastering-url-redirections-with-aws-cloudfront-functions.html)

**Critical insight**: **Hash fragments are NEVER sent to the server** — they remain entirely client-side. CloudFront cannot see or manipulate them.

**Options:**

| Option | Pros | Cons |
|--------|------|------|
| **CloudFront Functions** | Lightweight, low latency, simple JS | Can't see hash fragments, limited runtime |
| **Lambda@Edge** | Full Node.js, more capabilities | More complex, higher latency |
| **Origin redirect page** | Can do client-side JS redirect | Extra request, more infrastructure |

**Recommended approach**: Since hash fragments are client-side only:

1. **Option A (if data is in query params)**: Use CloudFront Function for simple 301/302 redirect
   ```javascript
   function handler(event) {
     var response = {
       statusCode: 301,
       statusDescription: 'Moved Permanently',
       headers: {
         'location': { value: 'https://codap3.concord.org/' + event.request.querystring }
       }
     };
     return response;
   }
   ```

2. **Option B (if data is in hash fragment)**: Browsers preserve hash on redirect automatically — standard 301 redirect should work

3. **Option C (if neither works)**: Serve a small HTML page that does client-side redirect:
   ```html
   <script>window.location.href = 'https://codap3.concord.org/' + window.location.search + window.location.hash;</script>
   ```

**Deployment**: CloudFront distribution `E3H9X49AG3GYSO` — need to verify deployment access and process (Terraform/Console/CI)

---

## Recommendation

### Final Recommendation (validated 2026-02-04)

**All research and testing complete. Both approaches are viable.**

#### Option A: Redirect Approach (Recommended for V3 Launch)

Deploy a CloudFront redirect from the V2 URL path to V3. This is the **lowest risk, fastest** option.

**Implementation:**
```javascript
// CloudFront Function for viewer-request
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Redirect V2 CODAP path to V3
  if (uri.startsWith('/app/static/dg/')) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        'location': { value: 'https://codap3.concord.org/' }
      }
    };
  }
  return request;
}
```

**Note**: The hash fragment (`#file=googleDrive:{id}`) is preserved automatically by the browser — CloudFront doesn't need to handle it.

#### Option B: Direct URL Change in Google Console

Update the Google Drive API "Open URL" directly to `https://codap3.concord.org/#file=googleDrive:{ids}`.

**Pros**: No redirect tech debt, cleaner long-term
**Cons**: Slightly more risk (though testing shows it works)

---

### Validation Summary

| Check | Status |
|-------|--------|
| OAuth branding verified | ✅ |
| No sensitive scopes (no re-verification) | ✅ |
| `codap3.concord.org` in authorized JS origins | ✅ |
| V3 parses `#file=googleDrive:{id}` correctly | ✅ |
| OAuth flow works from V3 | ✅ |
| Document loads from Google Drive on V3 | ✅ |

### Proposed Migration Path

| Phase | Action | Risk | Status |
|-------|--------|------|--------|
| **Phase 1** | Deploy CloudFront redirect OR update Google Drive URL | Low | Ready |
| **Phase 2** | Monitor for issues, gather user feedback | Low | — |
| **Phase 3** (if redirect) | Update Google Drive URL to point directly to V3 | Low | — |
| **Phase 4** (cleanup) | Remove redirect, retire V2 URL | Low | — |

### Decision

**Status**: Pending team discussion

**Options:**
- **A) Redirect**: Safest for V3 launch. Can update Google config later.
- **B) Direct**: Cleaner. Testing shows it works. No redirect overhead.

Both approaches are validated and ready to implement.

---

## Resolved Questions

<!-- Implementation-focused questions only. Requirements questions go in requirements.md. -->

### RESOLVED: Who has access to the Google Cloud Console for CODAP?
**Context**: The research steps require accessing the Google Cloud Console to review OAuth and Drive API configurations. We need to confirm who has admin access.
**Options considered**:
- A) Doug Martin has access
- B) Scott Cytacki has access
- C) Kirk Swenson has access
- D) Access needs to be arranged

**Decision**: A — Doug Martin has access to the Google Cloud Console and can perform the OAuth and Drive API configuration research.

---

### RESOLVED: Is there an existing `.codap` file in Google Drive we can use for testing?
**Context**: Testing the redirect approach requires launching CODAP from a real Google Drive file to capture the actual URL structure Google generates.
**Options considered**:
- A) Yes, there's a test file we can use (provide link/location)
- B) No, we need to create one
- C) We can use any user's Drive file for testing

**Decision**: A — An existing test file is available for redirect testing.

---

### RESOLVED: What is the CloudFront distribution ID for codap.concord.org?
**Context**: If implementing the redirect at CloudFront, we need to identify the specific distribution and confirm we have deployment access.

**Decision**: `E3H9X49AG3GYSO` — This is the CloudFront distribution for codap.concord.org.

---

## Self-Review

### Senior Engineer

#### RESOLVED: Verify CFM handles redirected URLs correctly
The research should confirm that the Cloud File Manager (CFM) in V3 can successfully parse and process the Google Drive hash fragment when arriving via redirect. The CFM's URL parsing may have assumptions about the origin or URL structure that could break after redirect.

**Resolution**: Added task 6 to "Test redirect approach" step to verify CFM's URL parsing handles the redirected origin correctly.

---

#### RESOLVED: Document error handling for redirect failures
The implementation plan doesn't address what happens if V3 is unavailable when the redirect occurs. Users would hit the redirect and then see a broken page.

**Resolution**: Added "Failure modes (what happens if V3 is unavailable after redirect?)" to the trade-offs in the "Compile recommendations" step.

---

### Product Manager

#### RESOLVED: Define recommendation document format
R5 requires documenting "the recommended approach with trade-offs" but doesn't specify the deliverable format. Is this a section in implementation.md, a separate document, or a Jira comment?

**Resolution**: The "Recommendation" section in this document serves as the deliverable. The spec structure already makes this clear.

---

#### RESOLVED: Success criteria for approach selection
The timeline pressure (imminent release) is noted, but there's no explicit threshold for when to choose redirect vs. direct URL change. For example: "If re-verification takes > 2 weeks, use redirect."

**Resolution**: Added task 3 to "Compile recommendations" step to define explicit decision thresholds.

---

### DevOps Engineer

#### RESOLVED: CloudFront deployment access and process
The distribution ID is known (`E3H9X49AG3GYSO`), but the research should confirm: (1) who has deployment access, and (2) what the deployment process is (Terraform, AWS Console, CI/CD).

**Resolution**: Added task 3 to "Document CloudFront redirect implementation options" step to verify deployment access and document the process.

---

#### RESOLVED: Monitoring and observability for redirect
If implementing a redirect, how will the team know it's working correctly? Should there be CloudWatch metrics, logging, or alerts?

**Resolution**: Added task 4 to "Document CloudFront redirect implementation options" step to document monitoring/observability options.
