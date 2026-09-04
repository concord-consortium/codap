import { createCodapDocument } from "../models/codap/create-codap-document"
import { DataBroker } from "../models/data/data-broker"
import { PointShape } from "../utilities/point-shape-utils"
import { createDataSet } from "../models/data/data-set-conversion"
import { serializeCodapV2Document } from "../models/document/serialize-document"
import { kSharedDataSetType, SharedDataSet } from "../models/shared/shared-data-set"
import { getMetadataFromDataSet } from "../models/shared/shared-data-utils"
import { getSharedModelManager } from "../models/tiles/tile-environment"
import { CodapV2Document } from "./codap-v2-document"
import { importV2Document } from "./import-v2-document"

// CODAP-1348: A Story Builder "moment" is a CODAP document serialized to v2 JSON; restoring
// a moment converts that JSON back to v3 via importV2Document (the data-bearing step of
// document-handler's asyncUpdate). This verifies the v2 save/import round-trip preserves raw
// (non-formula) attribute values -- so a blank restored formula column (e.g. NOAA Weather's
// `when`) is caused by the formula not being recomputed, not by the round-trip dropping the
// formula's input attributes.

describe("v2 document round-trip (CODAP-1348)", () => {
  it("preserves raw attribute values through a v2 save/import round-trip", async () => {
    // a document with a dataset: raw attr `x` with values + a formula attr `double`
    const document = createCodapDocument()
    const sharedModelManager = getSharedModelManager(document)!
    const data = createDataSet({
      attributes: [
        { name: "x" },
        { name: "double", formula: { display: "x * 2" } }
      ]
    })
    const xId = data.attrFromName("x")!.id
    data.addCases([{ __id__: "c1", [xId]: 3 }, { __id__: "c2", [xId]: 5 }])
    data.validateCases()
    const sharedDataSet = SharedDataSet.create()
    sharedDataSet.setDataSet(data)
    sharedModelManager.addSharedModel(sharedDataSet)

    // Save: serialize the document to v2 JSON (what Story Builder stores for a moment).
    const v2Json = await serializeCodapV2Document(document)

    // Restore: convert the v2 JSON back to a v3 document (the data-bearing step of
    // document-handler's asyncUpdate when a moment is restored).
    const v3Document = importV2Document(new CodapV2Document(v2Json))
    const restoredData = getSharedModelManager(v3Document)!
      .getSharedModelsByType<typeof SharedDataSet>(kSharedDataSetType)[0]?.dataSet
    expect(restoredData).toBeDefined()

    // the raw (non-formula) attribute values must survive the round-trip
    const xAttr = restoredData.attrFromName("x")
    expect(xAttr?.strValues).toEqual(["3", "5"])

    // the formula attribute's definition survives too (its values are recomputed, not stored)
    const doubleAttr = restoredData.attrFromName("double")
    expect(doubleAttr?.hasFormula).toBe(true)
    expect(doubleAttr?.formula?.display).toBe("x * 2")
  })
})

/*
 * Per-category point shapes travel in the attribute's v3 namespace, and the shape used when no
 * legend is assigned travels in the graph component's. This exercises the whole chain -- model to
 * v2 JSON and back -- rather than the export and import halves in isolation.
 */
describe("v2 document round-trip of point shapes", () => {
  async function roundTrip(document: ReturnType<typeof createCodapDocument>) {
    const v2Json = await serializeCodapV2Document(document)
    const v3Document = importV2Document(new CodapV2Document(v2Json))
    const restoredData = getSharedModelManager(v3Document)!
      .getSharedModelsByType<typeof SharedDataSet>(kSharedDataSetType)[0]?.dataSet
    return { v2Json, v3Document, restoredData }
  }

  function documentWithCategories() {
    const document = createCodapDocument()
    const sharedModelManager = getSharedModelManager(document)!
    // DataBroker rather than a bare SharedDataSet, so the dataset gets its DataSetMetadata --
    // that is where category sets, and therefore shapes, live.
    const dataBroker = new DataBroker({ sharedModelManager })
    const data = createDataSet({ attributes: [{ name: "habitat" }] })
    const attrId = data.attrFromName("habitat")!.id
    data.addCases([
      { __id__: "c1", [attrId]: "land" },
      { __id__: "c2", [attrId]: "water" },
      { __id__: "c3", [attrId]: "both" }
    ])
    data.validateCases()
    dataBroker.addDataSet(data)
    return { document, data, attrId }
  }

  it("preserves per-category shapes", async () => {
    const { document, data, attrId } = documentWithCategories()
    const shapeFor = (cat: string, shape: PointShape) =>
      getMetadataFromDataSet(data)!.getCategorySet(attrId)!.setShapeForCategory(cat, shape)
    shapeFor("land", "star")
    shapeFor("water", "diamond")

    const { restoredData } = await roundTrip(document)
    const restoredAttr = restoredData.attrFromName("habitat")!
    const restoredSet = getMetadataFromDataSet(restoredData)!.getCategorySet(restoredAttr.id)!

    expect(restoredSet.shapeForCategory("land")).toBe("star")
    expect(restoredSet.shapeForCategory("water")).toBe("diamond")
    // a category left at the default comes back at the default
    expect(restoredSet.shapeForCategory("both")).toBe("circle")
  })

  it("preserves shapes alongside colors without either disturbing the other", async () => {
    const { document, data, attrId } = documentWithCategories()
    // re-read between mutations: the first one promotes the provisional set, replacing the instance
    getMetadataFromDataSet(data)!.getCategorySet(attrId)!.setColorForCategory("land", "#123456")
    getMetadataFromDataSet(data)!.getCategorySet(attrId)!.setShapeForCategory("land", "plus")

    const { restoredData } = await roundTrip(document)
    const restoredAttr = restoredData.attrFromName("habitat")!
    const restoredSet = getMetadataFromDataSet(restoredData)!.getCategorySet(restoredAttr.id)!

    expect(restoredSet.colorForCategory("land")).toBe("#123456")
    expect(restoredSet.shapeForCategory("land")).toBe("plus")
  })

  it("adds nothing to the v2 JSON when no shape is assigned", async () => {
    const { document, data, attrId } = documentWithCategories()
    getMetadataFromDataSet(data)!.getCategorySet(attrId)!.setColorForCategory("land", "#123456")

    const { v2Json } = await roundTrip(document)
    // documents that never used the feature are byte-for-byte unaffected by it
    expect(JSON.stringify(v2Json)).not.toContain("categoryShapes")
  })

  it("keeps shapes out of _categoryMap, which v2 reads as categories", async () => {
    const { document, data, attrId } = documentWithCategories()
    getMetadataFromDataSet(data)!.getCategorySet(attrId)!.setColorForCategory("land", "#123456")
    getMetadataFromDataSet(data)!.getCategorySet(attrId)!.setShapeForCategory("land", "star")

    const { v2Json } = await roundTrip(document)
    const v2Attr = (v2Json.contexts?.[0] as any)?.collections?.[0]?.attrs?.[0]
    expect(v2Attr).toBeDefined()
    expect(v2Attr.v3?.categoryShapes).toEqual({ land: "star" })

    // v2 appends any unrecognized _categoryMap key to __order and saves it back, so a shape
    // there would surface as a phantom category in the user's legend
    expect(JSON.stringify(v2Attr._categoryMap)).not.toContain("star")
    expect(v2Attr._categoryMap.__order).toEqual(["both", "land", "water"])
  })
})
