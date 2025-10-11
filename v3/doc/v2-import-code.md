# V2 Import Code

## Introduction

CODAP v2 imports a wide variety of files via both the `Import...` item in the CFM hamburger/file menu as well as via dropping files/urls on the window. The code for handling these imports is rather convoluted and so this document is an attempt to document it. V3 currently (Oct 2025) has limited import capability in the `use-drop-handler.ts` hook, but the `Import...` item in the CFM `File` menu is currently unimplemented.

## ChatGPT's description of the import code in AppController

Here’s a compact “how it works” doc for imports in `AppController`—covering supported types and the control flow for files, URLs, drag/drop, and clipboard.

# Supported inputs (what CODAP accepts)

| Input kind                                 | How users provide it                                  | What it’s recognized as | Examples (MIME / extension)                                                                                | Primary handler(s)                                                               |
| ------------------------------------------ | ----------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| CSV / tabular text                         | File dialog, drag/drop, URL, clipboard text, data URI | **TEXT**                | `text/csv`, `application/csv`, `text/plain`, `text/tab-separated-values` / `.csv`, `.txt`, `.tsv`, `.tab`  | `importFile` → `importFileWithConfirmation` → `importText` → `openCSVImporter()` |
| JSON / CODAP doc                           | File dialog, drag/drop, URL                           | **JSON**                | `application/json`, `application/x-javascript`, `text/x-json` / `.json`, `.codap`                          | File: `DG.cfmClient.openLocalFile(iFile)`; URL: `DG.cfmClient.openUrlFile(iURL)` |
| GeoJSON                                    | File dialog, drag/drop, URL                           | **GEOJSON**             | `application/geo+json`, `application/vnd.geo+json` / `.geojson`                                            | `openGeoJSONImporter()`                                                          |
| Images                                     | File dialog, drag/drop, URL                           | **IMAGE**               | `image/gif`, `image/jpeg`, `image/png`, `image/svg+xml` / `.gif`, `.jpg`, `.jpeg`, `.png`, `.svg`, `.svgz` | Files: read as DataURL → `importImage()`; URLs: `importImage(iURL)`              |
| Google Sheets                              | URL (recognized pattern)                              | **SHEETS**              | `docs.google.com/spreadsheets` (mapped to `application/vnd.google-apps.spreadsheet`)                       | `importGoogleSheets()`                                                           |
| HTML table (scrape)                        | Programmatic call                                     | —                       | `text/html`                                                                                                | `importHTMLImporter()`                                                           |
| Data-URI CSV                               | Pasted/dragged data URI                               | **TEXT**                | `data:text/csv;...`                                                                                        | `importCSVFromDataUri()`                                                         |
| Everything else (web interactives / pages) | URL                                                   | Fallback                | Any URL not matching above                                                                                 | Opens an embedded **GameView** (default) or **WebView** via `addInteractive()`   |

> All importer flavors (CSV, GeoJSON, HTML, Sheets) ultimately open the **Importer** plugin via `openImporterPlugin('Importer', '/Importer/', config)`.

---

# Control flow (at a glance)

## A) File dialog **and** HTML5 drag/drop (same path)

1. **Entry:** `importFile(iFile)`

   * Detects type via `matchMimeSpec(iFile.name, iFile.type)` → resolves to a **group** (`TEXT`, `JSON`, `GEOJSON`, `IMAGE`, `SHEETS`; default **JSON** if unknown).
   * Calls `importFileWithConfirmation(iFile, handlingGroup, alertDialog)`.

2. **Guard/confirmation for JSON docs:**

   * If `iType === 'JSON'` **and** there are unsaved changes, shows a confirm dialog before proceeding.

3. **Read file + dispatch:** `finishImport()` inside `importFileWithConfirmation`

   * Uses `FileReader`:

     * **IMAGE:** `readAsDataURL` → `importImage(this.result, iFile.name)`
     * **others:** `readAsText` → branch:

       * **JSON:** `DG.cfmClient.openLocalFile(iFile)` (opens CODAP document)
       * **GEOJSON:** `openGeoJSONImporter({ text, datasetName, filename, showCaseTable:true })`
       * **TEXT:** `importText(text, baseName, filename)` → `openCSVImporter({contentType:'text/csv', ...})`
   * Closes alert dialog on success; shows alert on error.

