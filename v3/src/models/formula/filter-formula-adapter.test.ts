import { IDataSet } from "../data/data-set"
import { createDataSet } from "../data/data-set-conversion"
import { FilterFormulaAdapter } from "./filter-formula-adapter"
import { displayToCanonical } from "./utils/canonicalization-utils"
import { getDisplayNameMap } from "./utils/name-mapping-utils"

const AttrID = "AttrID"
const AttrName = "foo"

const getTestEnv = (filterFormula: string) => {
  const dataSet = createDataSet({ name: "DataSet" })
  dataSet.addAttribute({ id: AttrID, name: AttrName })
  dataSet.addCases([{ __id__: "1", AttrID: 1 }, { __id__: "2", AttrID: 2 }, { __id__: "3", AttrID: 3 }])
  dataSet.setFilterFormula(filterFormula)
  const formula = dataSet.filterFormula!
  const dataSets = new Map<string, IDataSet>([[dataSet.id, dataSet]])
  const context = { dataSet, formula }
  const extraMetadata = { dataSetId: dataSet.id }
  const api = {
    getDatasets: jest.fn(() => dataSets),
    getGlobalValueManager: jest.fn(),
    getFormulaExtraMetadata: jest.fn(() => extraMetadata),
    getFormulaContext: jest.fn(() => context),
  }
  const adapter = new FilterFormulaAdapter(api)

  const displayNameMap = getDisplayNameMap({ localDataSet: dataSet, dataSets })
  formula.setCanonicalExpression(displayToCanonical(formula.display, displayNameMap))

  return { adapter, api, dataSet, formula, context, extraMetadata }
}

describe("AttributeFormulaAdapter", () => {
  describe("getAllFormulas", () => {
    it("should return attribute formulas and extra metadata", () => {
      const { adapter, extraMetadata, formula } = getTestEnv("foo < 2")
      const formulas = adapter.getActiveFormulas()
      expect(formulas.length).toBe(1)
      expect(formulas[0].formula).toBe(formula)
      expect(formulas[0].formula.display).toBe("foo < 2")
      expect(formulas[0].extraMetadata).toEqual(extraMetadata)
    })
  })

  describe("computeFormula", () => {
    it("should return results for each provided case", () => {
      const { adapter, context, extraMetadata } = getTestEnv("foo < 2")
      const results = adapter.computeFormula(context, extraMetadata, "ALL_CASES")
      expect(results).toEqual([
        { itemId: "1", result: true },
        { itemId: "2", result: false },
        { itemId: "3", result: false },
      ])
    })

    it("should ignore cases that are set aside by the user", () => {
      const { adapter, context, extraMetadata } = getTestEnv("foo < 2")
      const dataSet = context.dataSet
      dataSet.hideCasesOrItems(["3"])
      const results = adapter.computeFormula(context, extraMetadata, "ALL_CASES")
      expect(results).toEqual([
        { itemId: "1", result: true },
        { itemId: "2", result: false }
      ])
    })

    it("should not include set-aside cases in the aggregate function calculations", () => {
      const { adapter, context, dataSet, extraMetadata } = getTestEnv("foo < max(foo)")
      const results = adapter.computeFormula(context, extraMetadata, "ALL_CASES")
      // max(foo) = 3 when all the cases are included
      expect(results).toEqual([
        { itemId: "1", result: true },
        { itemId: "2", result: true },
        { itemId: "3", result: false },
      ])

      dataSet.hideCasesOrItems(["3"])

      const results2 = adapter.computeFormula(context, extraMetadata, "ALL_CASES")
      // max(foo) = 2 when case 3 is set aside
      expect(results2).toEqual([
        { itemId: "1", result: true },
        { itemId: "2", result: false }
      ])
    })
  })

  describe("recalculateFormula", () => {
    it("should store results in DataSet filterFormulaResult map", () => {
      const { adapter, dataSet, context, extraMetadata } = getTestEnv("foo < 2")
      adapter.recalculateFormula(context, extraMetadata, "ALL_CASES")
      expect(dataSet.filterFormulaResults.toJSON()).toEqual([
        ["1", true],
        ["2", false],
        ["3", false],
      ])
    })

    it("should update just provided cases when casesToRecalculateDesc is an array", () => {
      const { adapter, dataSet, context, extraMetadata } = getTestEnv("foo < 2")
      dataSet.filterFormulaResults.set("1", false)
      dataSet.filterFormulaResults.set("2", true)

      adapter.recalculateFormula(context, extraMetadata, [{ __id__: "1" }])
      expect(dataSet.filterFormulaResults.toJSON()).toEqual([
        ["1", true],
        // Old values should be preserved
        ["2", true]
      ])
    })

    it("should clear previous filter formula error", () => {
      const { adapter, dataSet, context, extraMetadata } = getTestEnv("foo < 2")
      adapter.setFormulaError(context, extraMetadata, "test error")
      adapter.recalculateFormula(context, extraMetadata, "ALL_CASES")
      expect(dataSet.filterFormulaError).toEqual("")
    })
  })

  describe("setError", () => {
    it("should store error in DataSet case values", () => {
      const { adapter, dataSet, context, extraMetadata } = getTestEnv("foo < 2")
      adapter.setFormulaError(context, extraMetadata, "test error")
      expect(dataSet.filterFormulaError).toEqual("test error")
    })
  })
})
