# Research: Gather Statistics on CODAP URLs in AP Activities

**Jira**: https://concord-consortium.atlassian.net/browse/CODAP-1091
**Repo**: https://github.com/concord-consortium/codap
**Implementation Spec**: [implementation.md](implementation.md)
**Status**: **In Development**

## Overview

Research chore to identify and catalog which CODAP URLs are used across Activity Player (AP) activities, enabling informed decisions about V2-to-V3 redirect strategies that avoid disrupting AP users.

## Project Owner Overview

As CODAP transitions from V2 (codap.concord.org) to V3 (codap3.concord.org), the team needs to understand which CODAP URLs are embedded in Activity Player activities. The assumption is that most or all AP activities use the same CODAP URL, but this hasn't been verified. Knowing the exact URLs involved is critical for planning any redirect strategy that migrates general users to V3 without forcing AP users — who may need V2 stability — to confront an unfamiliar interface. This research will provide the data foundation for those redirect decisions.

## Background

CODAP V2 and V3 are served from different domains (`codap.concord.org` for V2, `codap3.concord.org` for V3). The Activity Player (AP) embeds CODAP in iframes within educational activities, using URL parameters like `interactiveApi` to signal AP context and configure CODAP's behavior accordingly (e.g., hiding the CFM menu bar, enabling auto-save, constraining components to container boundaries via `inbounds`).

The parent epic CODAP-1070 ("Release processes") is focused on the processes around releasing and transitioning to V3. This research chore supports that by answering a prerequisite question: what CODAP URLs are actually in use across AP activities?

The AP typically loads activities from LARA (Learning Activity Repository API) endpoints (e.g., `https://lara.concord.org/api/v1/activities/...`) and embeds CODAP via iframe. The CODAP URL embedded in each activity determines which version users get. Understanding the distribution of these URLs across all activities will inform whether a simple redirect suffices or whether more nuanced handling is needed.

## Requirements

- Query the production database for all Activity Player activities (regardless of publication status)
- Extract and identify all distinct CODAP URLs embedded in those activities
- Quantify how many activities use each distinct URL
- Focus on V2 URLs (`codap.concord.org`) — these are the URLs relevant to redirect planning
- Document the URL patterns found (e.g., versioned vs. latest, with/without query parameters)
- Produce three output artifacts:
  - A markdown summary document in this spec folder
  - A CSV file with activity-level detail (columns: activity ID, activity name, CODAP URL, publication status, source)
  - A summary comment on the Jira ticket (CODAP-1091)
- "Zero CODAP URLs found" is a valid result — this would confirm that AP activities don't currently embed CODAP

## Technical Notes

**Data Access Approach:**
- Doug will execute SQL queries using DBeaver connected to the production database
- Claude will provide query templates and guidance based on the schema.rb file
- CSV export via DBeaver's built-in export (right-click results → Export Data)
- No direct database access is granted to Claude

**Activity Player Architecture:**
- AP activities are defined in LARA and served via the Activity Player at `activity-player.concord.org`
- CODAP is embedded as an "interactive" within activities; the URL is stored in the database
- All activities are in scope (no publication status filter) — AP is the only host for lightweight_activities

**CODAP URL Patterns:**
- **Scope**: Only V2 URLs (`codap.concord.org`) — V3 URLs (`codap3.concord.org`) are out of scope
- AP typically wraps CODAP in a full-screen interactive wrapper:
  ```
  https://models-resources.concord.org/question-interactives/full-screen/?wrappedInteractive=<URL-encoded CODAP URL>
  ```
- The actual CODAP URL is URL-encoded in the `wrappedInteractive` query parameter
- Example wrapped URL:
  ```
  https://models-resources.concord.org/question-interactives/full-screen/?wrappedInteractive=https%3A%2F%2Fcodap.concord.org%2Fapp%2Fstatic%2Fdg%2Fen%2Fcert%2Findex.html%3FinteractiveApi%26documentId%3D...
  ```
- CODAP URLs include query parameters like `interactiveApi`, `inbounds`, `embeddedMode`, `embeddedServer`, `documentId`

**Relevant Codebase Files:**
- `v3/src/utilities/url-params.ts` — URL parameter documentation
- `v3/src/lib/cfm/use-cloud-file-manager.ts` — CFM/LARA provider configuration
- `v3/src/data-interactive/handlers/interactive-api-handler.ts` — AP detection logic
- `v3/cypress/config/*.json` — Test URLs showing AP integration patterns

