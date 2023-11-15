import {
  PlottedValueAdornmentModel
} from "../../components/graph/adornments/univariate-measures/plotted-value/plotted-value-adornment-model"
import { DataSet, IDataSet } from "../data/data-set"
import { PlottedValueFormulaAdapter } from "./plotted-value-formula-adapter"
import { IUpdateCategoriesOptions } from "../../components/graph/adornments/adornment-models"
import { localAttrIdToCanonical } from "./utils/name-mapping-utils"
import { GraphDataConfigurationModel } from "../../components/graph/models/graph-data-configuration-model"

const getTestEnv = () => {
  const dataSet = DataSet.create({ attributes: [{ name: "foo" }] })
  dataSet.addCases([{ __id__: "1" }])
  const attribute = dataSet.attributes[0]
  const adornment = PlottedValueAdornmentModel.create({ formula: { display: "1 + 2", canonical: "1 + 2" }})
  const graphContentModel = {
    id: "fake-graph-content-model-id",
    adornments: [adornment],
    dataset: dataSet,
    getUpdateCategoriesOptions: (): IUpdateCategoriesOptions => ({
      xAttrId: attribute.id,
      xCats: [],
      yAttrId: "fake-y-attr-id",
      yCats: [],
      topAttrId: "fake-size-attr-id",
      topCats: ["small", "medium", "large"],
      rightAttrId: "",
      rightCats: [],
      dataConfig: GraphDataConfigurationModel.create({ }),
    }),
  }
  const formula = adornment.formula
  const dataSets = new Map<string, IDataSet>([[dataSet.id, dataSet]])
  const context = { dataSet, formula }
  const extraMetadata = {
    dataSetId: dataSet.id,
    defaultArgument: localAttrIdToCanonical("fake-y-attr-id"),
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
