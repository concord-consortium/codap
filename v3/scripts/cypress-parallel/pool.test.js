const { runPool } = require("./pool")

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

// A stand-in for runSpec that records how many specs run at once.
function fakeRunner({ durations = {}, crash = [] } = {}) {
  const runner = { started: [], peak: 0, running: 0 }
  runner.run = async spec => {
    runner.started.push(spec)
    runner.running++
    runner.peak = Math.max(runner.peak, runner.running)
    await delay(durations[spec] ?? 5)
    runner.running--
    return { spec, status: crash.includes(spec) ? "crashed" : "passed" }
  }
  return runner
}

const specs = ["a", "b", "c", "d", "e", "f"]

describe("runPool", () => {
  it("runs no more specs at once than there are workers, and runs them all", async () => {
    const runner = fakeRunner()
    const results = await runPool(specs, 2, runner.run)
    expect(runner.peak).toBe(2)
    expect(results.map(r => r.spec).sort()).toEqual(specs)
  })

  it("keeps running the other specs when one crashes", async () => {
    const runner = fakeRunner({ crash: ["b"] })
    const results = await runPool(specs, 2, runner.run)
    expect(results).toHaveLength(6)
    expect(results.find(r => r.spec === "b").status).toBe("crashed")
  })

  it("starts the specs in the order given", async () => {
    const runner = fakeRunner()
    await runPool(specs, 3, runner.run)
    expect(runner.started).toEqual(specs)
  })

  it("gives a free worker the next spec as soon as it finishes", async () => {
    const runner = fakeRunner({ durations: { a: 60, b: 5, c: 5, d: 5 } })
    const results = await runPool(["a", "b", "c", "d"], 2, runner.run)
    expect(results.map(r => r.spec)).toEqual(["b", "c", "d", "a"])
  })

  it("reports each result as it arrives", async () => {
    const onResult = jest.fn()
    await runPool(["a", "b"], 1, fakeRunner().run, { onResult })
    expect(onResult.mock.calls).toEqual([
      [{ spec: "a", status: "passed" }, 1, 2],
      [{ spec: "b", status: "passed" }, 2, 2]
    ])
  })

  it("starts no more specs once aborted", async () => {
    const runner = fakeRunner()
    const controller = new AbortController()
    const results = await runPool(specs, 2, runner.run, {
      signal: controller.signal,
      onResult: () => controller.abort()
    })
    expect(runner.started).toEqual(["a", "b"])
    expect(results).toHaveLength(2)
  })

  it("runs every spec once when there are more workers than specs", async () => {
    const runner = fakeRunner()
    const results = await runPool(["a", "b"], 5, runner.run)
    expect(runner.started).toEqual(["a", "b"])
    expect(results.map(r => r.spec).sort()).toEqual(["a", "b"])
  })
})
