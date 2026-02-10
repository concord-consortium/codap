# Implementation Plan: CloudFront Log Analysis

**Jira**: https://concord-consortium.atlassian.net/browse/CODAP-1090
**Requirements Spec**: [requirements.md](requirements.md)
**Status**: **Queries updated — re-run needed for per-release results**

## Implementation Plan

### Estimate data size and cost

**Summary**: Check the total size of log data to estimate Athena query costs ($5 per TB scanned).

**Command**:
```bash
aws s3 ls s3://cc-aws-service-artifacts/cloudfront/logs/E3H9X49AG3GYSO/ --recursive --summarize | tail -2
```

**Note**: If data is under 1 TB, expect costs under $5 per query. Athena has a 10 MB minimum charge per query.

---

### Create Athena database and table

**Summary**: Set up an Athena table that reads CloudFront logs directly from S3. No data download required.

**Steps**:

1. Open the AWS Athena console (ensure query results location is configured in workgroup settings)
2. Create a database (if not exists) and table for CloudFront logs

**Note**: Athena auto-detects gzip compression based on `.gz` file extension. No special SerDe configuration needed.

**SQL** (run in Athena query editor):

```sql
-- Create database if needed
CREATE DATABASE IF NOT EXISTS cloudfront_logs;

-- Create table for CloudFront logs
CREATE EXTERNAL TABLE IF NOT EXISTS cloudfront_logs.codap_concord_org (
  `date` DATE,
  `time` STRING,
  x_edge_location STRING,
  sc_bytes BIGINT,
  c_ip STRING,
  cs_method STRING,
  cs_host STRING,
  cs_uri_stem STRING,
  sc_status INT,
  cs_referer STRING,
  cs_user_agent STRING,
  cs_uri_query STRING,
  cs_cookie STRING,
  x_edge_result_type STRING,
  x_edge_request_id STRING,
  x_host_header STRING,
  cs_protocol STRING,
  cs_bytes BIGINT,
  time_taken FLOAT,
  x_forwarded_for STRING,
  ssl_protocol STRING,
  ssl_cipher STRING,
  x_edge_response_result_type STRING,
  cs_protocol_version STRING,
  fle_status STRING,
  fle_encrypted_fields STRING,
  c_port INT,
  time_to_first_byte FLOAT,
  x_edge_detailed_result_type STRING,
  sc_content_type STRING,
  sc_content_len BIGINT,
  sc_range_start BIGINT,
  sc_range_end BIGINT
)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY '\t'
LOCATION 's3://cc-aws-service-artifacts/cloudfront/logs/E3H9X49AG3GYSO/'
TBLPROPERTIES (
  'skip.header.line.count'='2'
);
```

---

### Run validation and sanity queries

**Summary**: Verify the table is working correctly and understand the data before running full analysis.

**Validation — Check table parsing and date range**:
```sql
SELECT date, time, cs_uri_stem, x_host_header, sc_status
FROM cloudfront_logs.codap_concord_org
LIMIT 10;
```

