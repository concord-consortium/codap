const { formatDuration, formatProgress, formatSummary } = require("./summary")

const result = (spec, status, counts = {}) => ({
  spec: `cypress/e2e/${spec}`, status, tests: 3, passing: 3, failing: 0, pending: 0, skipped: 0, flaky: 0,
  durationMs: 62000, logFile: `/out/logs/${spec}.log`, ...counts
})

describe("formatDuration", () => {
  it("shows seconds under a minute and minutes with padded seconds above", () => {
    expect(formatDuration(13400)).toBe("13s")
    expect(formatDuration(62000)).toBe("1m02s")
    expect(formatDuration(1100000)).toBe("18m20s")
  })
})

describe("formatProgress", () => {
  it("shows the count, outcome, spec, time, and any failures or flaky tests", () => {
    const line = formatProgress(result("graph.spec.ts", "failed", { passing: 1, failing: 2, flaky: 1 }), 12, 42)
    expect(line).toMatch(/^\[12\/42\] ✗ graph\.spec\.ts +1m02s +2 failing, 1 flaky$/)
  })

  it("shows a passing spec without details", () => {
    expect(formatProgress(result("text.spec.ts", "passed"), 1, 2)).toMatch(/^\[1\/2\] ✓ text\.spec\.ts +1m02s$/)
  })

  it("shows why a spec crashed", () => {
    const line = formatProgress({ ...result("map.spec.ts", "crashed"), error: "no tests ran" }, 3, 4)
    expect(line).toMatch(/^\[3\/4\] ✗ map\.spec\.ts +1m02s +crashed: no tests ran$/)
  })
})

describe("formatSummary", () => {
  const passed = [result("b.spec.ts", "passed"), result("a.spec.ts", "passed", { flaky: 2 })]
  const failed = result("z.spec.ts", "failed", { passing: 2, failing: 1 })
  const crashed = { ...result("y.spec.ts", "crashed"), tests: 0, passing: 0, error: "boom" }

  it("lists failed and crashed specs first, then passing specs alphabetically", () => {
    const lines = formatSummary([...passed, failed, crashed], { outDir: "/out", wallMs: 1100000 }).split("\n")
    const order = ["y.spec.ts", "z.spec.ts", "a.spec.ts", "b.spec.ts"]
      .map(spec => lines.findIndex(line => line.includes(spec)))
    expect(order).toEqual([...order].sort((x, y) => x - y))
    expect(order.every(index => index >= 0)).toBe(true)
  })

  it("shows each spec's counts and status", () => {
    const text = formatSummary([failed], { outDir: "/out", wallMs: 1000 })
    expect(text).toMatch(/Tests +Passing +Failing +Skipped +Flaky +Time/)
    expect(text).toMatch(/z\.spec\.ts +failed +3 +2 +1 +0 +0 +1m02s/)
  })

  it("counts pending and skipped tests together as skipped", () => {
    const spec = result("p.spec.ts", "passed", { tests: 10, passing: 4, pending: 5, skipped: 1 })
    expect(formatSummary([spec], { outDir: "/out", wallMs: 1000 }))
      .toMatch(/p\.spec\.ts +passed +10 +4 +0 +6 +0 +1m02s/)
  })

  it("totals the run", () => {
    const text = formatSummary([...passed, failed, crashed], { outDir: "/out", wallMs: 1100000 })
    expect(text).toContain("2 passed, 1 failed, 1 crashed of 4 specs in 18m20s")
  })

  it("says where to find logs and screenshots and how to rerun failures when something failed", () => {
    const text = formatSummary([...passed, failed], { outDir: "/out", wallMs: 1000 })
    expect(text).toContain("/out/logs")
    expect(text).toContain("/out/screenshots")
    expect(text).toContain("npm run test:cypress:parallel -- --rerun-failed")
  })

  it("leaves out the failure help when everything passed", () => {
    const text = formatSummary(passed, { outDir: "/out", wallMs: 1000 })
    expect(text).not.toContain("/out/logs")
    expect(text).not.toContain("--rerun-failed")
  })
})
