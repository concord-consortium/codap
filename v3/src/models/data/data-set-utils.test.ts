import { setupTestDataset } from "../../test/dataset-test-utils"
import { AppHistoryService } from "../history/app-history-service"
import { IAttribute } from "./attribute"
import { ICollectionModel } from "./collection"
import { DataSet, IDataSet } from "./data-set"
import { getCollectionAttrs, getNextCase, getPreviousCase, moveAttribute } from "./data-set-utils"

function names(attrs: IAttribute[]) {
  return attrs.map(({ name }) => name)
}
function getCollectionAttrNames(_collection: ICollectionModel, _data?: IDataSet) {
  return names(getCollectionAttrs(_collection, _data))
}

describe("DataSetUtils", () => {
  it("getCollectionAttrs works as expected", () => {
    const data = DataSet.create()
    const origChildCollectionId = data.childCollection.id
    const collection = data.addCollection({ id: "cId" })
    data.addAttribute({ id: "aId", name: "a" })
    data.addAttribute({ id: "bId", name: "b" })
    expect(getCollectionAttrNames(collection, data)).toEqual([])
    expect(getCollectionAttrNames(data.childCollection, data)).toEqual(["a", "b"])

    data.moveAttribute("aId", { collection: "cId" })
    expect(getCollectionAttrNames(collection, data)).toEqual(["a"])
    expect(getCollectionAttrNames(data.childCollection, data)).toEqual(["b"])

    // Moving the last attribute out of the child collection will cause it
    // to be destroyed and the parent collection to become the child collection.
    data.moveAttribute("bId", { collection: "cId" })
    expect(data.childCollection).toBe(collection)
    expect(data.getCollection(origChildCollectionId)).toBeUndefined()
    expect(getCollectionAttrNames(data.childCollection, data)).toEqual(["a", "b"])
  })

  it("moveAttribute works as expected", () => {
    const data = DataSet.create(undefined, {historyService: new AppHistoryService()})
    const parentCollection = data.addCollection({ id: "parentColl" })
    data.addAttribute({ id: "aAttr", name: "a" })
    data.addAttribute({ id: "bAttr", name: "b" })
    expect(getCollectionAttrNames(parentCollection, data)).toEqual([])
    expect(getCollectionAttrNames(data.childCollection, data)).toEqual(["a", "b"])

    moveAttribute({ attrId: "aAttr", afterAttrId: "bAttr", dataset: data, targetCollection: data.childCollection })
    expect(getCollectionAttrNames(data.childCollection)).toEqual(["b", "a"])

    moveAttribute({ attrId: "aAttr", dataset: data, targetCollection: data.childCollection })
    expect(getCollectionAttrNames(data.childCollection)).toEqual(["a", "b"])

    // move attribute before itself
    moveAttribute({ attrId: "aAttr", dataset: data, targetCollection: data.childCollection })
    expect(getCollectionAttrNames(data.childCollection)).toEqual(["a", "b"])

    // move attribute after itself
    moveAttribute({ attrId: "aAttr", afterAttrId: "aAttr", dataset: data, targetCollection: data.childCollection })
    expect(getCollectionAttrNames(data.childCollection)).toEqual(["a", "b"])

    // move attribute to parent collection
    moveAttribute({ attrId: "aAttr", dataset: data, targetCollection: parentCollection })
    expect(getCollectionAttrNames(parentCollection)).toEqual(["a"])
    expect(getCollectionAttrNames(data.childCollection)).toEqual(["b"])

    // move last child attribute to parent collection
    moveAttribute({ attrId: "bAttr", dataset: data, targetCollection: parentCollection })
    expect(getCollectionAttrNames(parentCollection)).toEqual(["b", "a"])
    expect(data.collections.length).toBe(1)
  })

  it("getNextCase and getPreviousCase work as expected", () => {
    const { dataset, c2 } = setupTestDataset()
    const c2Case1 = c2.getCaseGroup(c2.caseIds[0])!.groupedCase
    const c2Case2 = c2.getCaseGroup(c2.caseIds[1])!.groupedCase
    const c2Case3 = c2.getCaseGroup(c2.caseIds[2])!.groupedCase
    const c2CaseLast = c2.getCaseGroup(c2.caseIds[c2.caseIds.length - 1])!.groupedCase
    const c3 = dataset.childCollection
    const c3Case1 = c3.getCaseGroup(c3.caseIds[0])!.groupedCase
    const c3Case2 = c3.getCaseGroup(c3.caseIds[1])!.groupedCase
    const c3Case5 = c3.getCaseGroup(c3.caseIds[4])!.groupedCase
    const c3CaseLast = c3.getCaseGroup(c3.caseIds[c3.caseIds.length - 1])!.groupedCase

    // Nothing selected, child collection
    expect(getNextCase(dataset, c3)).toBe(c3Case1)
    expect(getPreviousCase(dataset, c3)).toBe(c3CaseLast)

    // Nothing selected, parent collection
    expect(getNextCase(dataset, c2)).toBe(c2Case1)
    expect(getPreviousCase(dataset, c2)).toBe(c2CaseLast)

    // First child case selected, child collection
    dataset.setSelectedCases([c3Case1.__id__])
    expect(getNextCase(dataset, c3, c3Case1.__id__)).toBe(c3Case2)
    expect(getPreviousCase(dataset, c3, c3Case1.__id__)).toBeUndefined()

    // First child case selected, parent collection
    expect(getNextCase(dataset, c2, c2Case1.__id__)).toBe(c2Case2)
    expect(getPreviousCase(dataset, c2, c2Case1.__id__)).toBeUndefined()

    // Last child case selected, child collection
    dataset.setSelectedCases([c3CaseLast.__id__])
    expect(getNextCase(dataset, c3, c3CaseLast.__id__)).toBeUndefined()
    expect(getPreviousCase(dataset, c3, c3CaseLast.__id__)).toBe(c3Case5)

    // Last child case selected, parent collection
    expect(getNextCase(dataset, c2, c2CaseLast.__id__)).toBeUndefined()
    expect(getPreviousCase(dataset, c2, c2CaseLast.__id__)).toBe(c2Case3)

    // First parent case selected, child collection
    dataset.setSelectedCases([c2Case1.__id__])
    expect(getNextCase(dataset, c3)).toBe(c3Case1)
    expect(getPreviousCase(dataset, c3)).toBe(c3CaseLast)

    // First parent case selected, parent collection
    expect(getNextCase(dataset, c2, c2Case1.__id__)).toBe(c2Case2)
    expect(getPreviousCase(dataset, c2, c2Case1.__id__)).toBeUndefined()

    // Last parent case selected, child collection
    dataset.setSelectedCases([c2CaseLast.__id__])
    // The last parent case only has one child case
    expect(getNextCase(dataset, c3, c3CaseLast.__id__)).toBeUndefined()
    expect(getPreviousCase(dataset, c3, c3CaseLast.__id__)).toBe(c3Case5)

    // Last parent case selected, parent collection
    expect(getNextCase(dataset, c2, c2CaseLast.__id__)).toBeUndefined()
    expect(getPreviousCase(dataset, c2, c2CaseLast.__id__)).toBe(c2Case3)
  })
})
