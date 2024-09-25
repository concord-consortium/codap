import { IAttributeSnapshot } from "./attribute"
import { ICollectionModelSnapshot } from "./collection"
import { DataSet } from "./data-set"
import {
  IHiddenItemIdsDataSetSnap, IInitialItemsDataSetSnap, IOriginalDataSetSnap, IPreItemsDataSetSnap, ITempDataSetSnap
} from "./data-set-conversion"

const kUngroupedCollectionName = "Collection Formerly Known As Ungrouped"

describe("DataSet conversions", () => {
  test("DataSet original flat snapshot conversion", () => {
    const ungrouped: ICollectionModelSnapshot = { name: kUngroupedCollectionName }
    const attributes: IAttributeSnapshot[] = [
      { name: "a1" },
      { name: "a2" },
      { name: "a3" }
    ]
    const data = DataSet.create({
      name: "Data",
      collections: [],
      ungrouped,
      attributes,
      cases: []
    } as IOriginalDataSetSnap)
    expect(data.collections.length).toBe(1)
    expect(data.childCollection.name).toBe(kUngroupedCollectionName)
    expect(data.attributesMap.size).toBe(3)
    expect(data.attributes.length).toBe(3)
  })

  test("DataSet original hierarchical snapshot conversion", () => {
    const ungrouped: ICollectionModelSnapshot = { name: kUngroupedCollectionName }
    const attributes: IAttributeSnapshot[] = [
      { id: "a1Id", name: "a1" },
      { id: "a2Id", name: "a2" },
      { id: "a3Id", name: "a3" }
    ]
    const collections: ICollectionModelSnapshot[] = [
      { name: "Collection1", attributes: ["a1Id"] }
    ]
    const data = DataSet.create({
      name: "Data",
      collections,
      ungrouped,
      attributes,
      cases: []
    } as IOriginalDataSetSnap)
    expect(data.collections.length).toBe(2)
    expect(data.collections[0].attributes.length).toBe(1)
    expect(data.childCollection.name).toBe(kUngroupedCollectionName)
    expect(data.childCollection.attributes.length).toBe(2)
    expect(data.attributesMap.size).toBe(3)
    expect(data.attributes.length).toBe(3)
  })

  test("DataSet temporary flat snapshot conversion", () => {
    const attributes: string[] = ["a1Id", "a2Id", "a3Id"]
    const data = DataSet.create({
      name: "Data",
      collections: [],
      ungrouped: { name: kUngroupedCollectionName },
      attributesMap: {
        a1Id: { id: "a1Id", name: "a1" },
        a2Id: { id: "a2Id", name: "a2" },
        a3Id: { id: "a3Id", name: "a3" }
      },
      attributes,
      cases: []
    } as ITempDataSetSnap)
    expect(data.attributesMap.size).toBe(3)
    expect(data.attributes.length).toBe(3)
  })

  test("DataSet pre-items flat snapshot conversion", () => {
    const data = DataSet.create({
      name: "Data",
      collections: [{
        name: "Cases",
        attributes: ["a1Id", "a2Id", "a3Id"]
      }],
      attributesMap: {
        a1Id: { id: "a1Id", name: "a1", values: ["a1-0"] },
        a2Id: { id: "a2Id", name: "a2", values: ["a2-0"] },
        a3Id: { id: "a3Id", name: "a3", values: ["a3-0"] }
      },
      cases: [{ __id__: "CASE0" }]
    } as IPreItemsDataSetSnap)
    expect(data.attributesMap.size).toBe(3)
    expect(data.attributes.length).toBe(3)
    expect(data.itemIds.length).toBe(1)
  })

  test("DataSet initial items flat snapshot conversion", () => {
    const data = DataSet.create({
      name: "Data",
      collections: [{
        name: "Cases",
        attributes: ["a1Id", "a2Id", "a3Id"]
      }],
      attributesMap: {
        a1Id: { id: "a1Id", name: "a1", values: ["a1-0"] },
        a2Id: { id: "a2Id", name: "a2", values: ["a2-0"] },
        a3Id: { id: "a3Id", name: "a3", values: ["a3-0"] }
      },
      itemIds: ["ITEM0"]
    } as IInitialItemsDataSetSnap)
    expect(data.attributesMap.size).toBe(3)
    expect(data.attributes.length).toBe(3)
    expect(data._itemIds.length).toBe(1)
    expect(data.itemIds.length).toBe(1)
  })

  test("DataSet hiddenItemIds flat snapshot conversion", () => {
    const data = DataSet.create({
      name: "Data",
      collections: [{
        name: "Cases",
        attributes: ["a1Id", "a2Id", "a3Id"]
      }],
      attributesMap: {
        a1Id: { id: "a1Id", name: "a1", values: ["a1-0"] },
        a2Id: { id: "a2Id", name: "a2", values: ["a2-0"] },
        a3Id: { id: "a3Id", name: "a3", values: ["a3-0"] }
      },
      _itemIds: ["ITEM0"],
      hiddenItemIds: ["ITEM0"]
    } as IHiddenItemIdsDataSetSnap)
    expect(data.attributesMap.size).toBe(3)
    expect(data.attributes.length).toBe(3)
    expect(data._itemIds.length).toBe(1)
    expect(data.itemIds.length).toBe(1)
    expect(data.setAsideItemIds.length).toBe(1)
  })
})
