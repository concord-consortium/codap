import { getDataInteractiveUrl, removeDevUrlParams, removeSearchParams, setUrlParams } from "./url-params"

describe("urlParams", () => {
  // In Jest 30+ with jsdom 25+, window.location is non-configurable
  // Use history.replaceState to change the URL, then track pushState calls
  const originalHref = window.location.href
  let pushedUrls: string[]

  const setLocation = (url: string) => {
    // Use replaceState to change the URL without triggering navigation
    const urlObj = new URL(url)
    window.history.replaceState(null, "", urlObj.pathname + urlObj.search + urlObj.hash)
  }

  let mockPushState: jest.SpyInstance

  beforeEach(() => {
    pushedUrls = []
    mockPushState = jest.spyOn(window.history, "pushState").mockImplementation((_state, _title, url) => {
      if (url) pushedUrls.push(url.toString())
    })
  })

  afterEach(() => {
    mockPushState.mockRestore()
    // Restore original location
    window.history.replaceState(null, "", new URL(originalHref).pathname)
  })

  it("removeSearchParams strips search params when requested", () => {
    // In Jest 30+ with jsdom 25+, we can only change the path/search, not the origin
    // so tests use http://localhost as the base URL
    setLocation("http://localhost/?foo=1&bar=roo")
    removeSearchParams(["foo"])
    let newUrl = "http://localhost/?bar=roo"
    expect(mockPushState).toHaveBeenCalledWith({ path: newUrl }, "", newUrl)

    setLocation("http://localhost/?foo=1&bar=roo")
    removeSearchParams(["foo", "bar"])
    newUrl = "http://localhost/"
    expect(mockPushState).toHaveBeenCalledWith({ path: newUrl }, "", newUrl)
  })

  it("booleanParam works as expected", () => {
    const { booleanParam } = require("./url-params")

    expect(booleanParam(undefined)).toBe(false) // param absent
    expect(booleanParam(null)).toBe(true)       // param present without value
    expect(booleanParam("")).toBe(true)         // param present with empty value
    expect(booleanParam("true")).toBe(true)
    expect(booleanParam("false")).toBe(false)
    expect(booleanParam("TRUE")).toBe(true)
    expect(booleanParam("FALSE")).toBe(false)
    expect(booleanParam("yes")).toBe(true)
    expect(booleanParam("no")).toBe(false)
    expect(booleanParam("YES")).toBe(true)
    expect(booleanParam("NO")).toBe(false)
    expect(booleanParam("1")).toBe(true)
    expect(booleanParam("0")).toBe(false)
    expect(booleanParam("unexpected")).toBe(true)
  })

  it("removeDevUrlParams strips appropriate dev-only params", () => {
    // In Jest 30+ with jsdom 25+, we can only change the path/search, not the origin
    setLocation("http://localhost/?sample=mammals&dashboard")
    removeDevUrlParams()
    let newUrl = "http://localhost/"
    expect(mockPushState).toHaveBeenCalledWith({ path: newUrl }, "", newUrl)

    setLocation("http://localhost/?sample=mammals&dashboard&other=param")
    removeDevUrlParams()
    newUrl = "http://localhost/?other=param"
    expect(mockPushState).toHaveBeenCalledWith({ path: newUrl }, "", newUrl)
  })

  it("getDataInteractiveUrl applies url param modifications", () => {
    let pluginUrl = "old-plugin-url#hash"

    // di-override and di-override-url work as expected
    setUrlParams("?di-override=old-plugin-url&di-override-url=new-plugin-url")
    pluginUrl = getDataInteractiveUrl(pluginUrl)
    expect(pluginUrl).toBe("new-plugin-url#hash")
    pluginUrl = "some-other-plugin-url#hash"
    pluginUrl = getDataInteractiveUrl(pluginUrl)
    expect(pluginUrl).toBe("some-other-plugin-url#hash")

    // di-override and di-override-url work as expected
    setUrlParams("?di-override=old-plugin-url&di=new-plugin-url")
    pluginUrl = "old-plugin-url"
    pluginUrl = getDataInteractiveUrl(pluginUrl)
    expect(pluginUrl).toBe("new-plugin-url")
    pluginUrl = "some-other-plugin-url"
    pluginUrl = getDataInteractiveUrl(pluginUrl)
    expect(pluginUrl).toBe("some-other-plugin-url")

    // di-override-url takes precedence over di
    setUrlParams("?di-override=old-plugin-url&di=new-plugin-url&di-override-url=final-plugin-url")
    pluginUrl = "old-plugin-url"
    pluginUrl = getDataInteractiveUrl(pluginUrl)
    expect(pluginUrl).toBe("final-plugin-url")
    pluginUrl = "some-other-plugin-url"
    pluginUrl = getDataInteractiveUrl(pluginUrl)
    expect(pluginUrl).toBe("some-other-plugin-url")

    // di-override alone does nothing
    setUrlParams("?di-override=old-plugin-url")
    pluginUrl = "old-plugin-url"
    pluginUrl = getDataInteractiveUrl(pluginUrl)
    expect(pluginUrl).toBe("old-plugin-url")
    pluginUrl = "some-other-plugin-url"
    pluginUrl = getDataInteractiveUrl(pluginUrl)
    expect(pluginUrl).toBe("some-other-plugin-url")

    // di-override-url alone does nothing
    setUrlParams("?di-override-url=new-plugin-url")
    pluginUrl = "old-plugin-url"
    pluginUrl = getDataInteractiveUrl(pluginUrl)
    expect(pluginUrl).toBe("old-plugin-url")
    pluginUrl = "some-other-plugin-url"
    pluginUrl = getDataInteractiveUrl(pluginUrl)
    expect(pluginUrl).toBe("some-other-plugin-url")
  })

  it("getGuideIndex parses guideIndex param correctly", () => {
    const { getGuideIndex } = require("./url-params")

    setUrlParams("?guideIndex=2")
    expect(getGuideIndex()).toBe(2)

    setUrlParams("?guideIndex=0")
    expect(getGuideIndex()).toBe(0)

    setUrlParams("?guideIndex=-1")
    expect(getGuideIndex()).toBeUndefined()

    setUrlParams("?guideIndex=2.5")
    expect(getGuideIndex()).toBeUndefined()

    setUrlParams("?guideIndex=not-a-number")
    expect(getGuideIndex()).toBeUndefined()

    setUrlParams("?otherParam=5")
    expect(getGuideIndex()).toBeUndefined()
  })

})
