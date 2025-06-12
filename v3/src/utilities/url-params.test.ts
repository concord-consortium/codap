import { removeDevUrlParams, removeSearchParams } from "./url-params"

describe("urlParams", () => {
  const originalLocation = window.location.href

  const setLocation = (url: string) => {
    jsdom.reconfigure({
      url
    })
  }

  let mockPushState: jest.SpyInstance

  beforeEach(() => {
    mockPushState = jest.spyOn(window.history, "pushState").mockImplementation(() => null)
  })

  afterEach(() => {
    mockPushState.mockRestore()
    setLocation(originalLocation)
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
