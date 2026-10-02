import mockXhr from "xhr-mock"
import { IDocumentModel } from "../models/document/document"
import { checkGAStatus, getGAMeasurementId, logGAStatus, resetGAStatusForTesting } from "./ga-status"
import { Logger, LogMessage } from "./logger"

type GACallback = () => void

describe("ga-status", () => {
  const kMeasurementId = "G-TEST123"
  let gaCallback: Maybe<GACallback>
  let gtag: jest.Mock

  // mimics the placeholder `gtag()` in index.html, which queues its arguments in `dataLayer`
  function setUpGA() {
    const w = window as any
    w.dataLayer = []
    gtag = jest.fn((...args: unknown[]) => {
      w.dataLayer.push(args)
      if (args[0] === "get") gaCallback = args[3] as GACallback
    })
    w.gtag = gtag
    w.gtag("js", new Date())
    w.gtag("config", kMeasurementId)
  }

  beforeEach(() => {
    jest.useFakeTimers()
    gaCallback = undefined
    resetGAStatusForTesting()
  })

  afterEach(() => {
    jest.useRealTimers()
    const w = window as any
    delete w.dataLayer
    delete w.gtag
    delete w.codapGAScriptError
  })

  describe("getGAMeasurementId", () => {
    it("returns undefined when GA isn't configured", () => {
      expect(getGAMeasurementId()).toBeUndefined()
    })

    it("returns the ID from the queued `config` call", () => {
      setUpGA()
      expect(getGAMeasurementId()).toBe(kMeasurementId)
    })
  })

  describe("checkGAStatus", () => {
    it("resolves to undefined when GA isn't configured", async () => {
      await expect(checkGAStatus()).resolves.toBeUndefined()
    })

    it("asks gtag for the client ID", () => {
      setUpGA()
      checkGAStatus()
      expect(gtag).toHaveBeenCalledWith("get", kMeasurementId, "client_id", expect.any(Function))
    })

    it("reports `loaded` when the GA script calls back", async () => {
      setUpGA()
      const promise = checkGAStatus()
      jest.advanceTimersByTime(1000)
      gaCallback?.()
      await expect(promise).resolves.toEqual({ status: "loaded", waitMs: 1000 })
    })

    it("reports `blocked` when the GA script fails to load", async () => {
      setUpGA()
      const promise = checkGAStatus()
      ;(window as any).codapGAScriptError = true
      // detected at the first poll
      jest.advanceTimersByTime(250)
      await expect(promise).resolves.toEqual({ status: "blocked", waitMs: 250 })
    })

    it("reports `blocked` immediately when the script already failed", async () => {
      setUpGA()
      ;(window as any).codapGAScriptError = true
      await expect(checkGAStatus()).resolves.toEqual({ status: "blocked", waitMs: 0 })
    })

    it("reports `timeout` when neither signal arrives in time", async () => {
      setUpGA()
      const promise = checkGAStatus(5000)
      jest.advanceTimersByTime(5000)
      await expect(promise).resolves.toEqual({ status: "timeout", waitMs: 5000 })
    })

    it("reports only the first result", async () => {
      setUpGA()
      const promise = checkGAStatus(5000)
      gaCallback?.()
      ;(window as any).codapGAScriptError = true
      jest.advanceTimersByTime(5000)
      await expect(promise).resolves.toEqual({ status: "loaded", waitMs: 0 })
    })
  })

  describe("logGAStatus", () => {
    let logSpy: jest.SpyInstance

    beforeEach(() => {
      logSpy = jest.spyOn(Logger, "log").mockImplementation(() => null)
    })
    afterEach(() => {
      logSpy.mockRestore()
    })

    it("logs the result to the log server but not to GA", async () => {
      setUpGA()
      const promise = logGAStatus()
      gaCallback?.()
      await promise
      expect(logSpy).toHaveBeenCalledTimes(1)
      expect(logSpy).toHaveBeenCalledWith("GA status", { status: "loaded", waitMs: 0 }, "session",
        { excludeAnalytics: true })
    })

    it("logs only once per page load", async () => {
      setUpGA()
      const first = logGAStatus()
      gaCallback?.()
      await first
      await logGAStatus()
      expect(logSpy).toHaveBeenCalledTimes(1)
    })

    it("doesn't log when GA isn't configured", async () => {
      await logGAStatus()
      expect(logSpy).not.toHaveBeenCalled()
    })
  })

  describe("logGAStatus with the real Logger", () => {
    const originalIsLoggingEnabled = Logger.isLoggingEnabled

    beforeEach(() => {
      mockXhr.setup()
      mockXhr.post(/.*/, { status: 201 })
      Logger.resetForTesting()
      // enable sending so that the Logger would call gtag for events it sends to GA
      Logger.isLoggingEnabled = true
    })
    afterEach(() => {
      Logger.isLoggingEnabled = originalIsLoggingEnabled
      Logger.resetForTesting()
      mockXhr.teardown()
    })

    it("sends the GA status event to log listeners but not to GA", async () => {
      setUpGA()
      // the Logger checks `gtag instanceof Function`, which a jest mock fails in this environment
      ;(window as any).gtag = (...args: unknown[]) => gtag(...args)
      Logger.initializeLogger({ title: "Test Document" } as IDocumentModel)
      const listener = jest.fn()
      Logger.registerLogListener(listener)

      const promise = logGAStatus()
      gaCallback?.()
      await promise

      expect(listener).toHaveBeenCalledTimes(1)
      const logMessage: LogMessage = listener.mock.calls[0][0]
      expect(logMessage.event).toBe("GA status")
      expect(logMessage.parameters).toEqual({ status: "loaded", waitMs: 0 })
      // the check itself calls gtag("get", ...), so look specifically for the Logger's "event" calls
      expect(gtag).not.toHaveBeenCalledWith("event", expect.anything(), expect.anything())

      // control: an ordinary event does reach gtag, so the assertion above is meaningful
      Logger.log("control event")
      expect(gtag).toHaveBeenCalledWith("event", "control event", expect.anything())
    })
  })
})
