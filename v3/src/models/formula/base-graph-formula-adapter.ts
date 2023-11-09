import { makeObservable, observable } from "mobx"
import { ICase } from "../data/data-set-types"
import { localAttrIdToCanonical } from "./formula-utils"
import { IFormula } from "./formula"
import type {
  IFormulaAdapterApi, IFormulaContext, IFormulaExtraMetadata, IFormulaManagerAdapter
} from "./formula-manager"
import type { IGraphContentModel } from "../../components/graph/models/graph-content-model"
import { FormulaMathJsScope } from "./formula-mathjs-scope"
import { IAdornmentModel } from "../../components/graph/adornments/adornment-models"

type GraphCellKey = Record<string, string>

export interface IBaseGraphFormulaExtraMetadata extends IFormulaExtraMetadata {
  graphContentModelId: string
  graphCellKeys: GraphCellKey[]
}

export const getDefaultArgument = (graphContentModel: IGraphContentModel) => {
  const options = graphContentModel.getUpdateCategoriesOptions()
  const { xAttrId, yAttrId, dataConfig } = options
  const xAttrType = dataConfig?.attributeType("x")
  const defaultArgumentId = xAttrId && xAttrType === "numeric" ? xAttrId : yAttrId
  return defaultArgumentId ? localAttrIdToCanonical(defaultArgumentId) : undefined
}

interface IFormulaSupportingAdornment extends IAdornmentModel {
  formula: IFormula
  setError(errorMsg: string): void
}

export class BaseGraphFormulaAdapter implements IFormulaManagerAdapter {
  // --- METHODS AND PROPS TO OVERWRITE/IMPLEMENT ---
  type = "OVERWRITE"

  getAdornment(graphContentModel: IGraphContentModel): IFormulaSupportingAdornment | undefined {
    throw new Error("Method not implemented.")
  }

  recalculateFormula(formulaContext: IFormulaContext, extraMetadata: IBaseGraphFormulaExtraMetadata) {
    throw new Error("Method not implemented.")
  }
  // --- END OF METHODS AND PROPS TO OVERWRITE/IMPLEMENT ---

  api: IFormulaAdapterApi
  @observable.shallow graphContentModels = new Map<string, IGraphContentModel>()

  constructor(api: IFormulaAdapterApi) {
    makeObservable(this)
    this.api = api
  }

  addGraphContentModel(graphContentModel: IGraphContentModel) {
    this.graphContentModels.set(graphContentModel.id, graphContentModel)
  }

  removeGraphContentModel(graphContentModelId: string) {
    this.graphContentModels.delete(graphContentModelId)
  }

  getGraphContentModel(extraMetadata: IBaseGraphFormulaExtraMetadata) {
    const { graphContentModelId } = extraMetadata
    const graphContentModel = this.graphContentModels.get(graphContentModelId)
    if (!graphContentModel) {
      throw new Error(`GraphContentModel with id "${graphContentModelId}" not found`)
    }
    return graphContentModel
  }

  getGraphCellKeys(graphContentModel: IGraphContentModel, adornment: IFormulaSupportingAdornment) {
    // This code is mostly copied from UnivariateMeasureAdornmentModel.updateCategories.
    // TODO: Is there a way to share it somehow?
    const options = graphContentModel.getUpdateCategoriesOptions()
    const { xCats, yCats, topCats, rightCats, dataConfig } = options
    if (!dataConfig) {
      return []
    }
    const result: GraphCellKey[] = []
    const topCatCount = topCats.length || 1
    const rightCatCount = rightCats.length || 1
    const xCatCount = xCats.length || 1
    const yCatCount = yCats.length || 1
    const columnCount = topCatCount * xCatCount
    const rowCount = rightCatCount * yCatCount
    const totalCount = rowCount * columnCount
    for (let i = 0; i < totalCount; ++i) {
      result.push(adornment.cellKey(options, i))
    }
    return result
  }

  getAllFormulas(): ({ formula: IFormula, extraMetadata?: IBaseGraphFormulaExtraMetadata })[] {
    const result: ({ formula: IFormula, extraMetadata: IBaseGraphFormulaExtraMetadata })[] = []
    this.graphContentModels.forEach(graphContentModel => {
      const adornment = this.getAdornment(graphContentModel)
      if (adornment && graphContentModel.dataset) {
        result.push({
          formula: adornment.formula,
          extraMetadata: {
            graphContentModelId: graphContentModel.id,
            dataSetId: graphContentModel.dataset.id,
            defaultArgument: getDefaultArgument(graphContentModel),
            graphCellKeys: this.getGraphCellKeys(graphContentModel, adornment)
          }
        })
      }
    })
    return result
  }

  getMathJSScope(
    formulaContext: IFormulaContext, extraMetadata: IBaseGraphFormulaExtraMetadata, childMostCases: ICase[]
  ) {
    const { dataSet } = formulaContext
    const { defaultArgument } = extraMetadata
    return new FormulaMathJsScope({
      localDataSet: dataSet,
      dataSets: this.api.getDatasets(),
      globalValueManager: this.api.getGlobalValueManager(),
      childMostCollectionCaseIds: childMostCases.map(c => c.__id__),
      defaultArgument
    })
  }

  setFormulaError(formulaContext: IFormulaContext, extraMetadata: IBaseGraphFormulaExtraMetadata, errorMsg: string) {
    const adornment = this.getAdornment(this.getGraphContentModel(extraMetadata))
    adornment?.setError(errorMsg)
  }

  getFormulaError(formulaContext: IFormulaContext, extraMetadata: any) {
    // No custom errors yet.
    return undefined
  }
}
