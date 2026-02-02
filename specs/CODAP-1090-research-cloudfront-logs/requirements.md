# Research: CloudFront Logs for codap.concord.org

**Jira**: https://concord-consortium.atlassian.net/browse/CODAP-1090
**Repo**: https://github.com/concord-consortium/codap
**Implementation Spec**: [implementation.md](implementation.md)
**Status**: **Complete**

## Overview

Research and analyze AWS CloudFront access logs for `codap.concord.org` to understand how users access CODAP via different URL paths, informing decisions about the release process and URL consolidation.

## Project Owner Overview

CODAP is currently served via multiple URL paths on `codap.concord.org`, including `/app`, `/releases`, `/releases/latest`, `/releases/stable`, and potentially others. The team needs visibility into which of these URL patterns are actually used — and how heavily — to make informed decisions about the release infrastructure. This is part of the broader "Release processes" epic (CODAP-1070).

Understanding real-world traffic patterns will help the team determine which URL paths to maintain, deprecate, or redirect as they evolve the deployment pipeline. Without this data, decisions about URL consolidation or deprecation risk breaking active user workflows.

## Background

At a meeting on 2026-01-28, the team identified that AWS CloudFront access logs should contain information about how often various URL combinations are used to launch CODAP. The hypothesis needs validation: do the logs exist, are they accessible, and do they contain the needed data?

**Infrastructure architecture (clarified through research):**

- `codap.concord.org` — CloudFront distribution (`E3H9X49AG3GYSO`) that serves users
- `codap-server.concord.org` — EC2 origin server behind CloudFront
- CloudFront logs for `codap.concord.org` capture all traffic to CODAP v2, which is what we need to analyze
- **v3 (active)**: Deployed separately to `codap3.concord.org`

**Key URLs to investigate** (via `codap.concord.org`):
- `/app`
- `/releases`
- `/releases/latest`
- `/releases/stable`
- Any other URL paths with significant traffic

## Requirements

- ✅ Validate that CloudFront access logs exist and are accessible — confirmed in `cc-aws-service-artifacts` bucket for distribution `E3H9X49AG3GYSO` (`codap.concord.org`)
- Analyze logs from the last 12 months (Feb 2025 – Jan 2026)
- **Focus on launch point URLs only** — requests that start/launch CODAP (not asset requests like JS/CSS/images)
  - Launch points are: paths ending in `/index.html` or `/` (directory root), plus bare paths like `/app`, `/releases/latest` that redirect to index
- Gather traffic statistics (simple totals) for at least the following URL categories:
  - `/app`
  - `/releases`
  - `/releases/latest`
  - `/releases/stable`
- Identify any other high-traffic launch URL paths not listed above
- Produce a summary report of traffic volume per launch URL pattern
- Document the method used to access and analyze the logs so it can be repeated

## Technical Notes

- **S3 bucket**: `cc-aws-service-artifacts` under prefix `cloudfront/logs/E3H9X49AG3GYSO/`
- **CloudFront distribution**: `E3H9X49AG3GYSO` serves `codap.concord.org` (with `codap-server.concord.org` as the EC2 origin)
- **Log format**: Gzipped, tab-delimited, 33 fields per line
- **Key fields**:
  - `cs-uri-stem` (field 8) — URL path
  - `x-host-header` (field 16) — requested domain
  - `sc-status` (field 9) — HTTP status code
- **Log volume**: ~125,000 files total
- **Analysis approach**: AWS Athena queries directly against S3 (no file downloads)
- **Analysis scope**: Last 12 months of data, simple totals per URL path
- Team members have AWS credentials with S3 read access and Athena permissions

**Server directory structure** (from `/var/www/html/releases/`):
- `latest` → symlink to current build (`build_0742`)
- `stable` → symlink to `latest` (same content as latest)
- `dsg`, `zisci` → also symlink to `latest`
- 86 versioned build directories (`build_0252` through `build_0742`)

**CloudFront cache behaviors**:
- `/app` and `/app/*` → routed to `codap-server.concord.org` origin
- Default origin → `codap.wpengine.com` (WordPress marketing site)
- **No `/app` directory exists on EC2** — `/app` traffic is handled by CloudFront cache behavior routing, not a physical directory

## Out of Scope

- Analyzing CloudFront logs for `codap3.concord.org` (v3) — this research focuses on `codap.concord.org` (v2)
- Making changes to the deployment infrastructure or URL routing
- Modifying CloudFront configuration
- Any changes to the CODAP application code

## Open Questions

### RESOLVED: Where are the CloudFront logs stored?
**Context**: CloudFront access logs are configured per distribution and stored in an S3 bucket. We need to know which bucket and prefix to look at.
**Options considered**:
- A) Logs are in the same `models-resources` bucket under a logs prefix
- B) Logs are in a separate dedicated logging bucket
- C) Logging may not be enabled for this distribution

**Decision**: The bucket is `cc-aws-service-artifacts`.

### RESOLVED: What time range of data is needed?
**Context**: CloudFront logs can accumulate over long periods. The analysis scope affects both the effort required and the usefulness of trends.
**Options considered**:
- A) Last 30 days — enough for a current snapshot
- B) Last 90 days — captures seasonal patterns
- C) Last 12 months — full year for comprehensive trend analysis
- D) All available data

**Decision**: C — Last 12 months for comprehensive trend analysis.

### RESOLVED: What level of detail is needed in the report?
**Context**: The report could range from simple totals to detailed breakdowns by date, referrer, user agent, query parameters, etc.
**Options considered**:
- A) Simple totals per URL path
- B) Daily/weekly breakdown per URL path
- C) Detailed breakdown including referrers, query parameters, and geographic distribution

**Decision**: A — Simple totals per URL path (not detailed breakdowns).

### RESOLVED: Should v3 (codap3.concord.org) also be included?
**Context**: The ticket specifically mentions `codap-server.concord.org`, but comparing with v3 traffic could provide useful context about migration progress.
**Options considered**:
- A) Only `codap-server.concord.org` as stated
- B) Include `codap3.concord.org` for comparison

**Decision**: A — Only `codap-server.concord.org` as stated in the ticket.

### RESOLVED: Who has AWS access to the CloudFront logs?
**Context**: Accessing the logs requires AWS credentials with S3 read permissions for the logging bucket. Need to confirm who can provide access or already has it.
**Options considered**:
- A) Current team members already have access
- B) Need to request access from DevOps/infrastructure team
- C) Access via a shared role or assumed credentials

**Decision**: A — Current team members already have access.
