import mockXhr from "xhr-mock"
import { Logger } from "./logger"
import { IDocumentModel } from "../models/document/document"

describe("Logger", () => {
  beforeEach(() => {
    mockXhr.setup()
  })
  afterEach(() => {
    mockXhr.reset()
    mockXhr.teardown()
  })

  const mockDocument: IDocumentModel = { title: "Test Document" } as IDocumentModel

  it("should throw an error if instance is not initialized", () => {
    expect(() => Logger.getInstance()).toThrow()
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
    const logger = Logger.getInstance()
    const event = "test event"
    const time = Date.now()
    const documentTitle = "Test Document"
    const args = { key: "value" }

    const mockPostHandler = jest.fn((req, res) => {
      expect(mockPostHandler).toHaveBeenCalledTimes(1)
      return res.status(201)
    })
    mockXhr.use(mockPostHandler)

    const formatAndSendSpy = jest.spyOn(logger as any, "formatAndSend")

    Logger.log(event, args)

    expect(formatAndSendSpy).toHaveBeenCalledWith(time, event, documentTitle, args)
  })
})
