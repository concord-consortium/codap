import { createCodapDocument } from "../models/codap/create-codap-document"
import { createDataSet } from "../models/data/data-set-conversion"
import { serializeCodapV2Document } from "../models/document/serialize-document"
import { kSharedDataSetType, SharedDataSet } from "../models/shared/shared-data-set"
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
