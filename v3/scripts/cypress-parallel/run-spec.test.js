const { toSpecResult } = require("./run-spec")

const spec = "cypress/e2e/graph.spec.ts"
const meta = { logFile: "/tmp/graph.spec.log", durationMs: 1234 }

const test = (state, ...attemptStates) => ({ state, attempts: attemptStates.map(s => ({ state: s })) })
const runResult = (overrides, tests) => ({
  totalTests: 0, totalPassed: 0, totalFailed: 0, totalPending: 0, totalSkipped: 0, runs: [{ tests }],
  ...overrides
})

describe("toSpecResult", () => {
  it("reports a spec with a failing test as failed, and counts tests that passed only on a retry as flaky", () => {
    const result = toSpecResult(spec, runResult({ totalTests: 4, totalPassed: 3, totalFailed: 1 }, [
      test("passed", "failed", "passed"),
      test("passed", "passed"),
      test("passed", "passed"),
      test("failed", "failed", "failed", "failed")
    ]), meta)
    expect(result).toEqual({
      spec, status: "failed", tests: 4, passing: 3, failing: 1, pending: 0, skipped: 0, flaky: 1, ...meta
    })
  })

  it("reports a spec with no failing tests as passed", () => {
    const result = toSpecResult(spec, runResult({ totalTests: 2, totalPassed: 1, totalPending: 1 }, [
      test("passed", "passed"),
      test("pending")
    ]), meta)
    expect(result).toMatchObject({ status: "passed", tests: 2, passing: 1, pending: 1, failing: 0, flaky: 0 })
  })

  it("reports a Cypress failure as a crash, with Cypress's message", () => {
    const result = toSpecResult(spec, { status: "failed", failures: 1, message: "Error: * is not a valid URL" }, meta)
    expect(result).toEqual({
      spec, status: "crashed", tests: 0, passing: 0, failing: 0, pending: 0, skipped: 0, flaky: 0, ...meta,
      error: "Error: * is not a valid URL"
    })
  })

  it("reports a missing result as a crash", () => {
    expect(toSpecResult(spec, undefined, meta)).toMatchObject({ status: "crashed", error: expect.any(String) })
  })

  it("reports a run with no tests as a crash, since a spec that fails to compile looks like that", () => {
    expect(toSpecResult(spec, runResult({}, []), meta)).toMatchObject({ status: "crashed", error: "no tests ran" })
  })
})

// These start real processes and stop them by process group, which Windows doesn't support
// (the runner refuses to run there).
const describeUnlessWindows = process.platform === "win32" ? describe.skip : describe

describeUnlessWindows("runSpec", () => {
  const fs = require("fs")
  const os = require("os")
  const path = require("path")
  const { activeChildren, runSpec, stopAll } = require("./run-spec")

  // These tests start real processes, which can be slow on a busy machine, and their own waits
  // add up to several seconds.
  jest.setTimeout(20000)

  let outDir
  beforeEach(() => { outDir = fs.mkdtempSync(path.join(os.tmpdir(), "cypress-parallel-")) })
  afterEach(() => {
    // Don't leave hung fixture processes behind when a test fails.
    stopAll({ force: true })
    fs.rmSync(outDir, { recursive: true, force: true })
  })

  const options = (fixture, timeoutMs = 10000) => ({
    baseUrl: "http://localhost:8080", outDir, cwd: process.cwd(), timeoutMs,
    childScript: path.join(__dirname, "test-fixtures", fixture)
  })
  const isRunning = pid => {
    try { process.kill(pid, 0); return true } catch { return false }
  }
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
  // A killed process can take a moment to be reaped.
  const stopsWithin = async (pid, ms) => {
    for (const end = Date.now() + ms; Date.now() < end; await delay(50)) {
      if (!isRunning(pid)) return true
    }
    return false
  }
  const grandchildPid = async (timeoutMs = 5000) => {
    const file = path.join(outDir, "grandchild.pid")
    // The file can exist briefly before the pid is written to it.
    const readPid = () => fs.existsSync(file) ? Number(fs.readFileSync(file, "utf8")) : 0
    for (const end = Date.now() + timeoutMs; !(readPid() > 0); await delay(20)) {
      if (Date.now() > end) throw new Error("the fixture didn't start its grandchild process")
    }
    return readPid()
  }

  it("reports the result the child writes", async () => {
    const result = await runSpec(spec, options("report.js"))
    expect(result).toMatchObject({ spec, status: "passed", tests: 1 })
    expect(activeChildren.size).toBe(0)
  })

  it("stops a spec that runs past the time limit and reports it as crashed", async () => {
    let pid
    const running = runSpec(spec, options("hang.js", 300))
    pid = [...activeChildren][0].pid
    const result = await running
    expect(result).toMatchObject({ spec, status: "crashed", error: expect.stringMatching(/timed out after 0\.3s/) })
    expect(isRunning(pid)).toBe(false)
    expect(activeChildren.size).toBe(0)
  })

  it("also stops the spec's other processes when it times out, even ones that ignore SIGTERM", async () => {
    const running = runSpec(spec, options("hang-group.js", 500))
    const pid = await grandchildPid()
    await running
    expect(await stopsWithin(pid, 2000)).toBe(true)
  })

  it("forces running specs to stop when they ignore the request to stop", async () => {
    const running = runSpec("ignore-term", options("hang-group.js"))
    const pid = await grandchildPid()
    stopAll({ graceMs: 200 })
    expect(await running).toMatchObject({ status: "crashed" })
    expect(await stopsWithin(pid, 2000)).toBe(true)
    expect(activeChildren.size).toBe(0)
  })
})
