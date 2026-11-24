// Runs the Cypress specs locally, several at a time, each in its own Cypress process.
// Nothing is reported to Cypress Cloud. Run from v3/ with CODAP already running (npm start):
//   npm run test:cypress:parallel -- [--workers N] [--spec <glob>[,<glob>…]] [--rerun-failed]
//     [--base-url <url>] [--spec-timeout <minutes>]

const { spawn } = require("child_process")
const fs = require("fs")
const http = require("http")
const https = require("https")
const os = require("os")
const path = require("path")
const { runPool } = require("./pool")
const { runSpec, stopAll } = require("./run-spec")
const { DEFAULT_BASE_URL, findSpecs } = require("./specs")
const { formatDuration, formatProgress, formatSummary } = require("./summary")
const { loadTimings, orderSpecs, saveTimings } = require("./timings")

// Half the cores, at most 8. On a 16-core Mac the full suite took 8m29s on 4 workers and 4m30s
// on 8; 12 saved only half a minute, because the longest specs slowed down and set the total.
function defaultWorkers(cores) {
  return Math.max(1, Math.min(8, Math.floor(cores / 2)))
}
// Well above the slowest spec, which takes about 5 minutes alone.
const DEFAULT_SPEC_TIMEOUT_MINUTES = 15
const v3Root = path.resolve(__dirname, "../..")
const outDir = path.join(v3Root, ".cache", "cypress-parallel")
const timingsFile = path.join(outDir, "timings.json")
const lastRunFile = path.join(outDir, "last-run.json")

function parseArgs(argv) {
  const args = {
    workers: defaultWorkers(os.availableParallelism()), spec: null, rerunFailed: false, baseUrl: DEFAULT_BASE_URL,
    specTimeoutMinutes: DEFAULT_SPEC_TIMEOUT_MINUTES
  }
  const addSpecs = value => { args.spec = [...(args.spec || []), ...value.split(",").filter(Boolean)] }
  let afterSpec = false
  for (let i = 0; i < argv.length; i++) {
    // npm's shell expands an unquoted glob like {a,b}.spec.ts into several arguments,
    // so the arguments that follow --spec are more spec patterns.
    if (!argv[i].startsWith("--")) {
      if (!afterSpec) throw new Error(`Unexpected argument ${argv[i]}`)
      addSpecs(argv[i])
      continue
    }
    afterSpec = false
    const [flag, inlineValue] = argv[i].split(/=(.*)/s)
    const value = () => {
      const v = inlineValue ?? argv[++i]
      if (v == null || v === "") throw new Error(`${flag} needs a value`)
      return v
    }
    switch (flag) {
      case "--workers": {
        const raw = value()
        const workers = Number(raw)
        if (!Number.isInteger(workers) || workers < 1) {
          throw new Error(`--workers must be a positive whole number, not "${raw}"`)
        }
        args.workers = workers
        break
      }
      case "--spec": addSpecs(value()); afterSpec = true; break
      case "--base-url": args.baseUrl = value(); break
      case "--spec-timeout": {
        const raw = value()
        const minutes = Number(raw)
        if (!(minutes > 0)) throw new Error(`--spec-timeout must be a positive number of minutes, not "${raw}"`)
        args.specTimeoutMinutes = minutes
        break
      }
      case "--rerun-failed": args.rerunFailed = true; break
      default: throw new Error(`Unknown option ${flag}`)
    }
  }
  if (args.spec && args.rerunFailed) throw new Error("Use --spec or --rerun-failed, not both")
  return args
}

// Rejects unless something answers at `url`, so a missing dev server fails the run up front.
// Uses http/https rather than fetch, which Jest's jsdom environment doesn't provide.
function checkBaseUrl(url, timeoutMs = 5000) {
  const notResponding = () =>
    new Error(`Nothing is responding at ${url}. Start CODAP with \`npm start\`, or pass --base-url.`)
  return new Promise((resolve, reject) => {
    let request
    try {
      request = (url.startsWith("https:") ? https : http).get(url, response => {
        response.resume()
        resolve()
      })
    } catch {
      reject(notResponding())
      return
    }
    request.setTimeout(timeoutMs, () => request.destroy())
    request.on("error", () => reject(notResponding()))
  })
}

