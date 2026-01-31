import {
  registerEmbeddedModeHandler,
  getRegisteredEmbeddedModeHandler,
  IEmbeddedModeHandler
} from "./embedded-mode-registry"

describe("embedded-mode-registry", () => {
  afterEach(() => {
    // Clean up after each test
    registerEmbeddedModeHandler(null)
  })

  describe("registerEmbeddedModeHandler", () => {
    it("should register a handler", () => {
      const mockHandler: IEmbeddedModeHandler = {
        isPhoneInUse: false,
        broadcastMessage: jest.fn()
      }

      registerEmbeddedModeHandler(mockHandler)
      expect(getRegisteredEmbeddedModeHandler()).toBe(mockHandler)
    })

    it("should allow clearing the handler with null", () => {
      const mockHandler: IEmbeddedModeHandler = {
        isPhoneInUse: true,
        broadcastMessage: jest.fn()
      }

      registerEmbeddedModeHandler(mockHandler)
      expect(getRegisteredEmbeddedModeHandler()).toBe(mockHandler)

      registerEmbeddedModeHandler(null)
      expect(getRegisteredEmbeddedModeHandler()).toBeNull()
    })
  })

  describe("getRegisteredEmbeddedModeHandler", () => {
    it("should return null when no handler is registered", () => {
      expect(getRegisteredEmbeddedModeHandler()).toBeNull()
    })

    it("should return the registered handler", () => {
      const mockHandler: IEmbeddedModeHandler = {
        isPhoneInUse: true,
        broadcastMessage: jest.fn()
      }

      registerEmbeddedModeHandler(mockHandler)
      const result = getRegisteredEmbeddedModeHandler()

      expect(result).toBe(mockHandler)
      expect(result?.isPhoneInUse).toBe(true)
    })
  })
})
