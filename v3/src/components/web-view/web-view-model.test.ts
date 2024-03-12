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
    const result = await new Promise((resolve, reject) => webView.prepareSnapshot(resolve))
    const snapshot = getSnapshot(webView)
    expect(snapshot.savedState).toBe(state)
  })
})
