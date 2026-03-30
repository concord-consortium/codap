import { Logger } from "../logger"
import { IDocumentModel } from "../../models/document/document"
import { handleLogLaraData } from "./cfm-log-utils"

describe("handleLogLaraData", () => {
  const mockDocument: IDocumentModel = { title: "Test Document" } as IDocumentModel

  beforeEach(() => {
    Logger.resetForTesting()
    Logger.initializeLogger(mockDocument)
  })

  it("sets run_remote_endpoint when present", () => {
    const setEndpointSpy = jest.spyOn(Logger, "setRunRemoteEndpoint")

    handleLogLaraData({ run_remote_endpoint: "https://example.com/endpoint", operation: "open" })

    expect(setEndpointSpy).toHaveBeenCalledWith("https://example.com/endpoint")
    setEndpointSpy.mockRestore()
  })

  it("does not set run_remote_endpoint when absent", () => {
    const setEndpointSpy = jest.spyOn(Logger, "setRunRemoteEndpoint")

    handleLogLaraData({ operation: "open" })

    expect(setEndpointSpy).not.toHaveBeenCalled()
    setEndpointSpy.mockRestore()
  })

  it("does not set run_remote_endpoint when not a string", () => {
    const setEndpointSpy = jest.spyOn(Logger, "setRunRemoteEndpoint")

    handleLogLaraData({ run_remote_endpoint: 123, operation: "open" })

    expect(setEndpointSpy).not.toHaveBeenCalled()
    setEndpointSpy.mockRestore()
  })

  it("logs the laraData event", () => {
    const logSpy = jest.spyOn(Logger, "log")
    const data = { run_remote_endpoint: "https://example.com/endpoint", operation: "open" }

    handleLogLaraData(data)

    expect(logSpy).toHaveBeenCalledWith("laraData", data)
    logSpy.mockRestore()
  })
})
