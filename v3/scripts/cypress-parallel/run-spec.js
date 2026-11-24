// Runs one spec in its own Cypress process (run-one.js) and reports what happened.

const { spawn } = require("child_process")
const fs = require("fs")
const path = require("path")
const { specSlug } = require("./specs")

// Children still running, so an interrupted run can stop them.
const activeChildren = new Set()

const kNoCounts = { tests: 0, passing: 0, failing: 0, pending: 0, skipped: 0, flaky: 0 }

// Converts what cypress.run() resolved with into a SpecResult.
function toSpecResult(spec, cypressResult, { logFile, durationMs, exitCode }) {
  const crashed = error => ({ spec, status: "crashed", ...kNoCounts, logFile, durationMs, error })

  if (!cypressResult) {
    return crashed(`Cypress exited${exitCode != null ? ` with code ${exitCode}` : ""} without reporting results`)
  }
  if (cypressResult.status === "failed") return crashed(cypressResult.message)

  const runs = cypressResult.runs || []
  if (!cypressResult.totalTests) return crashed(runs.find(run => run.error)?.error || "no tests ran")

  const flaky = runs.flatMap(run => run.tests || [])
    .filter(test => test.state === "passed" && test.attempts?.length > 1).length
  return {
    spec,
    status: cypressResult.totalFailed ? "failed" : "passed",
    tests: cypressResult.totalTests,
    passing: cypressResult.totalPassed,
    failing: cypressResult.totalFailed,
    pending: cypressResult.totalPending,
    skipped: cypressResult.totalSkipped,
    flaky,
    logFile,
    durationMs
  }
}

// Signals the child's whole process group, which includes the browser Cypress launched.
function killGroup(child, signal) {
  try {
    process.kill(-child.pid, signal)
  } catch {
    // already gone
  }
}

const kKillGraceMs = 10000
const formatLimit = ms => ms < 60000 ? `${ms / 1000}s` : `${ms / 60000}m`

// Runs `spec` in a child process, writing its console output to outDir/logs. A spec still running
// after `timeoutMs` is stopped and reported as crashed, since a hung Cypress run never finishes
// on its own (e.g. after the computer sleeps). Never rejects.
function runSpec(spec, { baseUrl, outDir, cwd, timeoutMs, childScript = path.join(__dirname, "run-one.js") }) {
  const slug = specSlug(spec)
  const logDir = path.join(outDir, "logs")
  const resultDir = path.join(outDir, "results")
  fs.mkdirSync(logDir, { recursive: true })
  fs.mkdirSync(resultDir, { recursive: true })
  const logFile = path.join(logDir, `${slug}.log`)
  const resultFile = path.join(resultDir, `${slug}.json`)
  fs.rmSync(resultFile, { force: true })

  // Without --record nothing goes to Cypress Cloud; removing the key makes sure of it.
  const env = { ...process.env }
  delete env.CYPRESS_RECORD_KEY

  const start = Date.now()
  return new Promise(resolve => {
    const log = fs.openSync(logFile, "w")
    const child = spawn(process.execPath, [childScript, spec, baseUrl, outDir, resultFile], {
      cwd, env, stdio: ["ignore", log, log],
      // Its own process group, so stopping the group also stops the browser Cypress launched.
      detached: true
    })
    activeChildren.add(child)

    let timedOut = false
    let killTimer
    const limitTimer = timeoutMs && setTimeout(() => {
      timedOut = true
      killGroup(child, "SIGTERM")
      killTimer = setTimeout(() => killGroup(child, "SIGKILL"), kKillGraceMs)
    }, timeoutMs)

    let finished = false
    const finish = exitCode => {
      if (finished) return
      finished = true
      clearTimeout(limitTimer)
      clearTimeout(killTimer)
      // The browser and Cypress's helpers can outlive the process that started them, e.g. when it was
      // stopped, so make sure nothing is left in the group.
      killGroup(child, "SIGKILL")
      activeChildren.delete(child)
      fs.closeSync(log)
      if (timedOut) {
        const durationMs = Date.now() - start
        resolve(toSpecResult(spec, { status: "failed", message: `timed out after ${formatLimit(timeoutMs)}` },
          { logFile, durationMs }))
        return
      }
      let cypressResult
      try {
        cypressResult = JSON.parse(fs.readFileSync(resultFile, "utf8"))
      } catch {
        // no result: reported as a crash below
      }
      resolve(toSpecResult(spec, cypressResult, { logFile, durationMs: Date.now() - start, exitCode }))
    }
    child.on("error", () => finish(null))
    child.on("exit", code => finish(code))
  })
}

// Asks every running spec to stop, and forces any still running after `graceMs` to stop.
// With `force`, stops them at once.
function stopAll({ force = false, graceMs = kKillGraceMs } = {}) {
  activeChildren.forEach(child => killGroup(child, force ? "SIGKILL" : "SIGTERM"))
  if (!force) {
    const timer = setTimeout(() => activeChildren.forEach(child => killGroup(child, "SIGKILL")), graceMs)
    // Don't keep the process alive just for this (unref is missing under Jest's jsdom timers).
    timer.unref?.()
  }
}

module.exports = { activeChildren, runSpec, stopAll, toSpecResult }
