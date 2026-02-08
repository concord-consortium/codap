# Import Architecture

This document describes how CODAP handles importing data from files, URLs, HTML tables, and the clipboard in both V3 and V2.

---

# V3 Import Architecture

## Overview

V3 handles imports via the `useDropHandler` hook (native DOM drag/drop events) and the `useImportHelpers` hook (import routing logic), both wired together in `App.tsx`. The Cloud File Manager (CFM) handles the `Import...` menu item for file dialog and URL imports.

Like V2, all importer-based imports (CSV, GeoJSON, HTML table, Google Sheets) launch the **Importer** plugin as a hidden WebView tile. The plugin receives its configuration via the plugin state API (`interactiveFrame.savedState`), parses the content, creates datasets, and closes itself.

## Supported Inputs

| Input kind | How users provide it | Handler | Mechanism |
|---|---|---|---|
| CSV file | File drop, file dialog | `initiateImportFromCsv({ file })` | Importer plugin (hidden WebView) |
| CSV URL | URL drop, CFM import | `initiateImportFromCsv({ url })` | Importer plugin (hidden WebView) |
| CODAP file | File drop, file dialog | Cloud File Manager | `openLocalFileWithConfirmation()` |
| CODAP URL | URL drop | `loadWebView(url)` | WebView tile |
| GeoJSON file/URL | File or URL drop | `initiateGenericImport()` | Importer plugin (hidden WebView) |
| Google Sheets URL | URL drop | `initiateGenericImport()` | Importer plugin (hidden WebView) |
| Image file | File drop | `downscaleImageFile()` -> `loadWebView()` | WebView tile (visible) |
| Image URL | URL drop | `loadWebView()` | WebView tile (visible) |
| HTML table | Drag from web page | `initiateImportFromHTML(html)` | Importer plugin (hidden WebView) |
| Clipboard text | Menu action | `initiateImportFromClipboard()` | Importer plugin (hidden WebView) |
| Other URL | URL drop | `loadWebView(url)` | WebView tile (visible) |

## Drop Priority

The `getDropPriority()` function in `use-import-helpers.ts` examines all `DataTransferItem`s and returns the highest-priority type, replicating V2's priority order:

1. **Files** — any item with `kind === "file"`
2. **URLs** — any item with `kind === "string"` and `type === "text/uri-list"`
3. **HTML tables** — any item with `kind === "string"` and `type === "text/html"`

This ensures that URL drops (which browsers may also provide as `text/html`) don't accidentally trigger the HTML table importer. Internal attribute drags are handled by a separate system (dnd-kit) and don't reach the native drop handler.

## Control Flow

### A) Drop events

```
User drops content on CODAP document
   -> useDropHandler (use-drop-handler.ts)
      -> handleDrop (use-import-helpers.ts)
         -> getDropPriority(items) determines type
         |
         | "files" -> for each file item:
         |    -> getImportableFileTypeFromDataTransferFile(item)
         |    -> importFile(type, { file })
         |
         | "url" -> for each text/uri-list item:
         |    -> getAsString() to extract URL
         |    -> extract di= parameter if present
         |    -> getImportableFileTypeFromUrl(url)
         |    -> importFile(type, { url })
         |
         | "html" -> for first text/html item:
         |    -> getAsString() to extract HTML
         |    -> initiateImportFromHTML(html)
```

### B) File/URL type routing (importFile)

```
importFile(type, { file, url })
   | "csv"     -> initiateImportFromCsv({ file }) or ({ url })
   | "codap"   -> cfm.openLocalFileWithConfirmation(file) or loadWebView(url)
   | "geojson" -> initiateGenericImport({ file, url, contentType: "application/geo+json" })
   | "google-sheets" -> initiateGenericImport({ url, contentType: "application/vnd.google-apps.spreadsheet" })
   | "image"   -> downscaleImageFile() -> getImageDimensions() -> loadWebView()
   | default   -> cfm alert (file) or loadWebView(url)
```

### C) Importer plugin launch (all importer-based imports)

```
initiateImportFromCsv/HTML/Generic(options)
   -> Create IWebViewSnapshot:
      { type: "CodapWebView", subType: "plugin",
        url: getImporterPluginUrl(),
        state: { contentType, name: "Importer", text/file/url } }
   -> appState.document.content.insertTileSnapshotInDefaultRow(
        { _title: "Importer", content: snapshot },
        kImporterPluginInsertOptions)  // { x:5, y:5, ..., isHidden: true }
   -> Hidden WebView tile created -> iframe loads Importer plugin
   -> Plugin queries interactiveFrame.savedState -> receives config
   -> Plugin parses content, creates dataset, opens case table, closes itself
```

### D) Clipboard

```
User -> "Open new dataset from clipboard" menu item
   -> initiateImportFromClipboard(data?)
      -> navigator.clipboard.readText()
      -> initiateImportFromCsv({ text, data, datasetName })
```

## Type Detection

