import { kCalculatorTileType, kV2CalculatorDGType } from "../components/calculator/calculator-defs"
import { createCodapDocument } from "../models/codap/create-codap-document"
import { exportV2Document } from "./export-v2-document"
import "../components/calculator/calculator-registration"

jest.mock("../../build_number.json", () => ({
  buildNumber: 1234
}))

jest.mock("../../package.json", () => ({
  version: "3.0.0-test"
}))

describe("exportV2Document", () => {
  it("exports an empty document", () => {
    const doc = createCodapDocument()
    const output = exportV2Document(doc)
    expect(output).toEqual({
      type: "DG.Document",
      id: 1,
      guid: 1,
      name: doc.title,
      appName: "DG",
      appVersion: "3.0.0-test",
      appBuildNum: `${1234}`,
      metadata: {},
      components: [],
      contexts: [],
      globalValues: []
    })
  })

  it("exports a document with a single component", () => {
    const doc = createCodapDocument()
    doc.content?.insertTileSnapshotInDefaultRow({ content: { type: kCalculatorTileType }})
    const { components, ...others } = exportV2Document(doc)
    expect(others).toEqual({
      type: "DG.Document",
      id: 1,
      guid: 1,
      name: doc.title,
      appName: "DG",
      appVersion: "3.0.0-test",
      appBuildNum: `${1234}`,
      metadata: {},
      contexts: [],
      globalValues: []
    })
    expect(components.length).toBe(1)
    expect(components[0].type).toBe(kV2CalculatorDGType)
  })
})
