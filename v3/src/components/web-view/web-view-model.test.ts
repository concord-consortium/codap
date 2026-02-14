import iframePhone from "iframe-phone"
import { getSnapshot } from "mobx-state-tree"
import { setUrlParams } from "../../utilities/url-params"
import { WebViewModel } from "./web-view-model"

describe("WebViewContentModel", () => {
  it("performs url parameter processing in preProcessSnapshot", () => {
    const originalUrl = "http://example.com"
    const dataInteractiveUrl = "http://data-interactive-url.com"
    setUrlParams(`?di-override=example&di=${encodeURIComponent(dataInteractiveUrl)}`)
    const webView = WebViewModel.create({ url: originalUrl })

    // URL should be replaced by data interactive URL from URL params
    expect(webView.url).toBe(dataInteractiveUrl)
  })
  it("respects guideIndex url parameter in preProcessSnapshot", () => {
    const originalUrl = "http://example.com/guide"
    setUrlParams(`?guideIndex=2`)
    const pages = [
      { title: "Page 1", url: "http://example.com/page1" },
      { title: "Page 2", url: "http://example.com/page2" },
      { title: "Page 3", url: "http://example.com/page3" }
    ]
    const webView = WebViewModel.create({ url: originalUrl, subType: "guide", pageIndex: 0, pages })
    // pageIndex should be replaced by guideIndex from URL params
    expect(webView.pageIndex).toBe(2)

    // not if there aren't enough pages
    setUrlParams(`?guideIndex=5`)
    const webView2 = WebViewModel.create({ url: originalUrl, subType: "guide", pageIndex: 0, pages })
    expect(webView2.pageIndex).toBe(2) // max index

    // only for guides
    const nonGuideWebView = WebViewModel.create({ url: originalUrl, subType: "plugin", pageIndex: 0 })
    expect(nonGuideWebView.pageIndex).toBe(0)
  })
  it("setGuidePageIndex sets pageIndex and url correctly", () => {
    const pages = [
      { title: "Page 1", url: "http://example.com/page1" },
      { title: "Page 2", url: "http://example.com/page2" },
      { title: "Page 3", url: "http://example.com/page3" }
    ]
    const webView = WebViewModel.create({ subType: "guide", pageIndex: 0, pages })
    webView.setGuidePageIndex(1)
    expect(webView.pageIndex).toBe(1)
    expect(webView.url).toBe("http://example.com/page2")

    // Test out-of-bounds index
    webView.setGuidePageIndex(10)
    expect(webView.pageIndex).toBe(2) // max index
    expect(webView.url).toBe("http://example.com/page3")

    webView.setGuidePageIndex(-5)
    expect(webView.pageIndex).toBe(0) // min index
    expect(webView.url).toBe("http://example.com/page1")
  })
  it("needsLocaleReload returns true for localized plugins", () => {
    const webView = WebViewModel.create({ url: "https://example.com/plugins/Importer/index.html" })
    expect(webView.needsLocaleReload).toBe(true)
  })
  it("needsLocaleReload returns true for TP-Sampler", () => {
    const webView = WebViewModel.create({ url: "https://example.com/plugins/TP-Sampler/index.html" })
    expect(webView.needsLocaleReload).toBe(true)
  })
  it("needsLocaleReload returns false for non-localized plugins", () => {
    const webView = WebViewModel.create({ url: "https://example.com/plugins/SomeOtherPlugin/index.html" })
    expect(webView.needsLocaleReload).toBe(false)
  })
  it("needsLocaleReload returns false when handlesLocaleChange is true", () => {
    const webView = WebViewModel.create({ url: "https://example.com/plugins/Importer/index.html" })
    expect(webView.needsLocaleReload).toBe(true)
    webView.setHandlesLocaleChange(true)
    expect(webView.needsLocaleReload).toBe(false)
  })
  it("supports handlesLocaleChange volatile property", () => {
    const webView = WebViewModel.create({})
    expect(webView.handlesLocaleChange).toBe(false)
    webView.setHandlesLocaleChange(true)
    expect(webView.handlesLocaleChange).toBe(true)
  })
  it("prepareSnapshot works correctly", async () => {
    const state = { status: "Looking good" }
    const dataInteractiveController = {
      call(message: string, callback: iframePhone.ListenerCallback) {
        callback({ values: state })
      }
    } as iframePhone.IframePhoneRpcEndpoint
    const webView = WebViewModel.create({})

    webView.setDataInteractiveController(dataInteractiveController)
    await webView.prepareSnapshot()
    const snapshot = getSnapshot(webView)
    expect(snapshot.state).toBe(state)
  })
})
