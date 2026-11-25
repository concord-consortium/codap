const fs = require("fs")
const os = require("os")
const path = require("path")
const { loadTimings, orderSpecs, saveTimings } = require("./timings")

let dir
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "cypress-parallel-")) })
afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }) })

describe("loadTimings", () => {
  it("returns no timings when the file doesn't exist", () => {
    expect(loadTimings(path.join(dir, "missing.json"))).toEqual({})
  })

  it("returns no timings when the file isn't valid JSON", () => {
    const file = path.join(dir, "timings.json")
    fs.writeFileSync(file, "not json")
    expect(loadTimings(file)).toEqual({})
  })

  it("drops values that aren't numbers", () => {
    const file = path.join(dir, "timings.json")
    fs.writeFileSync(file, JSON.stringify({ a: 5, b: "x" }))
    expect(loadTimings(file)).toEqual({ a: 5 })
  })

  it("returns no timings when the file holds something other than an object", () => {
    const file = path.join(dir, "timings.json")
    fs.writeFileSync(file, "[1, 2]")
    expect(loadTimings(file)).toEqual({})
  })
})

describe("saveTimings", () => {
  it("updates the specs that ran, keeps the others, and ignores crashes", () => {
    const file = path.join(dir, "timings.json")
    saveTimings(file, { a: 1, b: 2 }, [
      { spec: "a", status: "failed", durationMs: 10 },
      { spec: "c", status: "crashed", durationMs: 3 }
    ])
    expect(JSON.parse(fs.readFileSync(file, "utf8"))).toEqual({ a: 10, b: 2 })
  })

  it("creates the folder it writes to", () => {
    const file = path.join(dir, "nested", "timings.json")
    saveTimings(file, {}, [{ spec: "a", status: "passed", durationMs: 4 }])
    expect(JSON.parse(fs.readFileSync(file, "utf8"))).toEqual({ a: 4 })
  })
})

describe("orderSpecs", () => {
  it("puts untimed specs first, then the timed ones longest first, ignoring timings of other specs", () => {
    expect(orderSpecs(["a", "b", "c", "d"], { a: 5, b: 50, z: 999 })).toEqual(["c", "d", "b", "a"])
  })
})
