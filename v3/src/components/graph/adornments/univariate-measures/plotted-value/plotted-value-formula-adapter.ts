import { IAnyStateTreeNode } from "mobx-state-tree"
import { DEBUG_FORMULAS, debugLog } from "../../../../../lib/debug"
import { ICase } from "../../../../../models/data/data-set-types"
import { registerFormulaAdapter } from "../../../../../models/formula/formula-adapter-registry"
import type { IFormulaAdapterApi, IFormulaContext } from "../../../../../models/formula/formula-manager-types"
import { math } from "../../../../../models/formula/functions/math"
import { formulaError } from "../../../../../models/formula/utils/misc"
import { getFormulaManager } from "../../../../../models/tiles/tile-environment"
import type { IGraphContentModel } from "../../../models/graph-content-model"
import { BaseGraphFormulaAdapter, IBaseGraphFormulaExtraMetadata } from "../../base-graph-formula-adapter"
import { isPlottedValueAdornment } from "./plotted-value-adornment-model"
import { kPlottedValueType } from "./plotted-value-adornment-types"

const PLOTTED_VALUE_FORMULA_ADAPTER = "PlottedValueFormulaAdapter"

export interface IPlottedValueFormulaExtraMetadata extends IBaseGraphFormulaExtraMetadata {}

export class PlottedValueFormulaAdapter extends BaseGraphFormulaAdapter {

  static register() {
    registerFormulaAdapter(api => new PlottedValueFormulaAdapter(api))
  }

  static get(node?: IAnyStateTreeNode) {
    return getFormulaManager(node)?.adapters.find(({ type }) =>
      type === PLOTTED_VALUE_FORMULA_ADAPTER
    ) as Maybe<PlottedValueFormulaAdapter>
  }

  constructor(api: IFormulaAdapterApi) {
    super(PLOTTED_VALUE_FORMULA_ADAPTER, api)
  }

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
      const cases = caseIds.map(id => dataConfig.dataset?.getItem(id, { numeric: true }) || { __id__: id })
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
