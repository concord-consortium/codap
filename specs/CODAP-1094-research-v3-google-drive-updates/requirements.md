# Research: Google Drive Integration for V3 Release Planning

**Jira**: https://concord-consortium.atlassian.net/browse/CODAP-1094
**Repo**: https://github.com/concord-consortium/codap
**Implementation Spec**: [implementation.md](implementation.md)
**Status**: **Research Complete — Pending Decision**

## Overview

This research investigated Google Drive integration requirements for transitioning from CODAP V2 to V3. **Key finding: Both redirect and direct URL change approaches are validated and ready to implement.** No Google re-verification is required since the OAuth branding is already verified and no sensitive scopes are used.

## Project Owner Overview

CODAP integrates with Google Drive via two mechanisms: (1) the Google Drive Picker (for opening files from within CODAP), and (2) the "Open with" menu in Google Drive (for launching CODAP from Drive).

**Research results (2026-02-04):**
- The V3 domain (`codap3.concord.org`) is already configured in Google's OAuth authorized origins
- OAuth branding is verified — no re-verification delays expected
- Testing confirmed that V3 successfully opens Google Drive files using the same URL format as V2
- Two implementation options are available: (A) deploy a CloudFront redirect from V2→V3, or (B) directly update the Google Drive "Open URL" to V3

**Decision pending**: Team should choose between redirect approach (safest) or direct URL change (cleanest).

## Background

Kirk Swenson, Doug Martin, and Scott Cytacki reviewed the CODAP Google Cloud project configuration on 2026-01-28. They identified that the CODAP URL is stored in at least two places:

1. **OAuth configuration** — The OAuth 2.0 Client ID settings include "Authorized JavaScript origins" and "Authorized redirect URIs" that reference the CODAP URL.
2. **Google Drive configuration** — The Google Drive API/app configuration that controls how Drive launches CODAP when a user opens a `.codap` file.

The CODAP V3 codebase uses the `@concord-consortium/cloud-file-manager` (CFM) library to handle all Google Drive interaction. The CFM abstracts the entire Google Drive OAuth flow, file picker, and file I/O. CODAP V3 configures the CFM with three environment variables (`GOOGLE_DRIVE_APP_ID`, `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_API_KEY`) and enables the Google Drive provider only when the origin is HTTPS or localhost (see `v3/src/lib/cfm/use-cloud-file-manager.ts:356-368`).

The Google Cloud project is called "CODAP" and is **not** inside the Concord Consortium organization. Local development uses a "codap-dev" OAuth client. The production credentials are injected via GitHub Actions secrets during CI/CD builds.

This story is part of the CODAP-1070 "Release processes" epic, reflecting the need to plan Google Drive transition as part of the broader V3 release strategy.

## Requirements

- **R1**: Determine whether changing the CODAP URL in Google's OAuth configuration triggers a re-verification process, and if so, estimate the timeline and effort involved.
- **R2**: Determine whether changing the CODAP URL in Google's Drive API/app configuration triggers a re-verification process, and if so, estimate the timeline and effort involved.
- **R3**: Investigate the feasibility of a redirect-based approach: intercepting launches at the current (V2) URL and redirecting to the V3 URL while preserving all URL parameters (including hash parameters) that Google uses for authentication.
- **R4**: If the redirect approach is feasible, document the specific URL parameters and hash fragments that must be forwarded, and confirm they work correctly after redirect.
- **R5**: Document the recommended approach (direct URL change vs. redirect) with trade-offs, risks, and a proposed migration timeline.
- **R6**: Identify any differences between the Google configuration for development, staging, and production environments that affect this transition.

## Technical Notes

### Current Architecture

- Google Drive integration is fully abstracted through `@concord-consortium/cloud-file-manager` (CFM) version `^2.1.0-pre.16`.
- CODAP V3 does not contain any direct Google API calls (`gapi`), OAuth redirect handling, or Google Drive URL pattern matching.
- The CFM handles: OAuth flow, Google Drive file picker, file read/write, provider-specific logic.
- Configuration is in `v3/src/lib/cfm/use-cloud-file-manager.ts` (lines 356-368).

### Google Cloud Project

- Project name: "CODAP" (not inside Concord Consortium org)
- Three credentials used: App ID (project number), OAuth Client ID, API Key
- Local dev uses "codap-dev" OAuth client
- Production credentials injected via GitHub Actions secrets (`v3/.github/workflows/v3.yml`)

### URL Parameter Handling

- `v3/src/utilities/url-params.ts` defines all URL parameters CODAP supports.
- The `url` parameter (line 227) specifies a document URL to load on launch.
- `v3/src/lib/cfm/handle-cfm-event.ts` handles the `openedFile` event when CFM opens a document.