**Sanity — Verify host headers** (ensure we're only analyzing codap.concord.org):
```sql
SELECT x_host_header, COUNT(*) AS request_count
FROM cloudfront_logs.codap_concord_org
WHERE date >= DATE '2025-02-01' AND date < DATE '2026-02-01'
GROUP BY x_host_header
ORDER BY request_count DESC;
```

**Sanity — Method breakdown** (understand GET vs OPTIONS vs other):
```sql
SELECT cs_method, COUNT(*) AS request_count
FROM cloudfront_logs.codap_concord_org
WHERE date >= DATE '2025-02-01' AND date < DATE '2026-02-01'
GROUP BY cs_method
ORDER BY request_count DESC;
```

If multiple hosts appear or unexpected methods dominate, add filters to the main queries.

---

### Run analysis queries

**Summary**: Query the Athena table to get URL path statistics for the last 12 months.

**Note**: These queries scan the full table. Date filtering does not reduce scan cost without partitioning. For a one-time research task, this is acceptable.

**Important**: We only count **launch point URLs** — requests that start CODAP, not asset requests (JS/CSS/images). Launch points are:
- Paths ending in `/index.html` or `/` (directory root)
- Bare paths like `/app`, `/releases/latest` that redirect to index (no file extension)

**Query 1 — Top launch URLs by request count**:

```sql
SELECT
  cs_uri_stem AS url_path,
  COUNT(*) AS request_count
FROM cloudfront_logs.codap_concord_org
WHERE date >= DATE '2025-02-01'
  AND date < DATE '2026-02-01'
  AND (
    cs_uri_stem LIKE '%/index.html'
    OR cs_uri_stem LIKE '%/'
    OR cs_uri_stem NOT LIKE '%.%'  -- paths without file extensions (bare paths)
  )
GROUP BY cs_uri_stem
ORDER BY request_count DESC
LIMIT 100;
```

**Query 2 — Aggregated counts by URL category (launch points only)**:

```sql
SELECT
  CASE
    WHEN cs_uri_stem LIKE '/app%' THEN '/app'
    WHEN cs_uri_stem = '/releases' OR cs_uri_stem = '/releases/' THEN '/releases'
    WHEN cs_uri_stem LIKE '/releases/%' THEN '/releases/' || SPLIT_PART(SUBSTR(cs_uri_stem, 11), '/', 1)
    ELSE 'other'
  END AS url_category,
  COUNT(*) AS request_count
FROM cloudfront_logs.codap_concord_org
WHERE date >= DATE '2025-02-01'
  AND date < DATE '2026-02-01'
  AND (
    cs_uri_stem LIKE '%/index.html'
    OR REGEXP_LIKE(cs_uri_stem, '/static/dg/[^/]+/cert/$')
    OR cs_uri_stem = '/app'
    OR REGEXP_LIKE(cs_uri_stem, '^/releases(/[^/]+)?$')
  )
GROUP BY
  CASE
    WHEN cs_uri_stem LIKE '/app%' THEN '/app'
    WHEN cs_uri_stem = '/releases' OR cs_uri_stem = '/releases/' THEN '/releases'
    WHEN cs_uri_stem LIKE '/releases/%' THEN '/releases/' || SPLIT_PART(SUBSTR(cs_uri_stem, 11), '/', 1)
    ELSE 'other'
  END
ORDER BY request_count DESC;
```

**Query 3 — Monthly breakdown (optional)**:

```sql
SELECT
  DATE_TRUNC('month', date) AS month,
  CASE
    WHEN cs_uri_stem LIKE '/app%' THEN '/app'
    WHEN cs_uri_stem = '/releases' OR cs_uri_stem = '/releases/' THEN '/releases'
    WHEN cs_uri_stem LIKE '/releases/%' THEN '/releases/' || SPLIT_PART(SUBSTR(cs_uri_stem, 11), '/', 1)
    ELSE 'other'
  END AS url_category,
  COUNT(*) AS request_count
FROM cloudfront_logs.codap_concord_org
WHERE date >= DATE '2025-02-01'
  AND date < DATE '2026-02-01'
  AND (
    cs_uri_stem LIKE '%/index.html'
    OR REGEXP_LIKE(cs_uri_stem, '/static/dg/[^/]+/cert/$')
    OR cs_uri_stem = '/app'
    OR REGEXP_LIKE(cs_uri_stem, '^/releases(/[^/]+)?$')
  )
GROUP BY DATE_TRUNC('month', date),
  CASE
    WHEN cs_uri_stem LIKE '/app%' THEN '/app'
    WHEN cs_uri_stem = '/releases' OR cs_uri_stem = '/releases/' THEN '/releases'
    WHEN cs_uri_stem LIKE '/releases/%' THEN '/releases/' || SPLIT_PART(SUBSTR(cs_uri_stem, 11), '/', 1)
    ELSE 'other'
  END
ORDER BY month, request_count DESC;
```

---

### Export and document results

**Summary**: Save query results and add findings to Jira.

**Privacy note**: Do not export or include IP addresses (`c_ip`, `x_forwarded_for`) in Jira comments or attachments. The analysis queries above only aggregate counts, not raw log data.

**Steps**:

1. In Athena console, download query results as CSV (aggregated counts only)
2. Summarize findings in a comment on CODAP-1090:

```bash
acli jira workitem comment add --key CODAP-1090 --body "$(cat <<'EOF'
## CloudFront Log Analysis Results

**Period**: Feb 2025 – Jan 2026
**Distribution**: E3H9X49AG3GYSO (codap.concord.org)

### URL Category Totals

| Category | Request Count |
|----------|---------------|
| /app | X |
| /releases/latest | X |
| /releases/stable | X |
| /releases/build_NNNN | X |
| ... (each release individually) | X |
| other | X |

### Top Individual Paths

[Paste top 20 from Query 1]

### Method

Analysis performed using AWS Athena querying CloudFront logs in S3.
Table definition and queries documented in specs/CODAP-1090-research-cloudfront-logs/implementation.md
EOF
)"
```

---

### Clean up (optional)

**Summary**: Remove Athena table after analysis if not needed for future queries.

```sql
DROP TABLE IF EXISTS cloudfront_logs.codap_concord_org;
```

---

## Results

**Analysis Date**: 2026-02-04
**Period Analyzed**: Feb 2025 – Jan 2026
**Distribution**: E3H9X49AG3GYSO (codap.concord.org)
**Interactive Data**: [View in CODAP3](https://codap3.concord.org/#shared=https%3A%2F%2Fcfm-shared.concord.org%2FNlLpguqSRh1GOcTkNryt%2Ffile.json)

### Data Size

- **Total Objects**: 125,213 files
- **Total Size**: ~9.5 GB
- **Estimated Athena Cost**: ~$0.05 per full table scan

### Host Header Verification

All 115,996,503 requests in the analysis period were for `codap.concord.org` — no filtering required.

### URL Category Totals (Launch Points Only)

> **TODO**: Re-run Query 2 with updated per-release categorization. Previous results grouped all non-latest/stable releases into "/releases (other)" (685,181 requests). Updated query will break this out by individual release.

| Category | Request Count |
|----------|---------------|
| /app | 3,334,382 |
| /releases/latest | _re-run needed_ |
| /releases/stable | _re-run needed_ |
| /releases/build_NNNN | _re-run needed_ |
| ... (each release) | _re-run needed_ |
| other (legacy WordPress) | 5,417,338 |

**Key finding** (from prior run): `/app` is the dominant launch path — 5x more traffic than `/releases/latest`, and 20x more than `/releases/stable`.

### Top 20 Individual Launch Paths

| # | URL Path | Request Count |
|---|----------|---------------|
| 1 | / | 2,262,557 |
| 2 | /app/static/dg/en/cert/index.html | 1,606,723 |
| 3 | /app/ | 579,370 |
| 4 | /app/static/dg/ko/cert/index.html | 505,698 |
| 5 | /releases/latest/static/dg/en/cert/index.html | 439,441 |
| 6 | /app/extn/plugins/Importer/ | 347,822 |
| 7 | /get-started/ | 129,267 |
| 8 | /help/work-graphs/create-box-plots-codap | 64,464 |
| 9 | /forums/forum/test/ | 62,934 |
| 10 | /forums/users/pointzu456jiegmail-com/ | 54,461 |
| 11 | /educators/ | 51,076 |
| 12 | /work-graphs/create-box-plots-codap | 48,081 |
| 13 | /app/extn/plugins/onboarding/ | 42,613 |
| 14 | /app/static/dg/es/cert/index.html | 38,446 |
| 15 | /forums | 37,214 |
| 16 | /forums/users/vandalvape/ | 35,545 |
| 17 | /get-started/tutorials/ | 31,558 |
| 18 | /app/static/dg/de/cert/index.html | 29,936 |
| 19 | /releases/latest/ | 29,708 |
| 20 | /wp-admin/ | 28,183 |

**Note**: Paths like `/`, `/get-started/`, `/forums/`, `/wp-admin/` are legacy WordPress marketing site traffic (WordPress was hosted on this domain before being moved off in 2025).

### Monthly Breakdown

> **TODO**: Re-run Query 3 with updated per-release categorization. The monthly breakdown will have a row per release per month instead of the aggregated "/releases (other)" column.

### Key Observations

> **TODO**: Update observations after re-running queries with per-release categorization.

1. **`/app` is the dominant launch path** — consistently the most-used CODAP entry point every month
2. **School year pattern** — `/app` traffic peaks during school year (Sep-Oct: ~400-500K), drops in summer (Jul-Aug: ~150-170K)
3. **`/releases/stable` collapsed in June 2025** — dropped from 28,234 in May to just 265 in June, remained near-zero since (Nov: 49, Dec: 319). Likely a redirect was added or the path became unavailable.
4. **`/releases/latest` remains steady** — consistent secondary usage at 35K-86K/month throughout the year
5. **Legacy WordPress traffic** — the "other" category contains traffic to paths like `/`, `/get-started/`, `/forums/` from when WordPress was hosted on this domain
6. **Per-release breakdown** — _pending re-run: will show traffic to individual build directories, `dsg`, `zisci`, etc._

---

## Open Questions

<!-- Implementation-focused questions only. Requirements questions go in requirements.md. -->

### RESOLVED: Should we filter by HTTP status code?

**Context**: The logs include requests that returned errors (4xx, 5xx). Should we count only successful requests (2xx/3xx) or all requests?
**Options considered**:
- A) Count all requests regardless of status
- B) Count only successful requests (status 200-399)
- C) Provide both counts for comparison