`getImportableFileTypeFromDataTransferFile(item)` and `getImportableFileTypeFromUrl(url)` in `importable-files.ts` detect file types from:
- DataTransferItem MIME type
- File extension
- URL patterns (e.g. Google Sheets, data URIs)

Returns one of: `"csv"`, `"codap"`, `"geojson"`, `"google-sheets"`, `"image"`, `"html"`, or `undefined`.

## Key Files

| File | Purpose |
|------|---------|
| `src/hooks/use-drop-handler.ts` | Native DOM drag/drop event listener hook |
| `src/hooks/use-import-helpers.ts` | `handleDrop` with priority logic, `getDropPriority()`, `importFile` routing |
| `src/utilities/csv-import.ts` | `initiateImportFromCsv()` — launches Importer for CSV |
| `src/utilities/html-import.ts` | `initiateImportFromHTML()` — launches Importer for HTML tables |
| `src/utilities/generic-import.ts` | `initiateGenericImport()` — launches Importer for GeoJSON/Sheets |
| `src/utilities/importable-files.ts` | File type detection from MIME types, extensions, URLs |
| `src/components/web-view/web-view-defs.ts` | `kImporterPluginInsertOptions` (hidden tile layout) |
| `src/constants.ts` | `getImporterPluginUrl()`, `getPluginsRootUrl()` |
| `src/components/app.tsx` | Wires `useDropHandler` to `useImportHelpers` at app level |

## Importer Plugin State Interface

The `state` object passed to the Importer plugin as `savedGameState`:

```typescript
interface ImporterPluginState {
  contentType: string       // MIME type: 'text/html' | 'text/csv' | 'application/geo+json' | etc.
  name: string              // "Importer"
  text?: string             // Raw content string (for clipboard/drag data)
  file?: File               // File object (for file drops)
  url?: string              // URL to fetch content from
  datasetName?: string      // Desired dataset name
  targetDatasetName?: string // Target dataset for append/replace
  showCaseTable?: boolean   // Whether to open case table after import
}
```

---

# V2 Import Architecture

## Overview

V2 imports data via the `Import...` item in the CFM hamburger/file menu, dropping files/URLs on the window, and clipboard paste. The code lives primarily in `AppController` (`apps/dg/controllers/app_controller.js`) and `main_page.js` (`apps/dg/resources/main_page.js`).

All importer flavors (CSV, GeoJSON, HTML table, Google Sheets) ultimately open the **Importer** plugin via `openImporterPlugin('Importer', '/Importer/', config)`.

## Supported Inputs

| Input kind | How users provide it | Recognized as | MIME / extension examples | Primary handler(s) |
|---|---|---|---|---|
| CSV / tabular text | File dialog, drag/drop, URL, clipboard, data URI | **TEXT** | `text/csv`, `text/plain`, `text/tab-separated-values` / `.csv`, `.txt`, `.tsv`, `.tab` | `importFile` -> `importText` -> `openCSVImporter()` |
| JSON / CODAP doc | File dialog, drag/drop, URL | **JSON** | `application/json` / `.json`, `.codap` | `DG.cfmClient.openLocalFile()` or `openUrlFile()` |
| GeoJSON | File dialog, drag/drop, URL | **GEOJSON** | `application/geo+json` / `.geojson` | `openGeoJSONImporter()` |
| Images | File dialog, drag/drop, URL | **IMAGE** | `image/gif`, `image/jpeg`, `image/png`, `image/svg+xml` / `.gif`, `.jpg`, `.png`, `.svg` | `importImage()` |
| Google Sheets | URL (recognized pattern) | **SHEETS** | `docs.google.com/spreadsheets` | `importGoogleSheets()` |
| HTML table | Drag from web page | — | `text/html` | `importHTMLTable()` -> `openHTMLImporter()` |
| Data-URI CSV | Pasted/dragged data URI | **TEXT** | `data:text/csv;...` | `importCSVFromDataUri()` |
| Other URLs | URL | Fallback | Any URL not matching above | `addInteractive()` (GameView/WebView) |

## Drop Priority

Drop handling in `main_page.js:dataDragDropped()` uses this priority order:

1. **Files** — `dataTransfer.files.length > 0`
2. **URLs** — `dataTransfer.getData('text/uri-list')` is a valid URI
3. **HTML tables** — `dataTransfer.types.includes('text/html')` (only if not an internal attribute drag)

## Control Flow

### A) File dialog and HTML5 file drop

```
User -> importFile(file)
   -> matchMimeSpec -> handlingGroup
   -> importFileWithConfirmation(file, group)
      -> (optional) confirm if JSON && unsaved
      -> FileReader.load
         | JSON    -> DG.cfmClient.openLocalFile(file)
         | TEXT    -> importText(text, name) -> openCSVImporter(config)
         | GEOJSON -> openGeoJSONImporter(config)
         | IMAGE   -> importImage(dataURL, name)
```

Dragging a file triggers the same flow as the file dialog, because both end up in `importFile()` with a `File` object.

