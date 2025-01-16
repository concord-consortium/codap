import { kCalculatorTileType, kV2CalculatorDGType } from "../components/calculator/calculator-defs"
import { createCodapDocument } from "../models/codap/create-codap-document"
import { DataBroker } from "../models/data/data-broker"
import { DataSet } from "../models/data/data-set"
import { GlobalValue } from "../models/global/global-value"
import { getSharedDataSets } from "../models/shared/shared-data-utils"
import { getSharedModelManager } from "../models/tiles/tile-environment"
import { getGlobalValueManager } from "../models/global/global-value-manager"
import { toV2Id } from "../utilities/codap-utils"
import { ICodapV2DataContext } from "./codap-v2-types"
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

  it("exports a document with a single global value", () => {
    const doc = createCodapDocument()
    const globalValueManager = getGlobalValueManager(getSharedModelManager(doc))
    globalValueManager?.addValue(GlobalValue.create({ name: "v1", value: 1 }))
    const { globalValues, ...others } = exportV2Document(doc)
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
      components: []
    })
    expect(globalValues.length).toBe(1)
    expect(globalValues[0].name).toBe("v1")
    expect(globalValues[0].value).toBe(1)
  })

  it("exports a document with a single data set", () => {
    const doc = createCodapDocument()
    const sharedModelManager = getSharedModelManager(doc)
    const dataBroker = new DataBroker({ sharedModelManager })
    const dataSet = DataSet.create({ collections: [{ name: "Cases" }]})
    const attr = dataSet.addAttribute({ name: "A" })
    dataSet.addCases([{ [attr.id]: 1 }, { [attr.id]: 2 }, { [attr.id]: 3 }])
    dataBroker.addDataSet(dataSet)
    expect(getSharedDataSets(doc).length).toBe(1)
    expect(dataSet.itemIds.length).toBe(3)

    const { contexts, ...others } = exportV2Document(doc)
    const context = contexts[0] as ICodapV2DataContext
    expect(others).toEqual({
      type: "DG.Document",
      id: 1,
      guid: 1,
      name: doc.title,
      appName: "DG",
      appVersion: "3.0.0-test",
      appBuildNum: `${1234}`,
      metadata: {},
      components: [],
      globalValues: []
    })
    expect(context.guid).toBe(toV2Id(dataSet.id))
    const collection = context.collections[0]
    expect(collection.guid).toBe(toV2Id(dataSet.collections[0].id))
    const cases = collection.cases
    expect(cases[0].guid).toBe(toV2Id(dataSet.collections[0].cases[0].__id__))
    expect(cases[0].values).toEqual({ A: 1 })
    expect(cases[1].guid).toBe(toV2Id(dataSet.collections[0].cases[1].__id__))
    expect(cases[1].values).toEqual({ A: 2 })
    expect(cases[2].guid).toBe(toV2Id(dataSet.collections[0].cases[2].__id__))
    expect(cases[2].values).toEqual({ A: 3 })
  })
})
