import { CodapV2ColorMap, ICodapV2CategoryMap } from "../../v2/codap-v2-data-context-types"
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

  describe("point shapes", () => {
    const makeAttribute = () => Attribute.create({
      id: "aId", name: "a", values: ["land", "water", "land"]
    })

    it("imports assigned shapes", () => {
      const result = importV2CategorySet(makeAttribute(), undefined, { land: "star", water: "diamond" })
      expect(result?.shapes).toEqual({ land: "star", water: "diamond" })
    })

    it("creates a category set when shapes are the only thing to restore", () => {
      // no colors and no order, so nothing else would justify a category set
      const result = importV2CategorySet(makeAttribute(), undefined, { land: "star" })
      expect(result).toBeDefined()
      expect(result?.shapes).toEqual({ land: "star" })
    })

    it("returns nothing when there is no shape, color or move to restore", () => {
      expect(importV2CategorySet(makeAttribute(), undefined, {})).toBeUndefined()
      expect(importV2CategorySet(makeAttribute(), undefined, undefined)).toBeUndefined()
    })

    it("drops the default, which is stored as absence", () => {
      const result = importV2CategorySet(makeAttribute(), undefined, { land: "circle", water: "star" })
      expect(result?.shapes).toEqual({ water: "star" })
    })

    it("drops a shape this build does not recognize", () => {
      // a document written by a newer build must not inject an unknown value into the model
      const result = importV2CategorySet(makeAttribute(), undefined, { land: "hexagon", water: "star" })
      expect(result?.shapes).toEqual({ water: "star" })
    })

    it("keeps a shape for a category not currently in the data", () => {
      /*
       * Deliberate, and deliberately unlike colors: every shape entry is a user assignment, so
       * there is no auto-generated noise to age out. A category whose cases are deleted and later
       * restored -- a sampler re-run, say -- gets the shape its user chose back. v2 keeps its own
       * assignments for absent categories for the same reason.
       */
      const result = importV2CategorySet(makeAttribute(), undefined, { land: "star", lava: "plus" })
      expect(result?.shapes).toEqual({ land: "star", lava: "plus" })
    })
  })

})
