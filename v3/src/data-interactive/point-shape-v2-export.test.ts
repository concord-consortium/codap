import { createCodapDocument } from "../models/codap/create-codap-document"
import { DataBroker } from "../models/data/data-broker"
import { DataSet } from "../models/data/data-set"
import { getMetadataFromDataSet } from "../models/shared/shared-data-utils"
import { getSharedModelManager } from "../models/tiles/tile-environment"
import { convertAttributeToV2 } from "./data-interactive-type-utils"

/*
 * Point shapes are exported in the attribute's v3 namespace rather than in _categoryMap.
 *
 * That is a hard constraint, not a preference. V2's updateCategoryMap (attribute_model.js) treats
 * every key of _categoryMap except __order, stroke-color and stroke-transparency as a category:
 * it appends unknown keys to __order and writes the result back out. A shapes key placed there
 * would show up as a phantom category in the user's legend and be persisted by a v2 re-save.
 */
describe("point shape v2 export", () => {
  let dataSet: ReturnType<typeof DataSet.create>

  beforeEach(() => {
    const doc = createCodapDocument()
    const sharedModelManager = getSharedModelManager(doc)!
    const dataBroker = new DataBroker({ sharedModelManager })
    dataSet = DataSet.create({ collections: [{ name: "Cases" }] })
    const attr = dataSet.addAttribute({ name: "a" })
    dataSet.addCases([{ [attr.id]: "land" }, { [attr.id]: "water" }])
    dataBroker.addDataSet(dataSet)
  })

  const categorySet = () => getMetadataFromDataSet(dataSet)!.getCategorySet(dataSet.attributes[0].id)!

  it("writes nothing when no category carries a shape", () => {
    categorySet().setColorForCategory("land", "#ff0000")
    const v2Attr = convertAttributeToV2(dataSet.attributes[0], dataSet)

    // no v3 namespace at all, so documents that never used the feature are unchanged
    expect(v2Attr.v3).toBeUndefined()
  })

  it("writes assigned shapes into the attribute's v3 namespace", () => {
    categorySet().setShapeForCategory("land", "star")
    categorySet().setShapeForCategory("water", "diamond")
    const v2Attr = convertAttributeToV2(dataSet.attributes[0], dataSet)

    expect(v2Attr.v3?.categoryShapes).toEqual({ land: "star", water: "diamond" })
  })

  it("keeps shapes out of _categoryMap, which v2 would read as categories", () => {
    categorySet().setColorForCategory("land", "#ff0000")
    categorySet().setShapeForCategory("land", "star")
    const v2Attr = convertAttributeToV2(dataSet.attributes[0], dataSet)

    const categoryMap = v2Attr._categoryMap as Record<string, unknown>
    expect(categoryMap).toBeDefined()

    // No shape-bearing key of any name may appear in the category map.
    expect(categoryMap.__shapes).toBeUndefined()
    expect(categoryMap.shapes).toBeUndefined()
    expect(categoryMap.categoryShapes).toBeUndefined()

    // Every key is either a real category or one of the three v2 tolerates.
    const v2Ignorable = ["__order", "stroke-color", "stroke-transparency"]
    const realCategories = categorySet().valuesArray
    const v2NumericColorKeys = ["attribute-color", "low-attribute-color", "high-attribute-color"]
    Object.keys(categoryMap).forEach(key => {
      const isKnown = v2Ignorable.includes(key) || realCategories.includes(key) ||
                        v2NumericColorKeys.includes(key)
      expect({ key, isKnown }).toEqual({ key, isKnown: true })
    })

    // and the shape did not leak into __order, which is what v2 would corrupt
    expect(categoryMap.__order).toEqual(realCategories)
  })

  it("omits categories left at the default so the export stays minimal", () => {
    categorySet().setShapeForCategory("land", "star")
    const v2Attr = convertAttributeToV2(dataSet.attributes[0], dataSet)

    expect(v2Attr.v3?.categoryShapes).toEqual({ land: "star" })
    expect(v2Attr.v3?.categoryShapes?.water).toBeUndefined()
  })
})
