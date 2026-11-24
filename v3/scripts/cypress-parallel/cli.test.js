const fs = require("fs")
const os = require("os")
const path = require("path")
const {
  checkBaseUrl, checkPlatform, defaultWorkers, keepAwake, main, makeInterruptHandler, parseArgs, selectSpecs
} = require("./cli")

const v3Root = path.resolve(__dirname, "../..")

describe("defaultWorkers", () => {
  it("uses half the cores, at most 8 and at least 1", () => {
    expect(defaultWorkers(16)).toBe(8)
    expect(defaultWorkers(24)).toBe(8)
    expect(defaultWorkers(8)).toBe(4)
    expect(defaultWorkers(1)).toBe(1)
  })
})

describe("parseArgs", () => {
  it("uses the defaults when given no flags", () => {
    expect(parseArgs([])).toEqual({
      workers: defaultWorkers(os.availableParallelism()), spec: null, rerunFailed: false,
      baseUrl: "http://localhost:8080", specTimeoutMinutes: 15
    })
  })

  it("accepts flags with their values as separate arguments", () => {
    expect(parseArgs(["--workers", "8", "--spec", "cypress/e2e/a*.spec.ts", "--base-url", "http://localhost:9000"]))
      .toMatchObject({
        workers: 8, spec: ["cypress/e2e/a*.spec.ts"], rerunFailed: false, baseUrl: "http://localhost:9000"
      })
  })

  // npm's shell expands an unquoted glob like {a,b}.spec.ts into several arguments.
  it("takes the arguments after --spec, and comma-separated ones, as more spec patterns", () => {
    expect(parseArgs(["--spec", "a.ts", "b.ts,c.ts", "--workers", "2"]))
      .toMatchObject({ workers: 2, spec: ["a.ts", "b.ts", "c.ts"] })
  })

  it("keeps the commas inside a brace glob", () => {
    expect(parseArgs(["--spec", "cypress/e2e/{graph,text}.spec.ts,b.ts"]))
      .toMatchObject({ spec: ["cypress/e2e/{graph,text}.spec.ts", "b.ts"] })
  })

  it("rejects a stray argument that doesn't follow --spec", () => {
    expect(() => parseArgs(["a.ts"])).toThrow(/a\.ts/)
  })

  it("accepts flags written with an equals sign", () => {
    expect(parseArgs(["--workers=6", "--rerun-failed"])).toMatchObject({ workers: 6, rerunFailed: true })
  })

  it("accepts a per-spec time limit in minutes", () => {
    expect(parseArgs(["--spec-timeout", "2.5"])).toMatchObject({ specTimeoutMinutes: 2.5 })
  })

  // setTimeout fires at once for delays that don't fit in 32 bits (about 35,791 minutes).
  it.each(["0", "-1", "soon", "Infinity", "40000"])("rejects --spec-timeout %s", value => {
    expect(() => parseArgs(["--spec-timeout", value])).toThrow(/--spec-timeout/)
  })

  it("rejects an unknown flag", () => {
    expect(() => parseArgs(["--record"])).toThrow(/--record/)
  })

  it.each(["0", "-2", "1.5", "lots"])("rejects --workers %s", value => {
    expect(() => parseArgs(["--workers", value])).toThrow(/--workers/)
  })

  it("rejects a flag missing its value", () => {
    expect(() => parseArgs(["--spec"])).toThrow(/--spec/)
  })

  it("rejects --spec together with --rerun-failed", () => {
    expect(() => parseArgs(["--spec", "x", "--rerun-failed"])).toThrow(/--spec.*--rerun-failed/)
  })
})

describe("makeInterruptHandler", () => {
  const setup = () => {
    let time = 1000
    const stop = jest.fn(), forceStop = jest.fn()
    const interrupt = makeInterruptHandler({ stop, forceStop, now: () => time })
    return { interrupt, stop, forceStop, advance: ms => { time += ms } }
  }

  it("asks the specs to stop on the first interrupt", () => {
    const { interrupt, stop, forceStop } = setup()
    interrupt()
    expect(stop).toHaveBeenCalledTimes(1)
    expect(forceStop).not.toHaveBeenCalled()
  })

  // Under npm run, one Ctrl-C arrives twice: from the terminal and forwarded by npm.
  it("ignores a repeat that arrives right after the first", () => {
    const { interrupt, stop, forceStop, advance } = setup()
    interrupt()
    advance(50)
    interrupt()
    expect(stop).toHaveBeenCalledTimes(1)
    expect(forceStop).not.toHaveBeenCalled()
  })

  it("forces the specs to stop on a later interrupt", () => {
    const { interrupt, forceStop, advance } = setup()
    interrupt()
    advance(2000)
    interrupt()
    expect(forceStop).toHaveBeenCalledTimes(1)
  })
})

