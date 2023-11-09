import { makeObservable, observable } from "mobx"
import { ICase } from "../data/data-set-types"
import { formulaError, localAttrIdToCanonical } from "./formula-utils"
import { IFormula } from "./formula"
import { math } from "./functions/math"
import type {
  IFormulaAdapterApi, IFormulaContext, IFormulaExtraMetadata, IFormulaManagerAdapter
} from "./formula-manager"
import type { IGraphContentModel } from "../../components/graph/models/graph-content-model"
import {
  isPlottedFunctionAdornment
} from "../../components/graph/adornments/plotted-function/plotted-function-adornment-model"
import { IAnyStateTreeNode } from "@concord-consortium/mobx-state-tree"
import { getFormulaManager } from "../tiles/tile-environment"
import { FormulaMathJsScope } from "./formula-mathjs-scope"
import { DEBUG_FORMULAS } from "../../lib/debug"
import {
  kPlottedFunctionType
} from "../../components/graph/adornments/plotted-function/plotted-function-adornment-types"

const PLOTTED_FUNCTION_FORMULA_ADAPTER = "PlottedFunctionFormulaAdapter"

type GraphCellKey = Record<string, string>
interface IPlottedFunctionFormulaExtraMetadata extends IFormulaExtraMetadata {
  graphContentModelId: string
  graphCellKeys: GraphCellKey[]
}

export const getPlottedFunctionFormulaAdapter = (node?: IAnyStateTreeNode): PlottedFunctionFormulaAdapter | undefined =>
  getFormulaManager(node)?.adapters.find(a =>
    a.type === PLOTTED_FUNCTION_FORMULA_ADAPTER
  ) as PlottedFunctionFormulaAdapter

export const getAdornment = (graphContentModel: IGraphContentModel) => {
  const adornment = graphContentModel.adornments.find(a => a.type === kPlottedFunctionType)
  if (!adornment || !isPlottedFunctionAdornment(adornment)) {
    throw new Error(`Adornment of type "${kPlottedFunctionType}" not found`)
  }
  return adornment
}

export const getDefaultArgument = (graphContentModel: IGraphContentModel) => {
  const options = graphContentModel.getUpdateCategoriesOptions()
  const { xAttrId, yAttrId, dataConfig } = options
  const xAttrType = dataConfig?.attributeType("x")
  const defaultArgumentId = xAttrId && xAttrType === "numeric" ? xAttrId : yAttrId
  return defaultArgumentId ? localAttrIdToCanonical(defaultArgumentId) : undefined
}

export const getGraphCellKeys = (graphContentModel: IGraphContentModel) => {
  // This code is mostly copied from UnivariateMeasureAdornmentModel.updateCategories.
  // TODO: Is there a way to share it somehow?
  const options = graphContentModel.getUpdateCategoriesOptions()
  const { xCats, yCats, topCats, rightCats, dataConfig } = options
  if (!dataConfig) {
    return []
  }
  const result: GraphCellKey[] = []
  const adornment = getAdornment(graphContentModel)
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

export class PlottedFunctionFormulaAdapter implements IFormulaManagerAdapter {
  type = PLOTTED_FUNCTION_FORMULA_ADAPTER
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

  getGraphContentModel(extraMetadata: IPlottedFunctionFormulaExtraMetadata) {
    const { graphContentModelId } = extraMetadata
    const graphContentModel = this.graphContentModels.get(graphContentModelId)
    if (!graphContentModel) {
      throw new Error(`GraphContentModel with id "${graphContentModelId}" not found`)
    }
    return graphContentModel
  }

  getAdornment(extraMetadata: IPlottedFunctionFormulaExtraMetadata) {
    const graphContentModel = this.getGraphContentModel(extraMetadata)
    return getAdornment(graphContentModel)
  }

  getAllFormulas(): ({ formula: IFormula, extraMetadata?: IPlottedFunctionFormulaExtraMetadata })[] {
    const result: ({ formula: IFormula, extraMetadata: IPlottedFunctionFormulaExtraMetadata })[] = []
    this.graphContentModels.forEach(graphContentModel => {
      graphContentModel.adornments.forEach(adornment => {
        if (graphContentModel.dataset && isPlottedFunctionAdornment(adornment)) {
          result.push({
            formula: adornment.formula,
            extraMetadata: {
              graphContentModelId: graphContentModel.id,
              dataSetId: graphContentModel.dataset.id,
              defaultArgument: getDefaultArgument(graphContentModel),
              graphCellKeys: getGraphCellKeys(graphContentModel),
            }
          })
        }
      })
    })
    return result
  }

  recalculateFormula(formulaContext: IFormulaContext, extraMetadata: IPlottedFunctionFormulaExtraMetadata) {
    const { defaultArgument, graphCellKeys } = extraMetadata
    const { dataConfig } = this.getGraphContentModel(extraMetadata).getUpdateCategoriesOptions()
    if (!dataConfig) {
      return
    }
    // Clear any previous error first.
    this.setFormulaError(formulaContext, extraMetadata, "")
    const adornment = this.getAdornment(extraMetadata)
    graphCellKeys.forEach(cellKey => {
      const instanceKey = adornment.instanceKey(cellKey)
      const cases = dataConfig.subPlotCases(cellKey)
      const formulaFunction = this.computeFormula(formulaContext, extraMetadata, cases, defaultArgument) || (() => NaN)
      if (!adornment.measures.get(instanceKey)) {
        adornment.addMeasure(formulaFunction, instanceKey)
      } else {
        adornment.updateMeasureValue(formulaFunction, instanceKey)
      }
    })
  }

  computeFormula(formulaContext: IFormulaContext, extraMetadata: IPlottedFunctionFormulaExtraMetadata,
    childMostCases: ICase[], defaultArgument?: string) {
    const { formula, dataSet } = formulaContext
    if (DEBUG_FORMULAS) {
      // eslint-disable-next-line no-console
      console.log(`[plotted value formula] recalculate "${formula.canonical}"`)
    }

    const formulaScope = new FormulaMathJsScope({
      localDataSet: dataSet,
      dataSets: this.api.getDatasets(),
      globalValueManager: this.api.getGlobalValueManager(),
      childMostCollectionCaseIds: childMostCases.map(c => c.__id__),
      defaultArgument
    })

    try {
      const compiledFormula = math.compile(formula.canonical)
      const extraScope = new Map()
      formulaScope.setExtraScope(extraScope)
      return (x: number) => {
        extraScope.set("x", x)
        return compiledFormula.evaluate(formulaScope)
      }
    } catch (e: any) {
      this.setFormulaError(formulaContext, extraMetadata, formulaError(e.message))
    }
  }

  setFormulaError(formulaContext: IFormulaContext, extraMetadata: IPlottedFunctionFormulaExtraMetadata,
    errorMsg: string) {
    const adornment = this.getAdornment(extraMetadata)
    adornment.setError(errorMsg)
  }

  getFormulaError(formulaContext: IFormulaContext, extraMetadata: any) {
    // No custom errors yet.
    return undefined
  }
}
