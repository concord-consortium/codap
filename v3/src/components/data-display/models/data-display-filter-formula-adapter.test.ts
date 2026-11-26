import { IDataSet } from "../../../models/data/data-set"
import { createDataSet } from "../../../models/data/data-set-conversion"
import { IFormulaAdapterApi } from "../../../models/formula/formula-manager-adapter"
import { displayToCanonical } from "../../../models/formula/utils/canonicalization-utils"
import { getDisplayNameMap } from "../../../models/formula/utils/name-mapping-utils"
import { Formula } from "../../../models/formula/formula"
import {
  DataDisplayFilterFormulaAdapter, IDataDisplayFilterFormulaExtraMetadata
} from "./data-display-filter-formula-adapter"

const getTestEnv = (filterFormula: string) => {
  const dataSet = createDataSet({ name: "DataSet" })
  dataSet.addAttribute({ id: "BoolAttrID", name: "bar" })
  dataSet.addCases([
    { __id__: "1", BoolAttrID: "true" },
    { __id__: "2", BoolAttrID: "false" },
    { __id__: "3", BoolAttrID: "FALSE" },
    { __id__: "4", BoolAttrID: "" }
  ])
  const formula = Formula.create({ display: filterFormula })
  const dataSets = new Map<string, IDataSet>([[dataSet.id, dataSet]])
  const context = { dataSet, formula }
  const extraMetadata: IDataDisplayFilterFormulaExtraMetadata = { dataSetId: dataSet.id, contentModelId: "content" }
  const api: IFormulaAdapterApi = {
    getDatasets: jest.fn(() => dataSets),
    getBoundaryManager: jest.fn(),
    getGlobalValueManager: jest.fn(),
    getFormulaExtraMetadata: jest.fn(() => extraMetadata),
    getFormulaContext: jest.fn(() => context),
  }
  const dataConfig = {
    childmostCollectionIDForAxisAttributes: dataSet.childCollection.id,
    hiddenCasesSet: new Set<string>(),
    visibleCaseIds: new Set<string>()
  }
  const adapter = new DataDisplayFilterFormulaAdapter("TestFilterFormulaAdapter", api)
  jest.spyOn(adapter, "getDataConfiguration").mockReturnValue(dataConfig)

  const displayNameMap = getDisplayNameMap({ localDataSet: dataSet, dataSets })
  formula.setCanonicalExpression(displayToCanonical(formula.display, displayNameMap))

  return { adapter, context, extraMetadata }
}

describe("DataDisplayFilterFormulaAdapter", () => {
  describe("computeFormula", () => {
    it("should treat \"true\" and \"false\" string values as booleans and empty values as false", () => {
      const { adapter, context, extraMetadata } = getTestEnv("bar")
      const results = adapter.computeFormula(context, extraMetadata, "ALL_CASES")
      expect(results?.map(r => r.result)).toEqual([true, false, false, false])
    })
  })
})