## Out of Scope

- Implementing any URL redirects (this is research only)
- Modifying AP activities or CODAP URLs
- Performance or usage analytics (only URL identification and counting)
- V3 URLs (`codap3.concord.org`) — only V2 URLs are in scope for this research

## Open Questions

### RESOLVED: What data source should be used to query AP activities?
**Context**: To gather URL statistics, we need a way to enumerate AP activities and extract their embedded CODAP URLs. This could be done via the LARA API, direct database access, scraping the AP, or another method.
**Options considered**:
- A) Query the LARA API to list public activities and extract interactive URLs from activity definitions
- B) Query a database directly (if access is available)
- C) Use an existing admin tool or report
- D) Manual inspection of known activities

**Decision**: B — Direct database queries. Doug has schema knowledge and can provide schema.rb for analysis. Doug will execute all queries himself (no direct DB access for Claude).

### RESOLVED: What constitutes an "AP activity"?
**Context**: The scope of activities to analyze needs to be defined.
**Options considered**:
- A) All activities with public/published status in LARA
- B) Only activities actively assigned in current classrooms
- C) All activities regardless of status (including archived)

**Decision**: C — All lightweight_activities regardless of publication status. AP is the only host for these activities, so no additional filtering is needed.

### RESOLVED: Should the research include LARA-hosted activities or only Activity Player activities?
**Context**: CODAP can be embedded in both the older LARA runtime and the newer Activity Player. The ticket mentions "AP activities" specifically, but LARA activities may also be relevant for redirect planning.
**Options considered**:
- A) Only Activity Player activities
- B) Both AP and LARA-hosted activities
- C) All platforms that embed CODAP (AP, LARA, standalone)

**Decision**: A — Only Activity Player activities. There are no more LARA-hosted activities (legacy code remains but is not in use).

### RESOLVED: What is the expected output format?
**Context**: The research results need to be consumable by the team for redirect planning. The format could range from a simple list to a detailed report.
**Options considered**:
- A) A markdown document in this spec folder with URL list and counts
- B) A spreadsheet/CSV with activity-level detail
- C) A summary added to the Jira ticket
- D) All of the above

**Decision**: D — All of the above. Provide a markdown summary, a CSV with activity-level detail, and add a summary to the Jira ticket.

### RESOLVED: Is there existing tooling or access for querying LARA/AP activity data?
**Context**: The feasibility and approach depend on what APIs or database access are available. If there's an admin portal or existing report, that would be the fastest path.
**Options considered**:
- A) I have API access and can provide credentials/instructions
- B) There's an admin portal I can point you to
- C) We'll need to figure this out together
- D) Someone else on the team has this access

**Decision**: Doug will execute SQL queries or Rails console commands against the production database. Claude will provide query guidance based on the schema.

## Self-Review

### Product Manager

#### RESOLVED: Clarify what "redirect strategy decisions" means
The Overview and Project Owner Overview reference informing "redirect strategy decisions," but the spec doesn't define what decisions are actually being made.

**Decision**: Not needed — the research scope is simply to gather statistics. Downstream strategy decisions are out of scope for this chore.

#### RESOLVED: Define success criteria for the research
The requirements list outputs (markdown, CSV, Jira comment) but don't specify what findings would be considered "complete."

**Decision**: Added to Requirements — CSV columns defined (activity ID, name, URL, publication status) and clarified that zero CODAP URLs is a valid finding.

---

### Senior Engineer

#### RESOLVED: Schema dependency not yet provided
The spec states Claude will provide query guidance based on schema.rb, but the schema hasn't been shared yet.

**Decision**: Implementation detail — schema will be provided during implementation phase when queries are designed.

#### RESOLVED: URL extraction complexity
CODAP URLs may be stored in different ways (direct field, JSON, config blob).

**Decision**: Implementation detail — will be addressed when schema is reviewed during implementation phase.

#### RESOLVED: How to identify "CODAP" URLs specifically
The database likely contains URLs for many interactive types, not just CODAP.

**Decision**: Filter by domain `codap.concord.org` (V2 only). Note that AP typically wraps CODAP URLs in a `models-resources.concord.org/question-interactives/full-screen/` wrapper with the actual CODAP URL in the `wrappedInteractive` query parameter (URL-encoded). Queries will need to handle this wrapper pattern.
