# Implementation Plan: Gather Statistics on CODAP URLs in AP Activities

**Jira**: https://concord-consortium.atlassian.net/browse/CODAP-1091
**Requirements Spec**: [requirements.md](requirements.md)
**Status**: **In Development**

## Implementation Plan

### Identify all interactives with CODAP URLs in activities

**Summary**: Query the database to find all `mw_interactives` records that contain `codap.concord.org` in their URL field.

**Tables involved**:
- `lightweight_activities` — all activities (no publication_status filter; AP is the only host)
- `interactive_pages` — links to activities via `lightweight_activity_id`
- `interactive_items` — links pages to interactives (polymorphic: `interactive_id`, `interactive_type`)
- `mw_interactives` — contains the `url` field where CODAP URLs are stored

**SQL Query**:

```sql
SELECT
  la.id AS activity_id,
  la.name AS activity_name,
  la.publication_status,
  mw.id AS interactive_id,
  mw.url AS interactive_url
FROM lightweight_activities la
JOIN interactive_pages ip ON ip.lightweight_activity_id = la.id
JOIN interactive_items ii ON ii.interactive_page_id = ip.id
JOIN mw_interactives mw ON mw.id = ii.interactive_id AND ii.interactive_type = 'MwInteractive'
WHERE mw.url LIKE '%codap.concord.org%'
ORDER BY la.id, mw.id;
```

**Rails Console Alternative**:

```ruby
# Note: Join syntax may need adjustment based on actual model associations.
# The polymorphic interactive_items table may require raw SQL joins.
LightweightActivity
  .joins(interactive_pages: { interactive_items: :mw_interactive })
  .where("mw_interactives.url LIKE ?", '%codap.concord.org%')
  .select("lightweight_activities.id AS activity_id,
           lightweight_activities.name AS activity_name,
           lightweight_activities.publication_status,
           mw_interactives.id AS interactive_id,
           mw_interactives.url AS interactive_url")
  .each { |r| puts "#{r.activity_id},#{r.activity_name},#{r.interactive_url}" }
```

**Expected output**: List of activities with their CODAP-containing URLs (may include wrapper URLs)

---

### Query managed_interactives for CODAP URLs

**Summary**: Query `managed_interactives` joined with `library_interactives` to find CODAP URLs. Managed interactives are shells that inherit default values (including URL) from library_interactives.

**Tables involved**:
- `managed_interactives` — shell records that reference a library interactive
- `library_interactives` — contains `base_url` (the primary URL source)
- `managed_interactives.url_fragment` — optional fragment appended to base_url

**SQL Query**:

```sql
SELECT
  la.id AS activity_id,
  la.name AS activity_name,
  la.publication_status,
  mi.id AS managed_interactive_id,
  li.base_url,
  mi.url_fragment,
  CONCAT(li.base_url, COALESCE(mi.url_fragment, '')) AS full_url
FROM lightweight_activities la
JOIN interactive_pages ip ON ip.lightweight_activity_id = la.id
JOIN interactive_items ii ON ii.interactive_page_id = ip.id
JOIN managed_interactives mi ON mi.id = ii.interactive_id AND ii.interactive_type = 'ManagedInteractive'
JOIN library_interactives li ON li.id = mi.library_interactive_id
WHERE li.base_url LIKE '%codap.concord.org%' OR mi.url_fragment LIKE '%codap.concord.org%'
ORDER BY la.id;
```

**Note**: This is an equally important query path as `mw_interactives`. Both tables can contain CODAP URLs.

---

### Normalize URLs for pattern analysis

**Summary**: Extract the base CODAP path (domain + path, stripping query params like `documentId`) to identify meaningful URL patterns rather than per-activity unique URLs.

