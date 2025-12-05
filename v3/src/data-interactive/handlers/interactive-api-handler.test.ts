import { DIResources } from "../data-interactive-types"
import { diInteractiveApiHandler } from "./interactive-api-handler"

describe("DataInteractive InteractiveApiHandler", () => {
  const handler = diInteractiveApiHandler
  const originalLocation = window.location

  const mockWindowLocation = (newLocation: Location | URL) => {
    delete (window as any).location
    window.location = newLocation as any
  }

  const setLocation = (url: string) => {
    mockWindowLocation(new URL(url))
  }

  afterEach(() => {
    mockWindowLocation(originalLocation)
  })

  it("get returns unavailable when interactiveApi parameter is not present", async () => {
    setLocation("https://example.com")

    const resources: DIResources = {}
    const result = await handler.get!(resources)

    expect(result.success).toBe(true)
    expect(result.values).toEqual({
      available: false,
      notAvailableReason: "The interactiveApi parameter is not present in the URL."
    })
  })

  it("get returns unavailable when initInteractivePromise is not defined", async () => {
    setLocation("https://example.com?interactiveApi=")

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
    setLocation("https://example.com?interactiveApi=")

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
    setLocation("https://example.com?interactiveApi=some-value")

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
    setLocation("https://example.com?interactiveApi=")

    const resources: DIResources = {}
    const result = await handler.get!(resources)

    expect(result.success).toBe(true)
    expect(result.values).toEqual({
      available: false,
      notAvailableReason: "The interactiveApi is not available."
    })
  })

  it("get handles rejected initInteractivePromise", async () => {
    setLocation("https://example.com?interactiveApi=")

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
