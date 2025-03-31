import { CodapV2ColorMap, ICodapV2CategoryMap } from "../../v2/codap-v2-data-set-types"
import { Attribute } from "./attribute"
import { importV2CategorySet } from "./v2-category-set-importer"

function createCategoryMap(order: string[], colorMap: CodapV2ColorMap): ICodapV2CategoryMap {
  return {
    ...colorMap,
    __order: order
  } as ICodapV2CategoryMap
}

describe("importV2CategorySet", () => {
  it("works with Age_Group attribute from roller coasters", () => {
    const attribute = Attribute.create({
      id: "age_group",
      name: "Age_Group",
      values: ["newest", "newest", "newest", "older", "older", "older", "recent", "recent", "recent"],
    })
    const _categoryMap = createCategoryMap(
      ["older", "recent", "newest"],
      {
        "older": "#FFB300",
        "recent": "#803E75",
        "newest": "#FF6800"
      }
    )
    const result = importV2CategorySet(attribute, _categoryMap)
    expect(result?.moves).toEqual([
      {
        "value": "newest",
        "fromIndex": 0,
        "toIndex": 2,
        "length": 3,
        "after": "recent"
      }
    ])
  })

  it("handles disjoint values", () => {
    const attribute = Attribute.create({
      id: "disjoint",
      name: "Disjoint",
      values: ["a", "b", "c", "d", "e"]
    })
    const _categoryMap = createCategoryMap(
      ["f", "e", "d", "c", "b"],
      {
        "a": "#FFB300",
        "b": "#803E75",
        "c": "#FF6800",
        "d": "#5D69B1",
        "e": "#F6BF00",
        "f": "#F15A24"
      }
    )
    const result = importV2CategorySet(attribute, _categoryMap)
    expect(result?.moves).toEqual([
      { value: "c", fromIndex: 1, toIndex: 0, before: "b", length: 4 },
      { value: "d", fromIndex: 2, toIndex: 0, before: "c", length: 4 },
      { value: "e", fromIndex: 3, toIndex: 0, before: "d", length: 4 }
    ])
  })
})
