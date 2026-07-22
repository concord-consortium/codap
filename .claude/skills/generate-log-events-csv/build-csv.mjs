#!/usr/bin/env node
//
// build-csv.mjs <extracted.json> <csv-path>
//
// Merges the deterministic extraction (extract-log-events.mjs output) with the existing
// committed CSV to produce the log-events dictionary, preserving human-curated fields.
//
// Merge rules, keyed on the Event string:
//   - Event present in both code and CSV -> keep the CSV's curated Placeholders,
//     Value, Parameters, and Description (human-authored / type-annotated).
//   - Event found in code but not in CSV (NEW) -> add a row using the extractor's
//     best-effort Placeholders/Parameters, empty Value, and an EMPTY Description that a
//     human/Claude must fill in. Reported under "NEW".
//   - Event in the CSV but no longer in code (REMOVED) -> dropped. Reported under "REMOVED".
//
// The output columns are exactly: Event, Placeholders, Value, Parameters, Description
// (no Source column). Rows are sorted case-insensitively by Event.
//
// Exit code is 0 normally, or 2 with --check if there are NEW or REMOVED events (useful
// for CI drift detection). Writes the CSV in place unless --check is given.
//
import { readFileSync, writeFileSync, existsSync } from "node:fs"

const args = process.argv.slice(2)
const check = args.includes("--check")
const positional = args.filter(a => !a.startsWith("--"))
const [extractedPath, csvPath] = positional
if (!extractedPath || !csvPath) {
  console.error("usage: build-csv.mjs <extracted.json> <csv-path> [--check]")
  process.exit(1)
}

const COLUMNS = ["Event", "Placeholders", "Value", "Parameters", "Description"]

// --- minimal RFC-4180 CSV parse/serialize -----------------------------------
function parseCSV(text) {
  const rows = []
  let row = [], field = "", inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ",") { row.push(field); field = "" }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = "" }
    else if (c === "\r") { /* ignore, handled by \n */ }
    else field += c
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows
}

function csvField(v) {
  const s = v == null ? "" : String(v)
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

function serializeCSV(records) {
  const lines = [COLUMNS.join(",")]
  for (const r of records) lines.push(COLUMNS.map(c => csvField(r[c])).join(","))
  return lines.join("\r\n") + "\r\n"
}

// --- load existing CSV (tolerant of an extra legacy Source column) ----------
const existing = new Map()
if (existsSync(csvPath)) {
  const rows = parseCSV(readFileSync(csvPath, "utf8")).filter(r => r.some(f => f !== ""))
  if (rows.length) {
    const header = rows[0]
    const idx = name => header.indexOf(name)
    for (const r of rows.slice(1)) {
      const rec = {}
      for (const col of COLUMNS) {
        const i = idx(col)
        rec[col] = i >= 0 ? (r[i] ?? "") : ""
      }
      if (rec.Event) existing.set(rec.Event, rec)
    }
  }
}

// --- merge ------------------------------------------------------------------
const extracted = JSON.parse(readFileSync(extractedPath, "utf8"))
const extractedEvents = new Set(extracted.map(e => e.event))

const out = []
const newEvents = []
for (const e of extracted) {
  const prior = existing.get(e.event)
  if (prior) {
    out.push({ ...prior, Value: "" })
  } else {
    out.push({
      Event: e.event,
      Placeholders: e.placeholders === "?" ? "" : e.placeholders,
      Value: "",
      Parameters: e.parameters === "?" ? "" : e.parameters,
      Description: ""
    })
    newEvents.push(e)
  }
}
const removedEvents = [...existing.keys()].filter(ev => !extractedEvents.has(ev))

out.sort((a, b) => {
  const x = a.Event.toLowerCase(), y = b.Event.toLowerCase()
  return x < y ? -1 : x > y ? 1 : 0
})

// --- report -----------------------------------------------------------------
console.error(`Events in code: ${extracted.length}`)
console.error(`NEW events (need a Description): ${newEvents.length}`)
for (const e of newEvents) console.error(`  + ${e.event}   [${e.sources.join(", ")}]`)
console.error(`REMOVED events (dropped from CSV): ${removedEvents.length}`)
for (const e of removedEvents) console.error(`  - ${e}`)
const missingDesc = out.filter(r => !r.Description.trim()).map(r => r.Event)
if (missingDesc.length) {
  console.error(`Rows with EMPTY Description (${missingDesc.length}):`)
  for (const e of missingDesc) console.error(`  ? ${e}`)
}

if (check) {
  if (newEvents.length || removedEvents.length) process.exit(2)
  process.exit(0)
}

writeFileSync(csvPath, serializeCSV(out))
console.error(`\nWrote ${out.length} rows to ${csvPath}`)