**Ruby code to normalize URLs**:
```ruby
require 'uri'
require 'cgi'

def normalize_codap_url(url)
  # First, extract from wrapper if present
  if url.include?('wrappedInteractive=')
    uri = URI.parse(url)
    params = CGI.parse(uri.query || '')
    wrapped = params['wrappedInteractive']&.first
    url = CGI.unescape(wrapped) if wrapped
  end

  # Parse and return just scheme + host + path (no query params)
  uri = URI.parse(url)
  "#{uri.scheme}://#{uri.host}#{uri.path}"
rescue URI::InvalidURIError
  url
end

# Example:
# normalize_codap_url("https://models-resources.concord.org/question-interactives/full-screen/?wrappedInteractive=https%3A%2F%2Fcodap.concord.org%2Fapp%2Fstatic%2Fdg%2Fen%2Fcert%2Findex.html%3FdocumentId%3D...")
# => "https://codap.concord.org/app/static/dg/en/cert/index.html"
```

**Expected output**: Normalized base paths like:
- `https://codap.concord.org/app/static/dg/en/cert/index.html`
- `https://codap.concord.org/releases/latest/static/dg/en/cert/index.html`

---

### Count distinct CODAP URL patterns

**Summary**: Aggregate the URLs found from both `mw_interactives` and `managed_interactives` to identify distinct patterns and counts.

**Note**: The SQL below counts raw URLs. For normalized pattern analysis (stripping query params), apply the `normalize_codap_url` Ruby function to the exported data and re-aggregate in Ruby/spreadsheet.

**SQL Query** (combined results from both interactive types):

```sql
-- From mw_interactives
SELECT
  mw.url AS codap_url,
  'mw_interactive' AS source,
  COUNT(DISTINCT la.id) AS activity_count
FROM lightweight_activities la
JOIN interactive_pages ip ON ip.lightweight_activity_id = la.id
JOIN interactive_items ii ON ii.interactive_page_id = ip.id
JOIN mw_interactives mw ON mw.id = ii.interactive_id AND ii.interactive_type = 'MwInteractive'
WHERE mw.url LIKE '%codap.concord.org%'
GROUP BY mw.url

UNION ALL

-- From managed_interactives (via library_interactives)
SELECT
  CONCAT(li.base_url, COALESCE(mi.url_fragment, '')) AS codap_url,
  'managed_interactive' AS source,
  COUNT(DISTINCT la.id) AS activity_count
FROM lightweight_activities la
JOIN interactive_pages ip ON ip.lightweight_activity_id = la.id
JOIN interactive_items ii ON ii.interactive_page_id = ip.id
JOIN managed_interactives mi ON mi.id = ii.interactive_id AND ii.interactive_type = 'ManagedInteractive'
JOIN library_interactives li ON li.id = mi.library_interactive_id
WHERE li.base_url LIKE '%codap.concord.org%' OR mi.url_fragment LIKE '%codap.concord.org%'
GROUP BY CONCAT(li.base_url, COALESCE(mi.url_fragment, ''))

ORDER BY activity_count DESC;
```

**SQL Query for base URL counts** (strips query params, no unwrapping):

```sql
SELECT SUBSTRING_INDEX(mw.url, '?', 1) AS base_url, COUNT(DISTINCT la.id) AS activity_count
FROM lightweight_activities la
JOIN interactive_pages ip ON ip.lightweight_activity_id = la.id
JOIN interactive_items ii ON ii.interactive_page_id = ip.id
JOIN mw_interactives mw ON mw.id = ii.interactive_id AND ii.interactive_type = 'MwInteractive'
WHERE mw.url LIKE '%codap.concord.org%'
GROUP BY 1
UNION ALL
SELECT SUBSTRING_INDEX(CONCAT(li.base_url, COALESCE(mi.url_fragment, '')), '?', 1) AS base_url, COUNT(DISTINCT la.id) AS activity_count
FROM lightweight_activities la
JOIN interactive_pages ip ON ip.lightweight_activity_id = la.id
JOIN interactive_items ii ON ii.interactive_page_id = ip.id
JOIN managed_interactives mi ON mi.id = ii.interactive_id AND ii.interactive_type = 'ManagedInteractive'
JOIN library_interactives li ON li.id = mi.library_interactive_id
WHERE li.base_url LIKE '%codap.concord.org%' OR mi.url_fragment LIKE '%codap.concord.org%'
GROUP BY 1
ORDER BY 2 DESC;
```

**SQL Query for normalized URL path counts** (strips query params, unwraps `wrappedInteractive`):

