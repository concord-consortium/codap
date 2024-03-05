import { removeDevUrlParams, removeSearchParams } from "./url-params"

describe("urlParams", () => {
  const originalLocation = window.location

  const mockWindowLocation = (newLocation: Location | URL) => {
    delete (window as any).location
    window.location = newLocation as Location
  }

  const setLocation = (url: string) => {
    mockWindowLocation(new URL(url))
  }

  let mockPushState: jest.SpyInstance

  beforeEach(() => {
    mockPushState = jest.spyOn(window.history, "pushState").mockImplementation(() => null)
  })

  afterEach(() => {
    mockPushState.mockRestore()
    mockWindowLocation(originalLocation)
  })

  it("removeSearchParams strips search params when requested", () => {
    setLocation("https://concord.org?foo=1&bar=roo")
    removeSearchParams(["foo"])
    let newUrl = "https://concord.org/?bar=roo"
    expect(mockPushState).toHaveBeenCalledWith({ path: newUrl }, "", newUrl)

    setLocation("https://concord.org?foo=1&bar=roo")
    removeSearchParams(["foo", "bar"])
    newUrl = "https://concord.org/"
    expect(mockPushState).toHaveBeenCalledWith({ path: newUrl }, "", newUrl)
  })

  it("removeDevUrlParams strips appropriate dev-only params", () => {
    setLocation("https://concord.org?sample=mammals&dashboard")
    removeDevUrlParams()
    let newUrl = "https://concord.org/"
    expect(mockPushState).toHaveBeenCalledWith({ path: newUrl }, "", newUrl)

    setLocation("https://concord.org?sample=mammals&dashboard&other=param")
    removeDevUrlParams()
    newUrl = "https://concord.org/?other=param"
    expect(mockPushState).toHaveBeenCalledWith({ path: newUrl }, "", newUrl)
  })

})
