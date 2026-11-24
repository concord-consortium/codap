// Remembers how long each spec took, so the next run can start the longest specs first.

const fs = require("fs")
const path = require("path")

// Returns { [spec]: durationMs }. A missing or unreadable file means there are no timings yet.
function loadTimings(file) {
  let data
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8"))
  } catch {
    return {}
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return {}
  return Object.fromEntries(Object.entries(data).filter(([, ms]) => typeof ms === "number"))
}

// Writes `previous` updated with the durations of the specs that ran. A crashed spec's
// duration says nothing about how long it takes, so its previous timing is kept.
function saveTimings(file, previous, results) {
  const timings = { ...previous }
  results.forEach(({ spec, status, durationMs }) => {
    if (status !== "crashed") timings[spec] = durationMs
  })
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, `${JSON.stringify(timings, null, 2)}\n`)
}

// Specs with no timing go first, since they might be long; then the rest, longest first.
// Starting the longest specs first keeps one long spec from running alone at the end.
function orderSpecs(specs, timings) {
  const untimed = specs.filter(spec => timings[spec] == null).sort()
  const timed = specs.filter(spec => timings[spec] != null).sort((a, b) => timings[b] - timings[a])
  return [...untimed, ...timed]
}

module.exports = { loadTimings, orderSpecs, saveTimings }