```sql
SELECT normalized_url, SUM(activity_count) AS total_activities
FROM (
  SELECT
    SUBSTRING_INDEX(
      IF(mw.url LIKE '%wrappedInteractive=%',
        REPLACE(REPLACE(REPLACE(
          SUBSTRING_INDEX(SUBSTRING_INDEX(mw.url, 'wrappedInteractive=', -1), '%3F', 1),
          '%2F', '/'), '%3A', ':'), '%23', '#'),
        SUBSTRING_INDEX(mw.url, '?', 1)
      ), '?', 1) AS normalized_url,
    COUNT(DISTINCT la.id) AS activity_count
  FROM lightweight_activities la
  JOIN interactive_pages ip ON ip.lightweight_activity_id = la.id
  JOIN interactive_items ii ON ii.interactive_page_id = ip.id
  JOIN mw_interactives mw ON mw.id = ii.interactive_id AND ii.interactive_type = 'MwInteractive'
  WHERE mw.url LIKE '%codap.concord.org%'
  GROUP BY 1
  UNION ALL
  SELECT
    SUBSTRING_INDEX(
      IF(CONCAT(li.base_url, COALESCE(mi.url_fragment, '')) LIKE '%wrappedInteractive=%',
        REPLACE(REPLACE(REPLACE(
          SUBSTRING_INDEX(SUBSTRING_INDEX(CONCAT(li.base_url, COALESCE(mi.url_fragment, '')), 'wrappedInteractive=', -1), '%3F', 1),
          '%2F', '/'), '%3A', ':'), '%23', '#'),
        SUBSTRING_INDEX(CONCAT(li.base_url, COALESCE(mi.url_fragment, '')), '?', 1)
      ), '?', 1) AS normalized_url,
    COUNT(DISTINCT la.id) AS activity_count
  FROM lightweight_activities la
  JOIN interactive_pages ip ON ip.lightweight_activity_id = la.id
  JOIN interactive_items ii ON ii.interactive_page_id = ip.id
  JOIN managed_interactives mi ON mi.id = ii.interactive_id AND ii.interactive_type = 'ManagedInteractive'
  JOIN library_interactives li ON li.id = mi.library_interactive_id
  WHERE li.base_url LIKE '%codap.concord.org%' OR mi.url_fragment LIKE '%codap.concord.org%'
  GROUP BY 1
) AS combined
GROUP BY 1
ORDER BY 2 DESC;
```

**SQL Query for summary counts** (total distinct URLs per source):

```sql
SELECT
  source,
  COUNT(*) AS distinct_url_count,
  SUM(activity_count) AS total_activity_references
FROM (
  -- From mw_interactives
  SELECT
    mw.url AS codap_url,
    'mw_interactive' AS source,
    COUNT(DISTINCT la.id) AS activity_count
  FROM lightweight_activities la
  JOIN interactive_pages ip ON ip.lightweight_activity_id = la.id
  JOIN interactive_items ii ON ii.interactive_page_id = ip.id
  JOIN mw_interactives mw ON mw.id = ii.interactive_id AND ii.interactive_type = 'MwInteractive'
  WHERE mw.url LIKE '%codap.concord.org%'
  GROUP BY mw.url

  UNION ALL

  -- From managed_interactives (via library_interactives)
  SELECT
    CONCAT(li.base_url, COALESCE(mi.url_fragment, '')) AS codap_url,
    'managed_interactive' AS source,
    COUNT(DISTINCT la.id) AS activity_count
  FROM lightweight_activities la
  JOIN interactive_pages ip ON ip.lightweight_activity_id = la.id
  JOIN interactive_items ii ON ii.interactive_page_id = ip.id
  JOIN managed_interactives mi ON mi.id = ii.interactive_id AND ii.interactive_type = 'ManagedInteractive'
  JOIN library_interactives li ON li.id = mi.library_interactive_id
  WHERE li.base_url LIKE '%codap.concord.org%' OR mi.url_fragment LIKE '%codap.concord.org%'
  GROUP BY CONCAT(li.base_url, COALESCE(mi.url_fragment, ''))
) AS url_counts
GROUP BY source;
```