**Decision**: A — Count all requests regardless of status.

### RESOLVED: How to handle query parameters?

**Context**: URLs may include query parameters (e.g., `/releases/latest/index.html?lang=en`). The current approach strips query params by using `cs-uri-stem`. Should we include them?
**Options considered**:
- A) Ignore query parameters (current approach) — counts `/path?a=1` and `/path?b=2` together as `/path`
- B) Include query parameters — counts them separately
- C) Report both: totals without params, plus breakdown of common params

**Decision**: A — Ignore query parameters. The `cs-uri-stem` field already excludes them.

## Self-Review

### Senior Engineer

#### RESOLVED: Gzipped log files may require different table configuration
The CloudFront logs are gzipped (.gz files), but the current table definition doesn't specify a SerDe that handles compression. Athena can read gzipped files automatically with some SerDes, but this should be verified.

**Resolution**: Athena auto-detects gzip compression based on `.gz` file extension. Added note to implementation. The AWS-documented table format matches our definition.

---

#### RESOLVED: Consider using AWS's pre-built CloudFront log table format
AWS provides a standard Athena table definition for CloudFront logs that handles compression and field parsing correctly. Using the documented format reduces risk of parsing errors.

**Resolution**: Verified our table definition matches AWS documentation. Reference added.

---

### DevOps Engineer

