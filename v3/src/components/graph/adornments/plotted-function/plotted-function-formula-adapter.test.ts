import { IDataSet as IFormulaDataSet } from "@concord-consortium/codap-formulas/models/data/data-set"
import { createDataSet } from "../../../../models/data/data-set-conversion"
import { localAttrIdToCanonical } from "../../../../models/formula/utils/name-mapping-utils"
import { IGraphContentModel } from "../../models/graph-content-model"
import { GraphDataConfigurationModel } from "../../models/graph-data-configuration-model"
import { PlottedFunctionAdornmentModel } from "./plotted-function-adornment-model"
import { PlottedFunctionFormulaAdapter } from "./plotted-function-formula-adapter"

const getTestEnv = () => {
  const dataSet = createDataSet({ attributes: [{ name: "foo" }] })
  dataSet.addCases([{ __id__: "1" }])
  const formulaDataSet = dataSet as IFormulaDataSet
  const attribute = formulaDataSet.attributes[0]
  const adornment = PlottedFunctionAdornmentModel.create({ formula: { display: "1 + 2 + x" }})
  adornment.formula.setCanonicalExpression(adornment.formula.display)
  const dataConfig = GraphDataConfigurationModel.create({ })
  const mockData: Record<string, Record<string, any>> = {
    id: {
      x: attribute.id,
      y: "fake-y-attr-id",
      topSplit: "fake-size-attr-id",
      rightSplit: ""
    },
    type: {
      x: "numeric",
      y: "numeric",
    },
    categoryArrayForAttrRole: {
      x: [],
      y: [],
      topSplit: ["small", "medium", "large"],
      rightSplit: []
    }
  }
  dataConfig.attributeID = (role: string) => mockData.id[role]
  dataConfig.attributeType = (role: string) => mockData.type[role]
  ;(dataConfig as any).categoryArrayForAttrRole = (role: string) => mockData.categoryArrayForAttrRole[role]

  const graphContentModel: Partial<IGraphContentModel> = {
    id: "fake-graph-content-model-id",
    type: "Graph",
    adornments: [adornment],
    dataset: dataSet,
    dataConfiguration: dataConfig,
    getUpdateCategoriesOptions: () => ({
      dataConfig
    }),
  }
  const formula = adornment.formula
  const dataSets = new Map<string, IFormulaDataSet>([[dataSet.id, formulaDataSet]])
  const context = { dataSet: formulaDataSet, formula }
  const extraMetadata = {
    dataSetId: dataSet.id,
    defaultArgument: localAttrIdToCanonical(attribute.id),
    graphCellKeys: [
      {"fake-size-attr-id": "small"},
      {"fake-size-attr-id": "medium"},
      {"fake-size-attr-id": "large"},
    ],
    graphContentModelId: "fake-graph-content-model-id",
  }
  const api = {
    getDatasets: jest.fn(() => dataSets),
    getBoundaryManager: jest.fn(),
    getGlobalValueManager: jest.fn(),
    getFormulaExtraMetadata: jest.fn(() => extraMetadata),
    getFormulaContext: jest.fn(() => context),
  }
  const adapter = new PlottedFunctionFormulaAdapter(api)
  adapter.addContentModel(graphContentModel as any)
  return { adapter, adornment, graphContentModel, api, dataSet, attribute, formula, context, extraMetadata }
}

describe("PlottedFunctionFormulaAdapter", () => {
  describe("getAllFormulas", () => {
    it("should return attribute formulas and extra metadata", () => {
      const { adapter, formula, extraMetadata } = getTestEnv()
      const formulas = adapter.getActiveFormulas()
      expect(formulas.length).toBe(1)
      expect(formulas[0].formula).toBe(formula)
      expect(formulas[0].formula.display).toBe("1 + 2 + x")
      expect(formulas[0].extraMetadata).toEqual(extraMetadata)
    })
  })

  describe("recalculateFormula", () => {
    it("should store results in DataSet case values", () => {
      const { adapter, adornment, context, extraMetadata } = getTestEnv()
      adapter.recalculateFormula(context, extraMetadata)
      extraMetadata.graphCellKeys.forEach(cellKey => {
        const instanceKey = adornment.instanceKey(cellKey)
        expect(adornment.plottedFunctions.get(instanceKey)?.formulaFunction(3)).toBe(6) // = 1 + 2 + x=3
      })
    })
  })

  describe("setError", () => {
    it("should store error in DataSet case values", () => {
      const { adapter, adornment, context, extraMetadata } = getTestEnv()
      adapter.setFormulaError(context, extraMetadata, "test error")
      expect(adornment.error).toBe("test error")
    })
  })
})