**Expected output**:
- First query: List of distinct CODAP URLs with count of activities using each, showing source table
- Summary query: Count of distinct URL patterns per source (e.g., "mw_interactive: 5 distinct URLs, 42 total activity references")

---

### Export CSV with activity-level detail

**Summary**: Generate a CSV file with columns: activity_id, activity_name, codap_url, publication_status, source

**SQL Query for CSV export** (combined from both interactive types):

```sql
-- From mw_interactives
SELECT
  la.id AS activity_id,
  la.name AS activity_name,
  mw.url AS codap_url,
  la.publication_status,
  'mw_interactive' AS source
FROM lightweight_activities la
JOIN interactive_pages ip ON ip.lightweight_activity_id = la.id
JOIN interactive_items ii ON ii.interactive_page_id = ip.id
JOIN mw_interactives mw ON mw.id = ii.interactive_id AND ii.interactive_type = 'MwInteractive'
WHERE mw.url LIKE '%codap.concord.org%'

UNION ALL

-- From managed_interactives
SELECT
  la.id AS activity_id,
  la.name AS activity_name,
  CONCAT(li.base_url, COALESCE(mi.url_fragment, '')) AS codap_url,
  la.publication_status,
  'managed_interactive' AS source
FROM lightweight_activities la
JOIN interactive_pages ip ON ip.lightweight_activity_id = la.id
JOIN interactive_items ii ON ii.interactive_page_id = ip.id
JOIN managed_interactives mi ON mi.id = ii.interactive_id AND ii.interactive_type = 'ManagedInteractive'
JOIN library_interactives li ON li.id = mi.library_interactive_id
WHERE li.base_url LIKE '%codap.concord.org%' OR mi.url_fragment LIKE '%codap.concord.org%'

ORDER BY activity_id;
```

**To export as CSV** (DBeaver - recommended):
- Run the query in DBeaver
- Right-click on results → Export Data → CSV
- DBeaver handles quoting and escaping automatically

**Alternative via Rails console**:
```ruby
require 'csv'
CSV.open("codap_urls.csv", "w") do |csv|
  csv << ["activity_id", "activity_name", "codap_url", "publication_status", "source"]
  # ... query results ...
end
```

---

### Create markdown summary document

**Summary**: After collecting the data, create a summary markdown document in this spec folder.

**File**: `findings.md` (in this spec folder)

**Template**:
```markdown
# CODAP URL Statistics: Findings

**Date**: YYYY-MM-DD
**Query scope**: All activities in LARA production database

## Summary

- Total activities with CODAP: N
- Distinct CODAP URL patterns: N

## URL Patterns Found

| URL Pattern | Activity Count | Notes |
|-------------|----------------|-------|
| `https://codap.concord.org/...` | N | Description |

## Observations

- [Key findings about URL patterns]
- [Any anomalies or unexpected results]

## Recommendations

- [Implications for redirect strategy]
```

---

### Post summary to Jira ticket

**Summary**: Add a comment to CODAP-1091 with the key findings.

**Command**:
```bash
acli jira workitem comment create -k CODAP-1091 -b "## CODAP URL Statistics

**Query date**: YYYY-MM-DD

### Summary
- Total activities with CODAP V2 URLs: N
- Distinct URL patterns found: N

### Key Findings
- [Bullet points of findings]

### Full Details
See: [link to findings.md or CSV]"
```

## Open Questions

### RESOLVED: Are there other interactive types that might contain CODAP URLs?

**Context**: The schema shows multiple interactive types (`mw_interactives`, `managed_interactives`, `image_interactives`, `video_interactives`). The implementation focuses on `mw_interactives` as the most likely location, but other types might also embed CODAP.

**Decision**: Query both `mw_interactives` AND `managed_interactives` (via `library_interactives`). Managed interactives are shells that use library_interactives for default values like URL. Ignore `image_interactives` and `video_interactives` — these are vestigial tables no longer in use.

### RESOLVED: Should we also check sequences?

**Context**: The schema has a `sequences` table with `publication_status`. Sequences contain multiple activities. Should we separately report CODAP URLs in public sequences?

**Decision**: A — Only report at activity level. Sequences aggregate activities, so activity-level reporting is sufficient.
