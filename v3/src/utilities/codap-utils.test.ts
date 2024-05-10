import { types } from "mobx-state-tree"
import {
  kAttrIdPrefix, kCaseIdPrefix, kCollectionIdPrefix, kDataSetIdPrefix, kGlobalIdPrefix,
  toV2Id, toV3AttrId, toV3CaseId, toV3CollectionId, toV3DataSetId, toV3GlobalId, toV3Id, typeV3Id, v3Id
} from "./codap-utils"

const kPrefix = "PFIX"

describe("codap-utils", () => {
  it("toV3Id generates strings ids with a prefix and a numeric value and converts them appropriately", () => {
    for (let i = 0; i < 10; ++i) {
      const id = v3Id(kPrefix)
      expect(id.startsWith(kPrefix)).toBe(true)
      const idNum = toV2Id(id)
      expect(`${kPrefix}${idNum}`).toBe(id)
      expect(toV3Id(kPrefix, idNum)).toBe(id)
      expect(toV3Id(kPrefix, `${idNum}`)).toBe(id)
    }
  })

  it("provides prefix-specific conversion functions", () => {
    expect(toV3AttrId(1234)).toBe(`${kAttrIdPrefix}1234`)
    expect(toV3CaseId(1234)).toBe(`${kCaseIdPrefix}1234`)
    expect(toV3CollectionId(1234)).toBe(`${kCollectionIdPrefix}1234`)
    expect(toV3DataSetId(1234)).toBe(`${kDataSetIdPrefix}1234`)
    expect(toV3GlobalId(1234)).toBe(`${kGlobalIdPrefix}1234`)
  })

  it("toV3Id converts v2 ids to v3 ids appropriately", () => {
    expect(toV3Id(kPrefix, 1234)).toBe(`${kPrefix}1234`)
    expect(toV3Id(kPrefix, "1234")).toBe(`${kPrefix}1234`)
    expect(toV3Id(kPrefix, `${kPrefix}1234`)).toBe(`${kPrefix}1234`)
  })

  it("toV2Id converts v3 ids to v2 numeric format appropriately", () => {
    expect(toV2Id(`${kPrefix}1234`)).toBe(1234)
    expect(toV2Id(`1234`)).toBe(1234)
    expect(toV2Id(kPrefix)).toBe(NaN)
  })

  it("typeV3Id can be used for an MST property", () => {
    const Model = types.model("Model", {
      id: typeV3Id(kPrefix)
    })

    const m = Model.create()
    expect(m.id.startsWith(kPrefix)).toBe(true)
  })
})