> Dragging a file triggers the *exact* same flow as selecting via the dialog, because both end up in `importFile()` with a `File` object.

---

## B) URLs (typed, pasted, or dragged)

1. **Entry:** `importURL(iURL, iComponentType?, iName?)`

   * Parses the URL, computes `baseURL`, and runs `matchMimeSpec(baseURL, iComponentType)`:

     * **TEXT:** `importTextFromUrl(iURL, /*iShowCaseTable*/ false, iName)` → `openCSVImporter({ url:iURL })`
     * **GEOJSON:** `importGeoJSONFromURL(iURL)` → `openGeoJSONImporter({ url:iURL })`
     * **JSON:** `DG.cfmClient.openUrlFile(iURL)`
     * **IMAGE:** `importImage(iURL, iName)`
     * **SHEETS:** `importGoogleSheets(iURL)`
     * **default:** `addInteractive()` → embed as **GameView** (or **WebView** if requested)
   * Special case: Google Sheets URLs are recognized by regex (`/docs.google.com\/spreadsheets/`) and coerced to the `SHEETS` type.

2. **Name extraction for datasets from URLs:** `extractNameFromURLPath()` used by text/geojson URL imports.

---

## C) Clipboard & “Paste from…” flows

* **Menu: “Open new dataset from clipboard” →** `openNewDataSetFromClipboard()`

  * Reads clipboard text:

    * If it’s a **single-line http/https URL**, calls `importURL(data)`.
    * Otherwise treats the text as CSV/TSV and calls `openCSVImporter({ text: data, datasetName:'clipboard data', showCaseTable:true })`.

---

# Type detection details

* **`matchMimeSpec(name, type)`** tries (in order):

  1. Data-URI MIME (`^data:([^;]+);`) if `type` missing.
  2. Google Sheets URL pattern → force `type='application/vnd.google-apps.spreadsheet'`.
  3. MIME matches from the built-in `mimeTypesAndExtensions` table.
  4. Extension matches from the same table.
     Returns the matching entry with `{ group, mime[], extensions[] }`, or `undefined`. Files default to **JSON**, URLs default to the **interactive** fallback.

---

# Notable behaviors / edge cases

* **JSON import confirmation:** If importing a JSON/CODAP file while the current document has unsaved changes, a confirmation dialog appears before replacing it.
* **Images sizing on insert:** `importImage()` determines dimensions asynchronously and caps the added image view to ~480×385 for layout.
* **Data-URI CSV:** `importCSVFromDataUri()` handles both base64 and percent-encoded payloads (decoding repeatedly to guard against double encoding).
* **Importer plugin reuse:** CSV, GeoJSON, HTML table, and Google Sheets all feed into the same Importer plugin (`/Importer/`) with different `contentType` and `url`/`text` config.

---

# Minimal sequence diagrams (text)

**File dialog / drag a file**

```
User → importFile(file)
   → matchMimeSpec → handlingGroup
   → importFileWithConfirmation(file, group)
      → (optional) confirm if JSON && unsaved
      → FileReader.load
         ↳ JSON   → DG.cfmClient.openLocalFile(file)
         ↳ TEXT   → importText(text, name) → openCSVImporter(config)
         ↳ GEOJSON→ openGeoJSONImporter(config)
         ↳ IMAGE  → importImage(dataURL, name)
```

**URL (typed/pasted/dropped)**

```
User → importURL(url[, componentType])
   → matchMimeSpec(baseURL, componentType)
      ↳ TEXT   → importTextFromUrl(url)
      ↳ GEOJSON→ importGeoJSONFromURL(url)
      ↳ JSON   → DG.cfmClient.openUrlFile(url)
      ↳ IMAGE  → importImage(url)
      ↳ SHEETS → importGoogleSheets(url)
      ↳ other  → addInteractive() (GameView/WebView)
```

**Clipboard**

```
User → openNewDataSetFromClipboard()
   → readText()
      ↳ single-line http(s) URL → importURL(text)
      ↳ otherwise               → openCSVImporter({ text })
```

---
