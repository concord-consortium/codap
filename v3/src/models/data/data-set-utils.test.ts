import { IAttribute } from "./attribute"
import { ICollectionModel } from "./collection"
import { DataSet, IDataSet } from "./data-set"
import { getCollectionAttrs, moveAttribute } from "./data-set-utils"

import "../history/register-app-history-service"

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
    const data = DataSet.create()
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
})
