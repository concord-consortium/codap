import { action, makeObservable, observable } from "mobx"
import { ICase } from "../../../models/data/data-set-types"
import { IFormula } from "../../../models/formula/formula"
import { type IFormulaContext, type IFormulaExtraMetadata } from "../../../models/formula/formula-manager-types"
import { FormulaManagerAdapter, type IFormulaAdapterApi } from "../../../models/formula/formula-manager-adapter"
import { FormulaMathJsScope } from "../../../models/formula/formula-mathjs-scope"
import { localAttrIdToCanonical } from "../../../models/formula/utils/name-mapping-utils"
import { ITileContentModel } from "../../../models/tiles/tile-content"
import { isGraphContentModel, type IGraphContentModel } from "../models/graph-content-model"
import { IAdornmentModel } from "./adornment-models"

type GraphCellKey = Record<string, string>

export interface IBaseGraphFormulaExtraMetadata extends IFormulaExtraMetadata {
  graphContentModelId: string
  graphCellKeys: GraphCellKey[]
}

export const getDefaultArgument = (graphContentModel: IGraphContentModel) => {
  const { xAttrId, yAttrId, xAttrType } = graphContentModel.dataConfiguration.getCategoriesOptions()
  const defaultArgumentId = xAttrId && xAttrType === "numeric" ? xAttrId : yAttrId
  return defaultArgumentId ? localAttrIdToCanonical(defaultArgumentId) : undefined
}

interface IFormulaSupportingAdornment extends IAdornmentModel {
  formula: IFormula
  setError(errorMsg: string): void
}

export class BaseGraphFormulaAdapter extends FormulaManagerAdapter {
  // --- METHODS AND PROPS TO OVERRIDE/IMPLEMENT ---

  getAdornment(graphContentModel: IGraphContentModel): IFormulaSupportingAdornment | undefined {
    throw new Error("Method not implemented.")
  }

  recalculateFormula(formulaContext: IFormulaContext, extraMetadata: IBaseGraphFormulaExtraMetadata) {
    throw new Error("Method not implemented.")
  }
  // --- END OF METHODS AND PROPS TO OVERRIDE/IMPLEMENT ---

  @observable.shallow graphContentModels = new Map<string, IGraphContentModel>()

  constructor(type: string, api: IFormulaAdapterApi) {
    super(type, api)
    makeObservable(this)
  }

  @action
  addContentModel(contentModel: ITileContentModel) {
    if (isGraphContentModel(contentModel)) {
      this.graphContentModels.set(contentModel.id, contentModel)
    }
  }

  @action
  removeContentModel(graphContentModelId: string) {
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

  getActiveFormulas(): ({ formula: IFormula, extraMetadata: IBaseGraphFormulaExtraMetadata })[] {
    const result: ({ formula: IFormula, extraMetadata: IBaseGraphFormulaExtraMetadata })[] = []
    this.graphContentModels.forEach(graphContentModel => {
      const adornment = this.getAdornment(graphContentModel)
      // Only visible adornment formulas are considered active.
      if (adornment?.isVisible && graphContentModel.dataset) {
        result.push({
          formula: adornment.formula,
          extraMetadata: {
            graphContentModelId: graphContentModel.id,
            dataSetId: graphContentModel.dataset.id,
            defaultArgument: getDefaultArgument(graphContentModel),
            graphCellKeys: graphContentModel.dataConfiguration.getAllCellKeys()
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
