import { DIResources } from "../data-interactive-types"
import { diInteractiveApiHandler } from "./interactive-api-handler"

describe("DataInteractive InteractiveApiHandler", () => {
  const handler = diInteractiveApiHandler
  const originalHref = window.location.href

  // In Jest 30+ with jsdom 25+, window.location is non-configurable
  // Use history.replaceState to change the URL
  const setLocation = (url: string) => {
    const urlObj = new URL(url)
    window.history.replaceState(null, "", urlObj.pathname + urlObj.search + urlObj.hash)
  }

  afterEach(() => {
    // Restore original location
    window.history.replaceState(null, "", new URL(originalHref).pathname)
  })

  it("get returns unavailable when interactiveApi parameter is not present", async () => {
    setLocation("http://localhost/")

    const resources: DIResources = {}
    const result = await handler.get!(resources)

    expect(result.success).toBe(true)
    expect(result.values).toEqual({
      available: false,
      notAvailableReason: "The interactiveApi parameter is not present in the URL."
    })
  })

  it("get returns unavailable when initInteractivePromise is not defined", async () => {
    setLocation("http://localhost/?interactiveApi=")

    const mockCfm = {
      client: {
        providers: {
          interactiveApi: {}
        }
      }
    }
    const resources: DIResources = { cfm: mockCfm as any }
    const result = await handler.get!(resources)

    expect(result.success).toBe(true)
    expect(result.values).toEqual({
      available: false,
      notAvailableReason: "The interactiveApi is not available."
    })
  })

  it("get returns available with initInteractive data when interactiveApi is properly configured", async () => {
    setLocation("http://localhost/?interactiveApi=")

    const mockInitInteractiveData = {
      version: "1.0",
      objectStorage: {
        url: "https://storage.example.com",
        provider: "s3"
      }
    }

    const mockCfm = {
      client: {
        providers: {
          interactiveApi: {
            initInteractivePromise: Promise.resolve(mockInitInteractiveData)
          }
        }
      }
    }

    const resources: DIResources = { cfm: mockCfm as any }
    const result = await handler.get!(resources)

    expect(result.success).toBe(true)
    expect(result.values).toEqual({
      available: true,
      initInteractive: mockInitInteractiveData
    })
  })

  it("get handles interactiveApi parameter with a value", async () => {
    setLocation("http://localhost/?interactiveApi=some-value")

    const mockInitInteractiveData = {
      version: "2.0",
      customData: "test"
    }

    const mockCfm = {
      client: {
        providers: {
          interactiveApi: {
            initInteractivePromise: Promise.resolve(mockInitInteractiveData)
          }
        }
      }
    }

    const resources: DIResources = { cfm: mockCfm as any }
    const result = await handler.get!(resources)

    expect(result.success).toBe(true)
    expect(result.values).toEqual({
      available: true,
      initInteractive: mockInitInteractiveData
    })
  })

  it("get returns unavailable when cfm is not provided in resources", async () => {
    setLocation("http://localhost/?interactiveApi=")

    const resources: DIResources = {}
    const result = await handler.get!(resources)

    expect(result.success).toBe(true)
    expect(result.values).toEqual({
      available: false,
      notAvailableReason: "The interactiveApi is not available."
    })
  })

  it("get handles rejected initInteractivePromise", async () => {
    setLocation("http://localhost/?interactiveApi=")

    const mockCfm = {
      client: {
        providers: {
          interactiveApi: {
            initInteractivePromise: Promise.reject(new Error("Failed to initialize"))
          }
        }
      }
    }

    const resources: DIResources = { cfm: mockCfm as any }

    await expect(handler.get!(resources)).rejects.toThrow("Failed to initialize")
  })
})
