import { getSnapshot } from "mobx-state-tree"
import { setupTestDataset, testCases } from "../../data-interactive/handlers/handler-test-utils"
import { appState } from "../../models/app-state"
import { createDefaultTileOfType } from "../../models/codap/add-default-content"
import {
  getPreventAttributeDeletion, getRespectEditableItemAttribute, isCaseEditable, isItemEditable
} from "./collaborator-utils"
import { kWebViewTileType } from "./web-view-defs"
import { IWebViewModel } from "./web-view-model"
import "./web-view-registration"

describe('Collaborator Utils', () => {
  it("plugins can control datasets", () => {
    const { content } = appState.document
    const dataSet = content!.createDataSet({ name: "dataSet1" }).sharedDataSet.dataSet
    const tile1 = createDefaultTileOfType(kWebViewTileType)!
    content?.insertTileInDefaultRow(tile1)
    const webView1 = tile1.content as IWebViewModel
    const tile2 = createDefaultTileOfType(kWebViewTileType)!
    content?.insertTileInDefaultRow(tile2)
    const webView2 = tile2.content as IWebViewModel

    // Dataset has values of managing controller
    webView1.setPreventAttributeDeletion(true)
    expect(getPreventAttributeDeletion(dataSet)).toBe(false)
    expect(getRespectEditableItemAttribute(dataSet)).toBe(false)
    dataSet.setManagingControllerId(tile1.id)
    expect(getPreventAttributeDeletion(dataSet)).toBe(true)
    expect(getRespectEditableItemAttribute(dataSet)).toBe(false)

    // Changing the managing controller's values changes the dataset's values
    webView1.setRespectEditableItemAttribute(true)
    expect(getPreventAttributeDeletion(dataSet)).toBe(true)
    expect(getRespectEditableItemAttribute(dataSet)).toBe(true)

    // Changing the managing controller changes the dataset's values
    webView2.setRespectEditableItemAttribute(true)
    dataSet.setManagingControllerId(tile2.id)
    expect(getPreventAttributeDeletion(dataSet)).toBe(false)
    expect(getRespectEditableItemAttribute(dataSet)).toBe(true)
  })

  it("determines item and case editability", () => {
    const { content } = appState.document
    const dataSet = content!.createDataSet(getSnapshot(setupTestDataset().dataset)).sharedDataSet.dataSet
    dataSet.removeCases(dataSet.items.map(c => c.__id__))
    dataSet.addCases(testCases, { canonicalize: true })
    const editableAttribute = dataSet.addAttribute({ name: "__editable__" })
    // item0 and item4 are in case0
    const item0Id = dataSet.itemIds[0]
    const item4Id = dataSet.itemIds[4]
    // item1 and item5 are in case2
    const item1Id = dataSet.itemIds[1]
    const item5Id = dataSet.itemIds[5]
    // item3 is used to test a blank value in __editable__
    const item3Id = dataSet.itemIds[3]
    dataSet.setCaseValues([
      { __id__: item0Id, [editableAttribute.id]: "true" },
      { __id__: item1Id, [editableAttribute.id]: "true" },
      { __id__: item4Id, [editableAttribute.id]: "false" },
      { __id__: item5Id, [editableAttribute.id]: "true" }
    ])
    dataSet.validateCaseGroups()
    const collection2 = dataSet.getCollectionByName("collection2")!
    const case0Id = collection2.caseIds[0]
    const case2Id = collection2.caseIds[2]

    const checkItem = (itemId: string, answer: boolean) => {
      expect(isItemEditable(dataSet, itemId)).toBe(answer)
      expect(isCaseEditable(dataSet, itemId)).toBe(answer)
    }

    // All items and cases are editable with no controlling plugin
    checkItem(item0Id, true)
    checkItem(item4Id, true)
    checkItem(item1Id, true)
    checkItem(item5Id, true)
    checkItem(item3Id, true)
    expect(isCaseEditable(dataSet, case0Id)).toBe(true)
    expect(isCaseEditable(dataSet, case2Id)).toBe(true)

    // All items and cases are editable when respectEditableItemAttribute is undefined
    const tile = createDefaultTileOfType(kWebViewTileType)!
    content?.insertTileInDefaultRow(tile)
    const webView = tile.content as IWebViewModel
    dataSet.setManagingControllerId(tile.id)

    checkItem(item0Id, true)
    checkItem(item4Id, true)
    checkItem(item1Id, true)
    checkItem(item5Id, true)
    checkItem(item3Id, true)
    expect(isCaseEditable(dataSet, case0Id)).toBe(true)
    expect(isCaseEditable(dataSet, case2Id)).toBe(true)

    // Items and cases are conditionally editable when respectEditableItemAttribute is true
    webView.setRespectEditableItemAttribute(true)

    checkItem(item0Id, true)
    checkItem(item4Id, false)
    checkItem(item1Id, true)
    checkItem(item5Id, true)
    checkItem(item3Id, false)
    // A case is only editable when all of its items are editable
    expect(isCaseEditable(dataSet, case0Id)).toBe(false)
    expect(isCaseEditable(dataSet, case2Id)).toBe(true)
  })
})