### V2 Reference

- V2 has hard-coded Google Drive credentials in `apps/dg/core.js` (lines 160-161).
- V2 conditionally enables Google Drive for SSL/localhost in `apps/dg/main.js` (lines 427-430).

### Production Infrastructure (from resolved questions)

- **Current V2 URL registered with Google**: `http://codap.concord.org/app/static/dg/en/cert/index.html#file=googleDrive:{ids}`
- **Target V3 URL**: `https://codap3.concord.org/`
- **CDN**: AWS CloudFront distribution in front of the origin server
- **Google Cloud Project**: Single production project only (no separate staging/test project)
- **Scope**: Only Google Drive save/load is affected (no Sheets import or other Google integrations)

### Redirect Approach Feasibility

Given the CloudFront infrastructure, the redirect approach is technically straightforward:
1. CloudFront Functions or Lambda@Edge can intercept requests to the V2 URL path
2. The redirect must preserve the hash fragment (`#file=googleDrive:{ids}`) — this requires a client-side redirect since hash fragments are not sent to the server
3. Alternatively, CloudFront could serve a small HTML page that performs the client-side redirect

## Out of Scope

- Changes to the Cloud File Manager library itself.
- Implementing the actual migration (this is a research/planning story only).
- Google Sheets import functionality (separate from Google Drive save/load).
- Changes to the development/local testing configuration.

## Resolved Questions

### RESOLVED: What are the current production URLs in the Google configuration?
**Context**: To plan the transition, we need to know the exact V2 URLs currently registered in both the OAuth and Drive configurations, and what the target V3 URLs will be.

**Decision**: `http://codap.concord.org/app/static/dg/en/cert/index.html#file=googleDrive:{ids}`

Note: This URL uses HTTP (not HTTPS). The `{ids}` portion is a placeholder that Google replaces with actual file identifiers when launching CODAP from Drive.

---

### RESOLVED: Is there a staging/test Google Cloud project, or only production?
**Context**: If there's a separate test project, the redirect approach could be validated there first without risk to production users. If not, testing strategies need to be planned differently.
**Options considered**:
- A) There is a separate test/staging project
- B) There is only the production project, but we can create a test project
- C) There is only the production project, and we should test carefully in production

**Decision**: C — There is only the production Google Cloud project. Testing must be done carefully in production. Consider using feature flags or staged rollouts to minimize risk.

---

### RESOLVED: What is the V2 deployment infrastructure that could host a redirect?
**Context**: The redirect approach requires the V2 URL to remain live and serve a redirect to V3. We need to understand what serves the current V2 URL and whether it can be configured for redirects.

**Decision**: AWS CloudFront distribution is in front of the server. This is favorable for the redirect approach — CloudFront supports URL rewrites and redirects via CloudFront Functions or Lambda@Edge without modifying the origin server.

---

### RESOLVED: What is the timeline pressure for the V3 release?
**Context**: If Google re-verification takes weeks, the redirect approach may be more appealing as a short-term solution. The urgency affects which approach to recommend.
**Options considered**:
- A) V3 release is imminent — need a fast solution
- B) V3 release is months away — time for proper URL migration
- C) Flexible — the best approach should dictate the timeline

**Decision**: A — V3 release is imminent. This strongly favors the redirect approach as a short-term solution, avoiding potential delays from Google re-verification while maintaining user access to Google Drive documents.

---

### RESOLVED: Are there other Google API integrations beyond Drive save/load that are affected?
**Context**: The ticket mentions OAuth and Drive configuration, but there may be other Google services (e.g., Google Sheets import, Google Analytics) that reference the CODAP URL and would also need updating.
**Options considered**:
- A) Only Drive save/load is affected
- B) Google Sheets import is also affected
- C) Other integrations exist that need investigation

**Decision**: A — Only Drive save/load is affected. This simplifies the scope of the transition.

---

### RESOLVED: What is the target V3 URL for Google Drive integration?
**Context**: We know the V2 URL (`http://codap.concord.org/app/static/dg/en/cert/index.html#file=googleDrive:{ids}`) but need to determine what the V3 URL should be. This affects both the redirect destination and any future direct URL registration with Google.
**Options considered**:
- A) `https://codap.concord.org/v3/` (simple path-based)
- B) `https://codap.concord.org/app/static/v3/index.html` (parallel structure to V2)
- C) A completely different domain/subdomain
- D) Other (please specify)

**Decision**: `https://codap3.concord.org/` — A separate subdomain for V3. This is a clean break from the V2 URL structure and provides flexibility for the V3 deployment.
