import { IAttribute } from "./attribute"
import { CollectionModel, ICollectionPropsModel } from "./collection"
import { DataSet, IDataSet } from "./data-set"
import { getCollectionAttrs } from "./data-set-utils"

describe("DataSetUtils", () => {
  it("getCollectionAttrs works as expected", () => {
    function names(attrs: IAttribute[]) {
      return attrs.map(({ name }) => name)
    }
    function getCollectionAttrNames(_collection: ICollectionPropsModel, _data?: IDataSet) {
      return names(getCollectionAttrs(_collection, _data))
    }
    const data = DataSet.create()
    const collection = CollectionModel.create({ id: "cId" })
    data.addCollection(collection)
    data.addAttribute({ id: "aId", name: "a" })
    data.addAttribute({ id: "bId", name: "b" })
    expect(getCollectionAttrNames(collection, data)).toEqual([])
    expect(getCollectionAttrNames(data.ungrouped, data)).toEqual(["a", "b"])

    data.setCollectionForAttribute("aId", { collection: "cId" })
    expect(getCollectionAttrNames(collection, data)).toEqual(["a"])
    expect(getCollectionAttrNames(data.ungrouped, data)).toEqual(["b"])

    // Moving the last attribute out of the ungrouped collection will cause the collection
    // to be destroyed and the attributes to return to being ungrouped.
    data.setCollectionForAttribute("bId", { collection: "cId" })
    jestSpyConsole("warn", spy => {
      expect(getCollectionAttrNames(collection, data)).toEqual([])
      expect(spy).toHaveBeenCalledTimes(1)
    })
    expect(getCollectionAttrNames(data.ungrouped, data)).toEqual(["a", "b"])
  })
})
