import { IAnyStateTreeNode } from "@concord-consortium/mobx-state-tree"
import { ICase } from "../data/data-set-types"
import { formulaError } from "./utils/misc"
import { math } from "./functions/math"
import type { IFormulaContext } from "./formula-manager"
import type { IGraphContentModel } from "../../components/graph/models/graph-content-model"
import {
  isPlottedValueAdornment
} from "../../components/graph/adornments/univariate-measures/plotted-value/plotted-value-adornment-model"

import { getFormulaManager } from "../tiles/tile-environment"
import { DEBUG_FORMULAS, debugLog } from "../../lib/debug"
import {
  kPlottedValueType
} from "../../components/graph/adornments/univariate-measures/plotted-value/plotted-value-adornment-types"
import { BaseGraphFormulaAdapter, IBaseGraphFormulaExtraMetadata } from "./base-graph-formula-adapter"

const PLOTTED_VALUE_FORMULA_ADAPTER = "PlottedValueFormulaAdapter"

export interface IPlottedValueFormulaExtraMetadata extends IBaseGraphFormulaExtraMetadata {}

export const getPlottedValueFormulaAdapter = (node?: IAnyStateTreeNode): PlottedValueFormulaAdapter | undefined =>
  getFormulaManager(node)?.adapters.find(a => a.type === PLOTTED_VALUE_FORMULA_ADAPTER) as PlottedValueFormulaAdapter

export class PlottedValueFormulaAdapter extends BaseGraphFormulaAdapter {
  type = PLOTTED_VALUE_FORMULA_ADAPTER

  getAdornment(graphContentModel: IGraphContentModel) {
    const adornment = graphContentModel.adornments.find(a => a.type === kPlottedValueType)
    if (adornment && isPlottedValueAdornment(adornment)) {
      return adornment
    }
  }

  recalculateFormula(formulaContext: IFormulaContext, extraMetadata: IPlottedValueFormulaExtraMetadata) {
    const { graphCellKeys } = extraMetadata
    const graphContentModel = this.getGraphContentModel(extraMetadata)
    const { dataConfig } = graphContentModel.getUpdateCategoriesOptions()
    const adornment = this.getAdornment(graphContentModel)
    if (!dataConfig || !adornment) {
      return
    }
    // Clear any previous error first.
    this.setFormulaError(formulaContext, extraMetadata, "")

    graphCellKeys.forEach(cellKey => {
      const instanceKey = adornment.instanceKey(cellKey)
      const caseIds = dataConfig.subPlotCases(cellKey)
      const cases = caseIds.map(id => dataConfig.dataset?.getCase(id, { numeric: true }) || { __id__: id })
      const value = Number(this.computeFormula(formulaContext, extraMetadata, cases))
      if (!adornment.measures.get(instanceKey)) {
        adornment.addMeasure(value, instanceKey)
      } else {
        adornment.updateMeasureValue(value, instanceKey)
      }
    })
  }

  computeFormula(
    formulaContext: IFormulaContext, extraMetadata: IPlottedValueFormulaExtraMetadata, childMostCases: ICase[]
  ) {
    const { formula } = formulaContext
    debugLog(DEBUG_FORMULAS, `[plotted value formula] recalculate "${formula.canonical}"`)
    const formulaScope = this.getMathJSScope(formulaContext, extraMetadata, childMostCases)
    try {
      const compiledFormula = math.compile(formula.canonical)
      return compiledFormula.evaluate(formulaScope)
    } catch (e: any) {
      this.setFormulaError(formulaContext, extraMetadata, formulaError(e.message))
    }
  }
}
