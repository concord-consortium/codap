import iframePhone from "iframe-phone"
import { getSnapshot } from "mobx-state-tree"
import { WebViewModel } from "./web-view-model"

describe('WebViewContentModel', () => {
  it('prepareSnapshot works correctly', async () => {
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
