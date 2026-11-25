// Formats the runner's progress lines and its end-of-run summary.

const path = require("path")

const shortName = spec => spec.replace(/^cypress\/e2e\//, "")

function formatDuration(ms) {
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m${String(seconds % 60).padStart(2, "0")}s`
}

function details(result) {
  if (result.status === "crashed") return `crashed: ${result.error}`
  return [
    result.failing && `${result.failing} failing`,
    result.flaky && `${result.flaky} flaky`
  ].filter(Boolean).join(", ")
}

// One line per finished spec, e.g. "[12/42] ✗ graph.spec.ts  1m02s  2 failing, 1 flaky".
function formatProgress(result, doneCount, total) {
  const mark = result.status === "passed" ? "✓" : "✗"
  const line = `[${doneCount}/${total}] ${mark} ${shortName(result.spec)}  ${formatDuration(result.durationMs)}`
  const extra = details(result)
  return extra ? `${line}  ${extra}` : line
}

function formatSummary(results, { outDir, wallMs }) {
  const failedFirst = (a, b) =>
    (a.status === "passed") - (b.status === "passed") || a.spec.localeCompare(b.spec)
  const rows = [...results].sort(failedFirst).map(r => [
    // Skipped counts Cypress's pending tests (it.skip) and the tests it skipped after a hook failed.
    shortName(r.spec), r.status, r.tests, r.passing, r.failing, r.pending + r.skipped, r.flaky,
    formatDuration(r.durationMs)
  ])
  const header = ["Spec", "Status", "Tests", "Passing", "Failing", "Skipped", "Flaky", "Time"]
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map(row => String(row[i]).length)))
  // The first two columns are text and line up on the left; the rest line up on the right.
  const pad = (cell, i) => i < 2 ? String(cell).padEnd(widths[i]) : String(cell).padStart(widths[i])
  const formatRow = row => row.map(pad).join("  ").trimEnd()

  const count = status => results.filter(r => r.status === status).length
  const lines = [
    formatRow(header),
    ...rows.map(formatRow),
    "",
    `${count("passed")} passed, ${count("failed")} failed, ${count("crashed")} crashed of ${results.length} specs` +
      ` in ${formatDuration(wallMs)}`
  ]
  if (results.some(r => r.status !== "passed")) {
    lines.push(
      `Logs: ${path.join(outDir, "logs")}`,
      `Screenshots: ${path.join(outDir, "screenshots")}`,
      "Rerun the failed specs with: npm run test:cypress:parallel -- --rerun-failed"
    )
  }
  return lines.join("\n")
}

module.exports = { formatDuration, formatProgress, formatSummary }
