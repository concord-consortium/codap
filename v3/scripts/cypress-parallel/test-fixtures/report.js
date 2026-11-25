// Stands in for run-one.js in tests: reports a passing run right away.
const fs = require("fs")
const resultFile = process.argv[5]
fs.writeFileSync(resultFile, JSON.stringify({
  totalTests: 1, totalPassed: 1, totalFailed: 0, totalPending: 0, totalSkipped: 0,
  runs: [{ tests: [{ state: "passed", attempts: [{ state: "passed" }] }] }]
}))
