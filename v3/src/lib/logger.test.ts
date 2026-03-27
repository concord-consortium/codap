import mockXhr from "xhr-mock"
import { Logger, LogMessage } from "./logger"
import { IDocumentModel } from "../models/document/document"

describe("Logger", () => {
  beforeEach(() => {
    mockXhr.setup()
    Logger.resetForTesting()
  })
  afterEach(() => {
    mockXhr.reset()
    mockXhr.teardown()
  })

  const mockDocument: IDocumentModel = { title: "Test Document" } as IDocumentModel

  it("should throw an error if instance is not initialized", () => {
    expect(() => Logger.Instance).toThrow()
  })

  it("does not log when not initialized", () => {
    const event = "test event"
    const mockPostHandler = jest.fn((req, res) => {
      return res.status(201)
    })
    mockXhr.use(mockPostHandler)

    Logger.log(event)
    expect(mockPostHandler).not.toHaveBeenCalled()
  })

  it("should log when initialized", () => {
    Logger.initializeLogger(mockDocument)
    const logger = Logger.Instance
    const event = "test event"
    const documentTitle = "Test Document"
    const args = { key: "value" }
    const category = "general"

    const mockPostHandler = jest.fn((req, res) => {
      expect(mockPostHandler).toHaveBeenCalledTimes(1)
      return res.status(201)
    })
    mockXhr.use(mockPostHandler)

    const formatAndSendSpy = jest.spyOn(logger as any, "formatAndSend")

    const consoleDebugSpy = jest.spyOn(console, "debug").mockImplementation(() => null)
    const consoleGroupSpy = jest.spyOn(console, "group").mockImplementation(() => null)

    Logger.log(event, args)

    expect(formatAndSendSpy).toHaveBeenCalledWith(expect.any(Number), event, documentTitle, category, args)

    consoleGroupSpy.mockRestore()
    consoleDebugSpy.mockRestore()
    formatAndSendSpy.mockRestore()
  })

  describe("isInitialized", () => {
    it("returns false before initialization", () => {
      expect(Logger.isInitialized).toBe(false)
    })

    it("returns true after initialization", () => {
      Logger.initializeLogger(mockDocument)
      expect(Logger.isInitialized).toBe(true)
    })
  })

  describe("listener dispatch", () => {
    it("dispatches log messages to registered listeners", () => {
      Logger.initializeLogger(mockDocument)
      const listener = jest.fn()
      Logger.registerLogListener(listener)

      Logger.log("testEvent", { key: "value" })

      expect(listener).toHaveBeenCalledTimes(1)
      const logMessage: LogMessage = listener.mock.calls[0][0]
      expect(logMessage.event).toBe("testEvent")
      expect(logMessage.application).toBe("CODAPV3")
      expect(logMessage.session).toBeDefined()
    })

    it("dispatches to multiple listeners", () => {
      Logger.initializeLogger(mockDocument)
      const listener1 = jest.fn()
      const listener2 = jest.fn()
      Logger.registerLogListener(listener1)
      Logger.registerLogListener(listener2)

      Logger.log("testEvent")

      expect(listener1).toHaveBeenCalledTimes(1)
      expect(listener2).toHaveBeenCalledTimes(1)
    })

    it("continues dispatching when a listener throws", () => {
      Logger.initializeLogger(mockDocument)
      const badListener = jest.fn(() => { throw new Error("listener error") })
      const goodListener = jest.fn()
      Logger.registerLogListener(badListener)
      Logger.registerLogListener(goodListener)

      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => null)
      Logger.log("testEvent")
      consoleSpy.mockRestore()

      expect(badListener).toHaveBeenCalledTimes(1)
      expect(goodListener).toHaveBeenCalledTimes(1)
    })

    it("queues listeners registered before initialization", () => {
      const listener = jest.fn()
      Logger.registerLogListener(listener)

      // not yet initialized — listener should not have been called
      expect(listener).not.toHaveBeenCalled()

      Logger.initializeLogger(mockDocument)
      Logger.log("testEvent")

      expect(listener).toHaveBeenCalledTimes(1)
    })
  })

  describe("run_remote_endpoint", () => {
    it("includes run_remote_endpoint when set", () => {
      Logger.initializeLogger(mockDocument)
      Logger.setRunRemoteEndpoint("https://example.com/endpoint")
      const listener = jest.fn()
      Logger.registerLogListener(listener)

      Logger.log("testEvent")

      const logMessage: LogMessage = listener.mock.calls[0][0]
      expect(logMessage.run_remote_endpoint).toBe("https://example.com/endpoint")
    })

    it("omits run_remote_endpoint when not set", () => {
      Logger.initializeLogger(mockDocument)
      const listener = jest.fn()
      Logger.registerLogListener(listener)

      Logger.log("testEvent")

      const logMessage: LogMessage = listener.mock.calls[0][0]
      expect(logMessage.run_remote_endpoint).toBeUndefined()
    })
  })

  describe("runKey session", () => {
    it("uses runKey as session when URL param is present", () => {
      const urlParamsModule = require("../utilities/url-params")
      const originalParams = urlParamsModule.urlParams
      urlParamsModule.urlParams = { ...originalParams, runKey: "my-run-key-123" }

      Logger.initializeLogger(mockDocument)
      const listener = jest.fn()
      Logger.registerLogListener(listener)

      Logger.log("testEvent")

      const logMessage: LogMessage = listener.mock.calls[0][0]
      expect(logMessage.session).toBe("my-run-key-123")

      urlParamsModule.urlParams = originalParams
    })

    it("uses generated session when runKey is absent", () => {
      Logger.initializeLogger(mockDocument)
      const listener = jest.fn()
      Logger.registerLogListener(listener)

      Logger.log("testEvent")

      const logMessage: LogMessage = listener.mock.calls[0][0]
      expect(logMessage.session).toBeDefined()
      expect(logMessage.session).not.toBe("")
    })
  })
})