#### RESOLVED: Athena query costs should be estimated
Athena charges $5 per TB scanned. With ~125k log files, the total data size could be significant. Before running queries, estimate the S3 data size to understand potential costs.

**Resolution**: Added "Estimate data size and cost" step with `aws s3 ls --summarize` command.

---

#### RESOLVED: Athena query results location not specified
Athena stores query results in S3. The default location should be confirmed, or a specific output location should be set to avoid cluttering an unintended bucket.

**Resolution**: Added note to configure query results location in workgroup settings before running queries.

---

### External Review (GitHub Copilot)

#### RESOLVED: `/releases` exact path not matched by LIKE clause
The `LIKE '/releases/%'` pattern excludes the bare `/releases` path (no trailing slash), causing it to fall into "other".

**Resolution**: Fixed Query 2 and 3 to use `cs_uri_stem = '/releases' OR cs_uri_stem LIKE '/releases/%'`.

---

#### RESOLVED: Missing validation and sanity queries
Need to verify table parsing works correctly and check for unexpected host headers or methods before running full analysis.

**Resolution**: Added "Run validation and sanity queries" step with host header check, method breakdown, and sample data validation.

---

#### RESOLVED: Privacy concern about IP addresses in exports
CloudFront logs contain `c_ip` and `x_forwarded_for` which should not be exported to Jira.

**Resolution**: Added privacy note to "Export and document results" section. Analysis queries only output aggregated counts.

---

#### ACKNOWLEDGED: Full table scan cost without partitioning
Date filtering doesn't reduce scan cost without a partitioned table. For this one-time research task, full scan is acceptable given estimated data size.

**Resolution**: Added note to analysis queries section acknowledging this trade-off.

---

#### RESOLVED: Bare paths missing from launch filter (re-review)
URLs like `/app` or `/releases/latest` (without trailing slash) that redirect to index.html were excluded by the original filter.

**Resolution**: Added `OR cs_uri_stem NOT LIKE '%.%'` to include paths without file extensions (bare paths that redirect).

---

#### RESOLVED: Title/Overview wording (re-review)
Title and overview referenced `codap-server.concord.org` but analysis is for `codap.concord.org`.

**Resolution**: Updated requirements.md title and overview to reference `codap.concord.org`.

---

#### ACKNOWLEDGED: Numeric column parse errors (re-review)
CloudFront logs use `-` for missing values. Numeric columns (BIGINT, INT, FLOAT) could fail to parse if they contain `-`. If `HIVE_BAD_DATA` errors occur, change affected columns to STRING.

**Resolution**: Noted as potential issue. Validation query will surface problems early.
