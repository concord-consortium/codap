import { appState } from "../../models/app-state"
import { createDefaultTileOfType } from "../../models/codap/add-default-content"
import { getPreventAttributeDeletion, getRespectEditableItemAttribute } from "./collaborator-utils"
import { kWebViewTileType } from "./web-view-defs"
import { IWebViewModel } from "./web-view-model"
import "./web-view-registration"

describe('WebViewContentModel', () => {
  it("handles dataSets", () => {
    const { content } = appState.document
    const dataSet1 = content?.createDataSet({ name: "dataSet1" }).sharedDataSet.dataSet!
    const tile1 = createDefaultTileOfType(kWebViewTileType)!
    content?.insertTileInDefaultRow(tile1)
    const webView1 = tile1.content as IWebViewModel
    const tile2 = createDefaultTileOfType(kWebViewTileType)!
    content?.insertTileInDefaultRow(tile2)
    const webView2 = tile2.content as IWebViewModel

    // Dataset has values of managing controller
    webView1.setPreventAttributeDeletion(true)
    expect(getPreventAttributeDeletion(dataSet1)).toBe(false)
    expect(getRespectEditableItemAttribute(dataSet1)).toBe(false)
    dataSet1.setManagingControllerId(tile1.id)
    expect(getPreventAttributeDeletion(dataSet1)).toBe(true)
    expect(getRespectEditableItemAttribute(dataSet1)).toBe(false)

    // Changing the managing controller's values changes the dataset's values
    webView1.setRespectEditableItemAttribute(true)
    expect(getPreventAttributeDeletion(dataSet1)).toBe(true)
    expect(getRespectEditableItemAttribute(dataSet1)).toBe(true)

    // Changing the managing controller changes the dataset's values
    webView2.setRespectEditableItemAttribute(true)
    dataSet1.setManagingControllerId(tile2.id)
    expect(getPreventAttributeDeletion(dataSet1)).toBe(false)
    expect(getRespectEditableItemAttribute(dataSet1)).toBe(true)
  })
})