// Returns { specs }, or no specs with the message to show and the exit code to use.
function selectSpecs(args, { cwd, lastRunFile: file }) {
  if (args.rerunFailed) {
    let lastRun
    try {
      lastRun = JSON.parse(fs.readFileSync(file, "utf8"))
    } catch {
      return { specs: [], exitCode: 0, message: "No previous run to rerun." }
    }
    const failed = Array.isArray(lastRun?.failed) ? lastRun.failed : []
    if (!failed.length) return { specs: [], exitCode: 0, message: "No failed specs in the last run." }
    return { specs: failed }
  }
  const specs = findSpecs({ cwd, ...(args.spec ? { pattern: args.spec } : {}) })
  if (!specs.length) return { specs: [], exitCode: 1, message: `No specs match ${args.spec.join(", ")}.` }
  return { specs }
}

// A Cypress run that's under way when the computer sleeps hangs instead of resuming, so keep
// a Mac awake until this process exits. caffeinate -w exits on its own when this process does.
function keepAwake({ platform = process.platform, spawnFn = spawn } = {}) {
  if (platform !== "darwin") return
  const caffeinate = spawnFn("caffeinate", ["-i", "-w", String(process.pid)], { stdio: "ignore" })
  caffeinate.on("error", () => console.warn("Couldn't run caffeinate; the run may hang if the computer sleeps."))
  caffeinate.unref()
}

async function main(argv) {
  let args
  try {
    args = parseArgs(argv)
  } catch (error) {
    console.error(error.message)
    return 1
  }

  const { specs, message, exitCode } = selectSpecs(args, { cwd: v3Root, lastRunFile })
  if (!specs.length) {
    console.log(message)
    return exitCode
  }

  try {
    await checkBaseUrl(args.baseUrl)
  } catch (error) {
    console.error(error.message)
    return 1
  }

  for (const folder of ["logs", "screenshots", "downloads", "results"]) {
    fs.rmSync(path.join(outDir, folder), { recursive: true, force: true })
  }
  const timings = loadTimings(timingsFile)
  const ordered = orderSpecs(specs, timings)
  const workers = Math.min(args.workers, ordered.length)
  console.log(`Running ${ordered.length} spec(s) on ${workers} worker(s) against ${args.baseUrl}`)
  console.log(`Logs: ${path.join(outDir, "logs")}\n`)

  const controller = new AbortController()
  const interrupt = () => {
    if (controller.signal.aborted) {
      console.log("Stopping now.")
      stopAll({ force: true })
      process.exit(130)
    }
    controller.abort()
    console.log("\nInterrupted. Stopping the running specs… (interrupt again to stop at once)")
    stopAll()
  }
  // The specs run in their own process groups, so closing the terminal doesn't reach them.
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(signal, interrupt)

  const start = Date.now()
  keepAwake()
  const runOptions = { baseUrl: args.baseUrl, outDir, cwd: v3Root, timeoutMs: args.specTimeoutMinutes * 60000 }
  const results = await runPool(ordered, workers, spec => runSpec(spec, runOptions), {
    signal: controller.signal,
    onResult: (result, done, total) => console.log(formatProgress(result, done, total))
  })
  const wallMs = Date.now() - start

  if (controller.signal.aborted) {
    console.log(`Stopped after ${formatDuration(wallMs)}. Timings and the failed-spec list were not updated.`)
    return 130
  }

  saveTimings(timingsFile, timings, results)
  const failed = results.filter(r => r.status !== "passed").map(r => r.spec).sort()
  const lastRun = { finishedAt: new Date().toISOString(), results, failed }
  fs.writeFileSync(lastRunFile, `${JSON.stringify(lastRun, null, 2)}\n`)

  console.log(`\n${formatSummary(results, { outDir, wallMs })}`)
  return failed.length ? 1 : 0
}

if (require.main === module) {
  main(process.argv.slice(2)).then(
    code => process.exit(code),
    error => {
      stopAll({ force: true })
      console.error(error)
      process.exit(1)
    }
  )
}

module.exports = { checkBaseUrl, defaultWorkers, keepAwake, main, parseArgs, selectSpecs }
