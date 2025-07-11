import { createDataSet } from "../data/data-set-conversion"
import { AttributeFormulaAdapter } from "@concord-consortium/codap-formulas/models/formula/attribute-formula-adapter"
import { FormulaManager } from "@concord-consortium/codap-formulas/models/formula/formula-manager"
import { localAttrIdToCanonical } from "@concord-consortium/codap-formulas/models/formula/utils/name-mapping-utils"

import type { IDataSet as IFormulaDataSet } from "@concord-consortium/codap-formulas/models/data/data-set"

const getTestEnv = () => {
  const _dataSet = createDataSet({
    attributes: [{ name: "foo", formula: { display: "1 + 2" } }]
  })
  _dataSet.addCases([{ __id__: "1" }])
  // We have to cast here because the types in the formula package
  // haven't been setup well enough to accept the CODAP DataSet type
  // see formulas/todo.md
  const dataSet = _dataSet as IFormulaDataSet
  const attribute = dataSet.attributes[0]
  const formula = attribute.formula!
  formula.setCanonicalExpression(formula.display)
  const dataSets = new Map<string, IFormulaDataSet>([[dataSet.id, dataSet]])
  const context = { dataSet, formula }
  const extraMetadata = { dataSetId: dataSet.id, attributeId: attribute.id, boundariesLoaded: false }
  const api = {
    getDatasets: jest.fn(() => dataSets),
    getBoundaryManager: jest.fn(),
    getGlobalValueManager: jest.fn(),
    getFormulaExtraMetadata: jest.fn(() => extraMetadata),
    getFormulaContext: jest.fn(() => context),
  }
  const adapter = new AttributeFormulaAdapter(api)
  return { adapter, api, dataSet, attribute, formula, context, extraMetadata }
}

describe("AttributeFormulaAdapter", () => {
  describe("getAllFormulas", () => {
    it("should return attribute formulas and extra metadata", () => {
      const { adapter, extraMetadata, formula } = getTestEnv()
      const formulas = adapter.getActiveFormulas()
      expect(formulas.length).toBe(1)
      expect(formulas[0].formula).toBe(formula)
      expect(formulas[0].formula.display).toBe("1 + 2")
      expect(formulas[0].extraMetadata).toEqual(extraMetadata)
    })
  })

  describe("recalculateFormula", () => {
    it("should store results in DataSet case values", () => {
      const { adapter, dataSet, attribute, context, extraMetadata } = getTestEnv()
      adapter.recalculateFormula(context, extraMetadata, "ALL_CASES")
      expect(dataSet.getValueAtItemIndex(0, attribute.id)).toEqual(3)
    })
  })

  describe("setError", () => {
    it("should store error in DataSet case values", () => {
      const { adapter, attribute, dataSet, context, extraMetadata } = getTestEnv()
      adapter.setFormulaError(context, extraMetadata, "test error")
      expect(dataSet.getValueAtItemIndex(0, attribute.id)).toEqual("test error")
    })
  })

  describe("getFormulaError", () => {
    it("should detect dependency cycles", () => {
      const formulaManager = new FormulaManager()
      const _dataSet = createDataSet({
        attributes: [
          { name: "foo", formula: { display: "bar + 1" } },
          { name: "bar", formula: { display: "foo + 1" } }
        ]
      }, {formulaManager})
      const dataSet = _dataSet as IFormulaDataSet
      dataSet.attributes[0].formula!.setCanonicalExpression(
        `${localAttrIdToCanonical(_dataSet.attrIDFromName("bar")!)} + 1`
      )
      dataSet.attributes[1].formula!.setCanonicalExpression(
        `${localAttrIdToCanonical(_dataSet.attrIDFromName("foo")!)} + 1`
      )
      _dataSet.addCases([{ __id__: "1" }])
      const attribute = dataSet.attributes[0]
      const formula = attribute.formula!
      const dataSets = new Map<string, IFormulaDataSet>([[dataSet.id, dataSet]])
      const context = { dataSet, formula }
      const extraMetadata = { dataSetId: dataSet.id, attributeId: attribute.id }
      const api = {
        getDatasets: jest.fn(() => dataSets),
        getBoundaryManager: jest.fn(),
        getGlobalValueManager: jest.fn(),
        getFormulaExtraMetadata: jest.fn(() => extraMetadata),
        getFormulaContext: jest.fn(() => context),
      }
      const adapter = new AttributeFormulaAdapter(api)
      const error = adapter.getFormulaError(context, extraMetadata)
      expect(error).toMatch(/Circular reference/)
    })
  })

  describe("setupFormulaObservers", () => {
    it("should setup observer detecting hierarchy updates", () => {
      const _dataSet = createDataSet({
        attributes: [
          { name: "foo", formula: { display: "1 + 2" } },
          { name: "bar" }
        ]
      })
      _dataSet.addCases([{ __id__: "1" }])
      const dataSet = _dataSet as IFormulaDataSet
      const attribute = dataSet.attributes[0]
      const formula = attribute.formula!
      formula.setCanonicalExpression(formula.display)
      const dataSets = new Map<string, IFormulaDataSet>([[dataSet.id, dataSet]])
      const context = { dataSet, formula }
      const extraMetadata = { dataSetId: dataSet.id, attributeId: attribute.id }
      const api = {
        getDatasets: jest.fn(() => dataSets),
        getBoundaryManager: jest.fn(),
        getGlobalValueManager: jest.fn(),
        getFormulaExtraMetadata: jest.fn(() => extraMetadata),
        getFormulaContext: jest.fn(() => context),
      }
      const adapter = new AttributeFormulaAdapter(api)
      adapter.setupFormulaObservers(context, extraMetadata)

      expect(dataSet.getValueAtItemIndex(0, attribute.id)).toEqual("")
      _dataSet.moveAttributeToNewCollection(_dataSet.attrIDFromName("bar")!)
      expect(dataSet.getValueAtItemIndex(0, attribute.id)).toEqual(3) // formula has been recalculated
    })
  })
})
