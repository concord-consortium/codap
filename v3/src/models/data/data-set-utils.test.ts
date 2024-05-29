import { IAttribute } from "./attribute"
import { ICollectionModel } from "./collection"
import { DataSet, IDataSet } from "./data-set"
import { getCollectionAttrs } from "./data-set-utils"

describe("DataSetUtils", () => {
  it("getCollectionAttrs works as expected", () => {
    function names(attrs: IAttribute[]) {
      return attrs.map(({ name }) => name)
    }
    function getCollectionAttrNames(_collection: ICollectionModel, _data?: IDataSet) {
      return names(getCollectionAttrs(_collection, _data))
    }
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
})
