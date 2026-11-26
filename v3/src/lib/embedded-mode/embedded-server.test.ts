import { setupRequestQueueProcessor } from "../../data-interactive/data-interactive-request-processor"
import { kHostPageId } from "./embedded-mode-registry"
import { initializeEmbeddedServer } from "./embedded-server"

jest.mock("iframe-phone", () => {
  const IframePhoneRpcEndpoint = jest.fn().mockImplementation(() => ({ call: jest.fn(), disconnect: jest.fn() }))
  return {
    __esModule: true,
    default: { IframePhoneRpcEndpoint },
    getIFrameEndpoint: () => ({ initialize: jest.fn() })
  }
})

jest.mock("../../data-interactive/data-interactive-request-processor", () => ({
  setupRequestQueueProcessor: jest.fn(() => jest.fn())
}))

describe("initializeEmbeddedServer", () => {
  const originalParent = window.parent

  beforeEach(() => {
    // CODAP is embedded only when its window has a parent
    Object.defineProperty(window, "parent", { value: {}, configurable: true })
  })
  afterEach(() => {
    Object.defineProperty(window, "parent", { value: originalParent, configurable: true })
  })

  it("identifies the host page's requests as kHostPageId", () => {
    const handler = initializeEmbeddedServer()
    expect(handler).not.toBeNull()
    expect(setupRequestQueueProcessor).toHaveBeenCalledWith(expect.anything(),
      expect.objectContaining({ requesterId: kHostPageId }))
    handler?.disconnect()
  })
})