### B) URLs (typed, pasted, or dragged)

```
User -> importURL(url[, componentType])
   -> matchMimeSpec(baseURL, componentType)
      | TEXT    -> importTextFromUrl(url) -> openCSVImporter({ url })
      | GEOJSON -> importGeoJSONFromURL(url) -> openGeoJSONImporter({ url })
      | JSON    -> DG.cfmClient.openUrlFile(url)
      | IMAGE   -> importImage(url)
      | SHEETS  -> importGoogleSheets(url)
      | other   -> addInteractive() (GameView/WebView)
```

Google Sheets URLs are recognized by regex (`/docs.google.com\/spreadsheets/`) and coerced to the SHEETS type.

### C) HTML table drop

```
User drags HTML table from web page -> dataDragDropped()
   -> dataTransfer.getData('text/html')
   -> importHTMLTable(htmlText)
   -> openHTMLImporter({ contentType: 'text/html', text: htmlText })
   -> openImporterPlugin('Importer', '/Importer/', config)
      -> Creates hidden GameView with savedGameState = config
      -> Importer plugin parses <table>, creates dataset, closes itself
```

### D) Clipboard

```
User -> openNewDataSetFromClipboard()
   -> readText()
      | single-line http(s) URL -> importURL(text)
      | otherwise               -> openCSVImporter({ text })
```

## Type Detection

`matchMimeSpec(name, type)` tries (in order):
1. Data-URI MIME (`^data:([^;]+);`) if `type` missing
2. Google Sheets URL pattern -> force `type='application/vnd.google-apps.spreadsheet'`
3. MIME matches from the built-in `mimeTypesAndExtensions` table
4. Extension matches from the same table

Returns the matching entry with `{ group, mime[], extensions[] }`, or `undefined`. Files default to **JSON**, URLs default to the **interactive** fallback.

## Key Files

| File | Purpose |
|------|---------|
| `apps/dg/resources/main_page.js` (278-385) | Drop detection handlers |
| `apps/dg/controllers/app_controller.js` (475-490) | `openImporterPlugin()` |
| `apps/dg/controllers/app_controller.js` (511-513) | `openHTMLImporter()` |
| `apps/dg/controllers/app_controller.js` (611-617) | `importHTMLTable()` |

## Notable Behaviors

- **JSON import confirmation:** Confirmation dialog before replacing a document with unsaved changes.
- **Image sizing:** `importImage()` determines dimensions asynchronously, caps to ~480x385.
- **Data-URI CSV:** Handles both base64 and percent-encoded payloads.
- **Importer plugin reuse:** CSV, GeoJSON, HTML table, and Google Sheets all use the same Importer plugin with different `contentType` and `url`/`text` config.

---

# V2/V3 Comparison

| Aspect | V2 | V3 |
|--------|----|----|
| Drop detection | SproutCore view in `main_page.js` | `useDropHandler` hook with native DOM listeners |
| Drop priority | Inline checks in `dataDragDropped()` | `getDropPriority()` pure function |
| Internal drag distinction | `_isDraggingAttr` flag from `dataDragEntered` | Separate dnd-kit system; native drops can't be internal |
| Plugin launch | `openImporterPlugin()` creates `GameView` component | `insertTileSnapshotInDefaultRow()` creates hidden WebView tile |
| Plugin state delivery | `savedGameState` on component creation | `IWebViewSnapshot.state` -> plugin queries `interactiveFrame` |
| Type detection | `matchMimeSpec()` with MIME/extension table | `getImportableFileTypeFromDataTransferFile/Url()` |
| Clipboard | `openNewDataSetFromClipboard()` in AppController | `initiateImportFromClipboard()` in `csv-import.ts` |

---

# Known V3 Gaps (relative to V2)

The following V2 import capabilities are not yet implemented in V3:

1. **Data-URI CSV** — V2 handles `data:text/csv;...` URIs via `importCSVFromDataUri()`, supporting both base64 and percent-encoded payloads. V3's `getImportableFileTypeFromUrl()` only recognizes `data:image/` URIs; a `data:text/csv;...` URI would be treated as a generic URL and opened as a WebView instead of being parsed as CSV.

2. **Clipboard URL detection** — V2's `openNewDataSetFromClipboard()` checks if the clipboard text is a single-line HTTP/HTTPS URL and calls `importURL()` to fetch and import the resource. V3's `initiateImportFromClipboard()` always treats clipboard text as raw CSV content, so pasting a URL to a CSV file results in the URL string itself being imported as data rather than fetching and importing from that URL.

3. **Drop target visual feedback on main document** — V2 adds a `dg-receive-outside-drop` CSS class to the main workspace during external drags to indicate the drop target is active. V3 only shows drag-over visual feedback (yellow border via `show-highlight` class) on the user-entry overlay modal. Once that modal is dismissed, there is no visual feedback when dragging files or HTML content over the main CODAP workspace. Drops still work; there is just no visual cue.
