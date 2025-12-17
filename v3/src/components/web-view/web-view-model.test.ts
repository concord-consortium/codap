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