describe("checkPlatform", () => {
  it("refuses to run on Windows, where it can't stop a hung spec's processes", () => {
    expect(() => checkPlatform("win32")).toThrow(/Windows/)
  })

  it("runs on macOS and Linux", () => {
    expect(() => checkPlatform("darwin")).not.toThrow()
    expect(() => checkPlatform("linux")).not.toThrow()
  })
})

describe("keepAwake", () => {
  it("keeps a Mac from idle-sleeping until this process exits", () => {
    const unref = jest.fn()
    const spawnFn = jest.fn(() => ({ on: jest.fn(), unref }))
    keepAwake({ platform: "darwin", spawnFn })
    expect(spawnFn).toHaveBeenCalledWith("caffeinate", ["-i", "-w", String(process.pid)], { stdio: "ignore" })
    expect(unref).toHaveBeenCalled()
  })

  it("does nothing on other platforms", () => {
    const spawnFn = jest.fn()
    keepAwake({ platform: "linux", spawnFn })
    expect(spawnFn).not.toHaveBeenCalled()
  })
})

describe("checkBaseUrl", () => {
  it("says to start CODAP when nothing answers at the base URL", async () => {
    await expect(checkBaseUrl("http://localhost:1")).rejects.toThrow(/localhost:1.*npm start/)
  })
})

describe("selectSpecs", () => {
  let dir, lastRunFile
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "cypress-parallel-"))
    lastRunFile = path.join(dir, "last-run.json")
  })
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }) })

  const select = args => selectSpecs({ ...parseArgs([]), ...args }, { cwd: v3Root, lastRunFile })

  it("selects every spec by default", () => {
    expect(select({}).specs).toContain("cypress/e2e/graph.spec.ts")
  })

  it("selects the specs matching --spec", () => {
    expect(select({ spec: ["cypress/e2e/formula/formula-errors.spec.ts"] }).specs)
      .toEqual(["cypress/e2e/formula/formula-errors.spec.ts"])
  })

  it("selects the specs matching any of several patterns, once each", () => {
    expect(select({ spec: ["cypress/e2e/text.spec.ts", "cypress/e2e/te*.spec.ts"] }).specs)
      .toEqual(["cypress/e2e/text.spec.ts"])
  })

  it("fails when --spec matches nothing", () => {
    expect(select({ spec: ["cypress/e2e/nope*.ts"] })).toEqual({
      specs: [], exitCode: 1, message: expect.stringMatching(/No specs match cypress\/e2e\/nope\*\.ts/)
    })
  })

  it("says no specs were found when the default pattern matches nothing", () => {
    expect(selectSpecs({ ...parseArgs([]) }, { cwd: dir, lastRunFile })).toEqual({
      specs: [], exitCode: 1, message: expect.stringMatching(/No specs found/)
    })
  })

  it("has nothing to rerun when there's no previous run", () => {
    expect(select({ rerunFailed: true })).toEqual({
      specs: [], exitCode: 0, message: expect.stringMatching(/No previous run to rerun/)
    })
  })

  it("has nothing to rerun when the last run had no failures", () => {
    fs.writeFileSync(lastRunFile, JSON.stringify({ failed: [] }))
    expect(select({ rerunFailed: true })).toEqual({
      specs: [], exitCode: 0, message: expect.stringMatching(/No failed specs in the last run/)
    })
  })

  it("reruns the specs that failed last time", () => {
    fs.writeFileSync(lastRunFile, JSON.stringify({ failed: ["cypress/e2e/text.spec.ts"] }))
    expect(select({ rerunFailed: true }).specs).toEqual(["cypress/e2e/text.spec.ts"])
  })
})

describe("main", () => {
  it("reports a --spec that matches nothing before checking whether CODAP is running", async () => {
    const log = jest.spyOn(console, "log").mockImplementation(() => {})
    const error = jest.spyOn(console, "error").mockImplementation(() => {})
    expect(await main(["--spec", "cypress/e2e/nope*.ts", "--base-url", "http://localhost:1"])).toBe(1)
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/No specs match/))
    expect(error).not.toHaveBeenCalled()
    log.mockRestore()
    error.mockRestore()
  })
})
