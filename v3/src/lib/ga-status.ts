import { Logger } from "./logger"

// Reports whether Google Analytics (GA) loaded, so we can measure how often GA is blocked
// (e.g. by school content filters). The result goes to our own log server, never to GA.

export type GAStatus = "loaded" | "blocked" | "timeout"

export interface IGAStatusResult {
  status: GAStatus
  waitMs: number
}

const kDefaultTimeoutMs = 10000
const kPollIntervalMs = 250

interface IGAWindow {
  codapGAScriptError?: boolean
  dataLayer?: ArrayLike<unknown>[]
  gtag?: (...args: unknown[]) => void
}

// The measurement ID is configured once, in index.html, via `gtag("config", <id>)`.
// That call is queued in `dataLayer`, so we read it from there rather than duplicating it.
export function getGAMeasurementId(): Maybe<string> {
  const { dataLayer } = window as IGAWindow
  const configEntry = dataLayer?.find(entry => entry?.[0] === "config")
  const id = configEntry?.[1]
  return typeof id === "string" ? id : undefined
}

// Resolves to undefined if GA isn't configured on the page (e.g. tests or test harnesses).
export function checkGAStatus(timeoutMs = kDefaultTimeoutMs): Promise<Maybe<IGAStatusResult>> {
  const gaWindow = window as IGAWindow
  const measurementId = getGAMeasurementId()
  if (!gaWindow.gtag || !measurementId) return Promise.resolve(undefined)

  const start = Date.now()
  return new Promise(resolve => {
    let isDone = false
    const finish = (status: GAStatus) => {
      if (isDone) return
      isDone = true
      clearInterval(intervalId)
      clearTimeout(timeoutId)
      resolve({ status, waitMs: Date.now() - start })
    }

    // Filters that block GA's domain usually make the script fail to load.
    const checkScriptError = () => {
      if (gaWindow.codapGAScriptError) finish("blocked")
    }
    const intervalId = setInterval(checkScriptError, kPollIntervalMs)
    // Neither signal arrived, e.g. a filter served a "blocked" page instead of the script.
    const timeoutId = setTimeout(() => finish("timeout"), timeoutMs)

    checkScriptError()
    // index.html defines a placeholder `gtag()` that only queues its arguments, so the
    // existence of `gtag` proves nothing. Only the real gtag.js script calls this callback.
    gaWindow.gtag?.("get", measurementId, "client_id", () => finish("loaded"))
  })
}

let hasLoggedGAStatus = false

// Logs the GA status once per page load.
export async function logGAStatus(timeoutMs?: number) {
  if (hasLoggedGAStatus) return
  hasLoggedGAStatus = true

  const result = await checkGAStatus(timeoutMs)
  if (result) {
    Logger.log("GA status", { status: result.status, waitMs: result.waitMs }, "session",
      { excludeAnalytics: true })
  }
}

/**
 * Reset module state for testing. NOT for production use.
 */
export function resetGAStatusForTesting() {
  hasLoggedGAStatus = false
}
