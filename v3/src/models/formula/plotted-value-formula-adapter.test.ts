import {
  PlottedValueAdornmentModel
} from "../../components/graph/adornments/univariate-measures/plotted-value/plotted-value-adornment-model"
import { GraphDataConfigurationModel } from "../../components/graph/models/graph-data-configuration-model"
import { IDataSet } from "../data/data-set"
import { createDataSet } from "../data/data-set-conversion"
import { PlottedValueFormulaAdapter } from "./plotted-value-formula-adapter"
import { localAttrIdToCanonical } from "./utils/name-mapping-utils"

const getTestEnv = () => {
  const dataSet = createDataSet({ attributes: [{ name: "foo" }] })
  dataSet.addCases([{ __id__: "1" }])
  const attribute = dataSet.attributes[0]
  const adornment = PlottedValueAdornmentModel.create({ formula: { display: "1 + 2", canonical: "1 + 2" }})
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
  const graphContentModel = {
    id: "fake-graph-content-model-id",
    adornments: [adornment],
    dataset: dataSet,
    dataConfiguration: dataConfig,
    getUpdateCategoriesOptions: () => ({
      dataConfig
    }),
  }
  const formula = adornment.formula
  const dataSets = new Map<string, IDataSet>([[dataSet.id, dataSet]])
  const context = { dataSet, formula }
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
    getGlobalValueManager: jest.fn(),
    getFormulaExtraMetadata: jest.fn(() => extraMetadata),
    getFormulaContext: jest.fn(() => context),
  }
  const adapter = new PlottedValueFormulaAdapter(api)
  adapter.addGraphContentModel(graphContentModel as any)
  return { adapter, adornment, graphContentModel, api, dataSet, attribute, formula, context, extraMetadata }
}

describe("PlottedValueFormulaAdapter", () => {
  describe("getAllFormulas", () => {
    it("should return attribute formulas and extra metadata", () => {
      const { adapter, formula, extraMetadata } = getTestEnv()
      const formulas = adapter.getActiveFormulas()
      expect(formulas.length).toBe(1)
      expect(formulas[0].formula).toBe(formula)
      expect(formulas[0].formula.display).toBe("1 + 2")
      expect(formulas[0].extraMetadata).toEqual(extraMetadata)
    })
  })

  describe("recalculateFormula", () => {
    it("should store results in DataSet case values", () => {
      const { adapter, adornment, context, extraMetadata } = getTestEnv()
      adapter.recalculateFormula(context, extraMetadata)
      extraMetadata.graphCellKeys.forEach(cellKey => {
        const instanceKey = adornment.instanceKey(cellKey)
        expect(adornment.measures.get(instanceKey)?.value).toBe(3) // = 1 + 2
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
