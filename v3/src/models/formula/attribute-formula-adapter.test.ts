import { IDataSet } from "../data/data-set"
import { createDataSet } from "../data/data-set-conversion"
import { AttributeFormulaAdapter } from "./attribute-formula-adapter"
import { FormulaManager } from "./formula-manager"
import { localAttrIdToCanonical } from "./utils/name-mapping-utils"

const getTestEnv = () => {
  const dataSet = createDataSet({
    attributes: [{ name: "foo", formula: { display: "1 + 2" } }]
  })
  dataSet.addCases([{ __id__: "1" }])
  const attribute = dataSet.attributes[0]
  const formula = attribute.formula!
  formula.setCanonicalExpression(formula.display)
  const dataSets = new Map<string, IDataSet>([[dataSet.id, dataSet]])
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
    // Helper to build a cycle detection test environment with proper per-formula mocks.
    const getCycleTestEnv = (attrSpecs: { name: string, formula: string }[]) => {
      const formulaManager = new FormulaManager()
      const dataSet = createDataSet({
        attributes: attrSpecs.map(({ name, formula }) => ({ name, formula: { display: formula } }))
      }, {formulaManager})
      // Set canonical expressions using attribute IDs
      attrSpecs.forEach(({ formula }, i) => {
        let canonical = formula
        attrSpecs.forEach(({ name: depName }) => {
          const depId = dataSet.attrIDFromName(depName)
          if (depId) {
            canonical = canonical.replace(
              new RegExp(`\\b${depName}\\b`, "g"), localAttrIdToCanonical(depId)
            )
          }
        })
        dataSet.attributes[i].formula!.setCanonicalExpression(canonical)
      })
      dataSet.addCases([{ __id__: "1" }])
      const dataSets = new Map<string, IDataSet>([[dataSet.id, dataSet]])
      // Build per-formula context/metadata maps
      const contextMap = new Map<string, { dataSet: IDataSet, formula: any }>()
      const metadataMap = new Map<string, { dataSetId: string, attributeId: string }>()
      dataSet.attributes.forEach(attr => {
        if (attr.formula) {
          contextMap.set(attr.formula.id, { dataSet, formula: attr.formula })
          metadataMap.set(attr.formula.id, { dataSetId: dataSet.id, attributeId: attr.id })
        }
      })
      const api = {
        getDatasets: jest.fn(() => dataSets),
        getBoundaryManager: jest.fn(),
        getGlobalValueManager: jest.fn(),
        getFormulaExtraMetadata: jest.fn((id: string) => metadataMap.get(id)!),
        getFormulaContext: jest.fn((id: string) => contextMap.get(id)!),
      }
      const adapter = new AttributeFormulaAdapter(api)
      return { dataSet, adapter, contextMap, metadataMap }
    }

    it("should detect dependency cycles", () => {
      const { dataSet, adapter, contextMap, metadataMap } = getCycleTestEnv([
        { name: "foo", formula: "bar + 1" },
        { name: "bar", formula: "foo + 1" }
      ])
      const fooAttr = dataSet.attributes[0]
      const context = contextMap.get(fooAttr.formula!.id)!
      const extraMetadata = metadataMap.get(fooAttr.formula!.id)!
      const error = adapter.getFormulaError(context, extraMetadata)
      expect(error).toMatch(/Circular reference/)
    })

    it("should not report false cycle for diamond dependencies (CODAP-1147)", () => {
      // Diamond: A depends on B and C, both B and C depend on D.
      // This is a DAG, not a cycle.
      const { dataSet, adapter, contextMap, metadataMap } = getCycleTestEnv([
        { name: "A", formula: "B + C" },
        { name: "B", formula: "D + 1" },
        { name: "C", formula: "D + 2" },
        { name: "D", formula: "1" }
      ])
      const aAttr = dataSet.attributes[0]
      const context = contextMap.get(aAttr.formula!.id)!
      const extraMetadata = metadataMap.get(aAttr.formula!.id)!
      const error = adapter.getFormulaError(context, extraMetadata)
      expect(error).toBeUndefined()
    })
  })

  describe("setupFormulaObservers", () => {
    it("should setup observer detecting hierarchy updates", () => {
      const dataSet = createDataSet({
        attributes: [
          { name: "foo", formula: { display: "1 + 2" } },
          { name: "bar" }
        ]
      })
      dataSet.addCases([{ __id__: "1" }])
      const attribute = dataSet.attributes[0]
      const formula = attribute.formula!
      formula.setCanonicalExpression(formula.display)
      const dataSets = new Map<string, IDataSet>([[dataSet.id, dataSet]])
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
      dataSet.moveAttributeToNewCollection(dataSet.attrIDFromName("bar")!)
      expect(dataSet.getValueAtItemIndex(0, attribute.id)).toEqual(3) // formula has been recalculated
    })
  })
})
