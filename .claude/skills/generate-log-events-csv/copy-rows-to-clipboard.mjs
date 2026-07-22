#!/usr/bin/env node
//
// copy-rows-to-clipboard.mjs [csv-path]
//
// Copies the DATA rows of the log-events CSV (header row omitted) onto the system
// clipboard as tab-separated text, ready to paste into the Google Sheet starting at
// cell A2 -- which updates rows 2+ in place and leaves the header row untouched.
//
// Tab-separated (not comma-separated) so that a plain paste splits into columns. The
// field values contain no tabs or newlines, so no quoting is needed.
//
// Clipboard tool is chosen by OS:
//   macOS (darwin) -> pbcopy
//   Linux          -> xclip, then xsel, then wl-copy (whichever is installed)
//
// Defaults to the committed CSV next to this script.
//
import { readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const here = dirname(fileURLToPath(import.meta.url))
const csvPath = process.argv[2] || join(here, "codap-v3-log-events.csv")

// Minimal RFC-4180 CSV parser (fields may contain quoted commas/quotes).
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
    else if (c === "\r") { /* handled with \n */ }
    else field += c
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows
}

const rows = parseCSV(readFileSync(csvPath, "utf8")).filter(r => r.some(f => f !== ""))
const dataRows = rows.slice(1) // drop header
const tsv = dataRows.map(r => r.join("\t")).join("\n")

// Try a clipboard command, returning true on success and false if it is not installed.
// stdout/stderr are ignored so that a daemonizing clipboard tool (xclip keeps running to
// own the X selection) does not hold a caller's pipe open.
function tryCopy(cmd, args, input) {
  const res = spawnSync(cmd, args, { input, stdio: ["pipe", "ignore", "ignore"] })
  if (res.error) return false // e.g. ENOENT: command not found
  return res.status === 0
}

let used = ""
if (process.platform === "darwin") {
  if (tryCopy("pbcopy", [], tsv)) used = "pbcopy"
} else {
  const candidates = [
    ["xclip", ["-selection", "clipboard"]],
    ["xsel", ["--clipboard", "--input"]],
    ["wl-copy", []]
  ]
  for (const [cmd, args] of candidates) {
    if (tryCopy(cmd, args, tsv)) { used = cmd; break }
  }
}

if (used) {
  const months = ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"]
  const d = new Date()
  const title = `CODAP Log Events (${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()})`
  console.error(`Copied ${dataRows.length} data rows (tab-separated, no header) to the ` +
    `clipboard via ${used}.`)
  console.error(`Next, update the published Google Sheet:`)
  console.error(`  1. Content: click cell A2 and paste to update rows 2+ (header row is kept).`)
  console.error(`  2. Filename: rename the sheet to "${title}".`)
} else {
  const hint = process.platform === "darwin"
    ? "pbcopy should be present on macOS."
    : "Install one of: xclip, xsel, or wl-copy."
  console.error(`Could not copy to the clipboard: no clipboard tool found. ${hint}`)
  console.error(`The data rows are still in ${csvPath} (skip its first/header line).`)
  process.exit(1)
}
