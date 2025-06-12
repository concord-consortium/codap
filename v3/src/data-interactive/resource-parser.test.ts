import { getSnapshot } from "mobx-state-tree"
import { kWebViewTileType } from "../components/web-view/web-view-defs"
import "../components/web-view/web-view-registration"
import { appState } from "../models/app-state"
import { SharedDataSet } from "../models/shared/shared-data-set"
import { getSharedModelManager } from "../models/tiles/tile-environment"
import { getGlobalValueManager } from "../models/global/global-value-manager"
import { toV2Id } from "../utilities/codap-utils"
import { setupTestDataset, testCases } from "../test/dataset-test-utils"
import { resolveResources } from "./resource-parser"

describe("DataInteractive ResourceParser", () => {
  const { content } = appState.document
  content?.createDataSet(getSnapshot(setupTestDataset().dataset))
  const dataset = content!.getFirstSharedModelByType(SharedDataSet)!.dataSet
  dataset.removeCases(dataset.items.map(c => c.__id__))
  dataset.addCases(testCases, { canonicalize: true })
  dataset.validateCases()
  const c1 = dataset.collections[0]
  const c2 = dataset.collections[1]
  const a1 = dataset.getAttributeByName("a1")!
  const a2 = dataset.getAttributeByName("a2")!
  const a3 = dataset.getAttributeByName("a3")!
  const tile = content!.createOrShowTile(kWebViewTileType)!
  const resolve = (resource: string) => resolveResources(resource, "get", tile)

  it("finds dataContext", () => {
    expect(resolve("").dataContext?.id).toBe(dataset.id)
    expect(resolve("dataContext[data]").dataContext?.id).toBe(dataset.id)
    expect(resolve(`dataContext[${toV2Id(dataset.id)}]`).dataContext?.id).toBe(dataset.id)
    expect(resolve("dataContext[unknown]").dataContext).toBeUndefined()
    // finds dataContext by user-set title
    dataset.setTitle("NewTitle")
    expect(resolve("dataContext[NewTitle]").dataContext?.id).toBe(dataset.id)
  })

  it("finds components", () => {
    expect(resolve(`component[Web Page]`).component?.id).toBe(tile.id)
    expect(resolve(`component[${toV2Id(tile.id)}]`).component?.id).toBe(tile.id)
    expect(resolve("component[unknown]").component).toBeUndefined()
  })

  it("finds globals", () => {
    const globalManager = getGlobalValueManager(getSharedModelManager(appState.document))
    const globalSnapshot = { name: "global1", value: 0 }
    const global = globalManager!.addValueSnapshot(globalSnapshot)

    expect(resolve(`global[${toV2Id(global.id)}]`).global?.id).toBe(global.id)
    expect(resolve(`global[${global.name}]`).global?.id).toBe(global.id)
    expect(resolve("global[unknown]").global).toBeUndefined()
  })

  it("finds dataContextList", () => {
    const { dataContextList } = resolve("dataContextList")
    expect(dataContextList?.length).toBe(1)
    expect(dataContextList?.[0].id).toBe(dataset.id)
  })

  it("finds collectionList", () => {
    const { collectionList } = resolve("dataContext[data].collectionList")
    expect(collectionList?.length).toBe(3)
    expect(collectionList?.[0].id).toBe(dataset.collections[0].id)
    expect(collectionList?.[2].id).toBe(dataset.collections[2].id)
  })

  it("finds collection", () => {
    expect(resolve(`dataContext[data].collection[${c1.name}]`).collection?.id).toBe(c1.id)
    expect(resolve(`dataContext[data].collection[${toV2Id(c2.id)}]`).collection?.id).toBe(c2.id)
  })

  it("finds attribute", () => {
    expect(resolve(`dataContext[data].attribute[${a1.name}]`).attribute?.id).toBe(a1.id)
    expect(resolve(`dataContext[data].attribute[${toV2Id(a2.id)}]`).attribute?.id).toBe(a2.id)
  })

  it("finds attributeLocation", () => {
    expect(resolve(`dataContext[data].attributeLocation[${a3.name}]`).attributeLocation?.id).toBe(a3.id)
    expect(resolve(`dataContext[data].attributeLocation[${toV2Id(a1.id)}]`).attributeLocation?.id).toBe(a1.id)
  })

  it("finds attributeList", () => {
    const resources = resolve("dataContext[data].collection[collection1].attributeList")
    expect(resources.attributeList?.length).toBe(1)
    expect(resources.attributeList?.[0].name).toBe("a1")
  })

  it("finds caseByID", () => {
    expect(resolve(`dataContext[data].caseByID[unknown]`).caseByID).toBeUndefined()

    const itemId = dataset.getItemAtIndex(0)!.__id__
    const _caseId = dataset.getItemChildCaseId(itemId)!
    expect(resolve(`dataContext[data].caseByID[${toV2Id(_caseId)}]`).caseByID?.__id__).toBe(_caseId)

    const caseId = Array.from(dataset.caseInfoMap.values())[0].groupedCase.__id__
    expect(resolve(`dataContext[data].caseByID[${toV2Id(caseId)}]`).caseByID?.__id__).toBe(caseId)
  })

  it("finds caseByIndex", () => {
    const collectionId = toV2Id(dataset.collections[0].id)
    expect(resolve(`dataContext[data].collection[${collectionId}].caseByIndex[-1]`).caseByIndex).toBeUndefined()
    expect(resolve(`dataContext[data].collection[unknown].caseByIndex[0]`).caseByIndex).toBeUndefined()

    const itemId = dataset.getItemAtIndex(0)!.__id__
    const childCollectionId = toV2Id(dataset.childCollection.id)
    const _caseId = dataset.getItemChildCaseId(itemId)
    expect(resolve(`dataContext[data].collection[${childCollectionId}].caseByIndex[0]`).caseByIndex?.__id__)
      .toBe(_caseId)

    const caseId = Array.from(dataset.caseInfoMap.values())[0].groupedCase.__id__
    expect(resolve(`dataContext[data].collection[${collectionId}].caseByIndex[0]`).caseByIndex?.__id__).toBe(caseId)
  })

  it("finds caseSearch", () => {
    expect(resolve(`dataContext[data].caseSearch[a1==a]`).caseSearch).toBeUndefined()
    expect(resolve(`dataContext[data].collection[collection2].caseSearch`).caseSearch).toBeUndefined()
    expect(resolve(`dataContext[data].collection[collection2].caseSearch[]`).caseSearch).toBeUndefined()
    expect(resolve(`dataContext[data].collection[collection2].caseSearch[bad search]`).caseSearch).toBeUndefined()
    expect(resolve(`dataContext[data].collection[collection2].caseSearch[>a2]`).caseSearch).toBeUndefined()
    expect(resolve(`dataContext[data].collection[collection2].caseSearch[1!=2]`).caseSearch).toBeUndefined()
    expect(resolve(`dataContext[data].collection[collection2].caseSearch[a1==a]`).caseSearch).toBeUndefined()

    const allResult = resolve(`dataContext[data].collection[collection2].caseSearch[*]`)
    expect(allResult.caseSearch?.length).toBe(c2.cases.length)

    const a1Result = resolve(`dataContext[data].collection[collection1].caseSearch[a1==a]`)
    expect(a1Result.caseSearch?.length).toBe(1)

    const a2Result = resolve(`dataContext[data].collection[collection2].caseSearch[ x < a2 ]`)
    expect(a2Result.caseSearch?.length).toBe(3)

    const a3Result = resolve(`dataContext[data].collection[${dataset.childCollection.name}].caseSearch[a3>=2]`)
    expect(a3Result.caseSearch?.length).toBe(5)
  })

  it("finds caseFormulaSearch", () => {
    expect(resolve(`dataContext[data].collection[collection2].caseFormulaSearch`).caseFormulaSearch).toBeUndefined()
    expect(resolve(`dataContext[data].collection[collection2].caseFormulaSearch[]`).caseFormulaSearch).toBeUndefined()
    expect(resolve(`dataContext[data].collection[collection2].caseFormulaSearch[bad formula]`).error).toBeDefined()
    expect(resolve(`dataContext[data].collection[collection2].caseFormulaSearch[>a2]`).error).toBeDefined()

    const allResult = resolve(`dataContext[data].collection[collection2].caseFormulaSearch[true]`)
    expect(allResult.caseFormulaSearch?.length).toBe(c2.cases.length)

    const a11Result = resolve(`dataContext[data].collection[collection1].caseFormulaSearch[a1="a"]`)
    expect(a11Result.caseFormulaSearch?.length).toBe(1)
    const a21Result = resolve(`dataContext[data].collection[collection2].caseFormulaSearch[a1="a"]`)
    expect(a21Result.caseFormulaSearch?.length).toBe(2)
    const a31Result = resolve(`dataContext[data].collection[collection3].caseFormulaSearch[a1="a"]`)
    expect(a31Result.caseFormulaSearch?.length).toBe(3)

    const a12Result = resolve(`dataContext[data].collection[collection1].caseFormulaSearch[ a2 = "z" ]`)
    // Can only check attributes in the collection or a parent collection
    expect(a12Result.caseFormulaSearch?.length).toBe(0)
    const a22Result = resolve(`dataContext[data].collection[collection2].caseFormulaSearch[ a2 = "z" ]`)
    expect(a22Result.caseFormulaSearch?.length).toBe(2)
    const a32Result = resolve(`dataContext[data].collection[collection3].caseFormulaSearch[ a2 = "z" ]`)
    expect(a32Result.caseFormulaSearch?.length).toBe(2)

    const a33Result = resolve(`dataContext[data].collection[collection3].caseFormulaSearch[a3>2]`)
    expect(a33Result.caseFormulaSearch?.length).toBe(4)
  })

  it("finds item", () => {
    expect(resolve(`dataContext[data].item`).item).toBeUndefined()
    expect(resolve(`dataContext[data].item[-1]`).item).toBeUndefined()
    expect(resolve(`dataContext[data].item[100]`).item).toBeUndefined()
    expect(resolve(`dataContext[data].item[word]`).item).toBeUndefined()

    const item = dataset.getItemAtIndex(0)
    expect(resolve(`dataContext[data].item[0]`).item?.__id__).toBe(item?.__id__)
  })

  it("finds itemByID", () => {
    expect(resolve(`dataContext[data].itemByID[unknown]`).itemByID).toBeUndefined()

    const itemId = dataset.getItemAtIndex(0)!.__id__
    expect(resolve(`dataContext[data].itemByID[${toV2Id(itemId)}]`).itemByID?.__id__).toBe(itemId)
  })

  it("finds itemSearch", () => {
    expect(resolve(`dataContext[data].itemSearch`).itemSearch).toBeUndefined()
    expect(resolve(`dataContext[data].itemSearch[]`).itemSearch).toBeUndefined()
    expect(resolve(`dataContext[data].itemSearch[bad search]`).itemSearch).toBeUndefined()
    expect(resolve(`dataContext[data].itemSearch[>a1]`).itemSearch).toBeUndefined()
    expect(resolve(`dataContext[data].itemSearch[!=2]`).itemSearch).toBeUndefined()

    const allResult = resolve(`dataContext[data].itemSearch[*]`)
    expect(allResult.itemSearch?.length).toBe(dataset.items.length)

    const a1Result = resolve(`dataContext[data].itemSearch[a1==a]`)
    expect(a1Result.itemSearch?.length).toBe(3)

    const a2Result = resolve(`dataContext[data].itemSearch[ x < a2 ]`)
    expect(a2Result.itemSearch?.length).toBe(4)

    const emptyResult = resolve(`dataContext[data].itemSearch[a3==]`)
    expect(emptyResult.itemSearch?.length).toBe(0)
  })

  it("finds itemByCaseID", () => {
    expect(resolve(`dataContext[data].itemByCaseID[unknown]`).itemByCaseID).toBeUndefined()

    const caseId = Array.from(dataset.caseInfoMap.values())[0].groupedCase.__id__
    const itemId = dataset.getItemAtIndex(0)!.__id__
    expect(resolve(`dataContext[data].itemByCaseID[${toV2Id(caseId)}]`).itemByCaseID?.__id__).toBe(itemId)
  })
})
