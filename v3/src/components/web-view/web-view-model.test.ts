import iframePhone from "iframe-phone"
import { getSnapshot } from "mobx-state-tree"
import { appState } from "../../models/app-state"
import { IWebViewModel, WebViewModel } from "./web-view-model"
import { createDefaultTileOfType } from "../../models/codap/add-default-content"
import { kWebViewTileType } from "./web-view-defs"
import "./web-view-registration"

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

  it("handles dataSets", () => {
    const { content } = appState.document
    const dataSet1 = content?.createDataSet({ name: "dataSet1" }).sharedDataSet.dataSet!
    const tile1 = createDefaultTileOfType(kWebViewTileType)!
    content?.insertTileInDefaultRow(tile1)
    const webView1 = tile1.content as IWebViewModel
    webView1.setIsPlugin(true)
    const tile2 = createDefaultTileOfType(kWebViewTileType)!
    content?.insertTileInDefaultRow(tile2)
    const webView2 = tile2.content as IWebViewModel
    webView2.setIsPlugin(true)

    // Newly added dataSet gets values of newly handling webView
    webView1.setPreventAttributeDeletion(true)
    expect(dataSet1.preventAttributeDeletion).toBe(false)
    expect(dataSet1.respectEditableItemAttribute).toBe(false)
    webView1.addHandledDataSet(dataSet1)
    expect(dataSet1.preventAttributeDeletion).toBe(true)
    expect(dataSet1.respectEditableItemAttribute).toBe(false)

    // Handled dataSets acquire new values
    webView1.setRespectEditableItemAttribute(true)
    expect(dataSet1.preventAttributeDeletion).toBe(true)
    expect(dataSet1.respectEditableItemAttribute).toBe(true)

    // Added dataSets are removed from old webViews and acquire values of newly handling webView
    const length = (obj: Record<any, any>) => {
      let l = 0
      for (const key in obj) {
        if (obj[key]) l++
      }
      return l
    }
    expect(length(webView1.handledDataSets)).toBe(1)
    expect(length(webView2.handledDataSets)).toBe(0)
    webView2.addHandledDataSet(dataSet1)
    expect(length(webView1.handledDataSets)).toBe(0)
    expect(length(webView2.handledDataSets)).toBe(1)
    expect(dataSet1.preventAttributeDeletion).toBe(false)
    expect(dataSet1.respectEditableItemAttribute).toBe(false)
  })
})
