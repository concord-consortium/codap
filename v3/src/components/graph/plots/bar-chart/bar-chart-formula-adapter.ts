import { IAnyStateTreeNode } from "mobx-state-tree"
import { DEBUG_FORMULAS, debugLog } from "../../../../lib/debug"
import { ICase } from "../../../../models/data/data-set-types"
import { registerFormulaAdapter } from "../../../../models/formula/formula-adapter-registry"
import { IFormulaAdapterApi } from "../../../../models/formula/formula-manager-adapter"
import { IFormulaContext } from "../../../../models/formula/formula-manager-types"
import { math } from "../../../../models/formula/functions/math"
import { formulaError } from "../../../../models/formula/utils/misc"
import { getFormulaManager } from "../../../../models/tiles/tile-environment"
import { mstReaction } from "../../../../utilities/mst-reaction"
import {BaseGraphFormulaAdapter, IBaseGraphFormulaExtraMetadata}
  from "../../adornments/utilities/base-graph-formula-adapter"
import type { IGraphContentModel } from "../../models/graph-content-model"
import { cellKeyToString } from "../../utilities/cell-key-utils"
import { isBarChartModel } from "./bar-chart-model"

const BAR_CHART_FORMULA_ADAPTER = "BarChartFormulaAdapter"

export interface IBarChartFormulaExtraMetadata extends IBaseGraphFormulaExtraMetadata {}

export class BarChartFormulaAdapter extends BaseGraphFormulaAdapter {

  static register() {
    registerFormulaAdapter(api => new BarChartFormulaAdapter(api))
  }

  static get(node?: IAnyStateTreeNode) {
    return getFormulaManager(node)?.adapters.find(({ type }) =>
      type === BAR_CHART_FORMULA_ADAPTER
    ) as Maybe<BarChartFormulaAdapter>
  }

  constructor(api: IFormulaAdapterApi) {
    super(BAR_CHART_FORMULA_ADAPTER, api)
  }

  getFormulaOwner(graphContentModel: IGraphContentModel) {
    const { plot } = graphContentModel
    if (isBarChartModel(plot) && plot.breakdownType === 'formula' && plot.formula) {
      return {formula: plot.formula, isVisible: true, setError: () => null}
    }
  }

  recalculateFormula(formulaContext: IFormulaContext, extraMetadata: IBarChartFormulaExtraMetadata) {
    const { graphCellKeys } = extraMetadata
    const graphContentModel = this.getGraphContentModel(extraMetadata)
    const { dataConfig } = graphContentModel.getUpdateCategoriesOptions()
    const plotModel = graphContentModel.plot
    if (!dataConfig || !isBarChartModel(plotModel)) {
      return
    }
    // Clear any previous error first.
    this.setFormulaError(formulaContext, extraMetadata, "")

    // Build new barSpecs map and replace atomically to avoid intermediate states
    // that could trigger reactions with stale/empty data
    const newSpecs = new Map<string, { value: number, numCases: number }>()
    graphCellKeys.forEach(cellKey => {
      const caseIds = dataConfig.subPlotCases(cellKey)
      const cases = caseIds.map(id => dataConfig.dataset?.getItem(id, { numeric: true }) || { __id__: id })
      const value = Number(this.computeFormula(formulaContext, extraMetadata, cases))
      newSpecs.set(cellKeyToString(cellKey), { value, numCases: caseIds.length })
    })
    plotModel.replaceBarSpecs(newSpecs)
  }

  computeFormula(
    formulaContext: IFormulaContext, extraMetadata: IBarChartFormulaExtraMetadata, childMostCases: ICase[]
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

  setupFormulaObservers(formulaContext: IFormulaContext, extraMetadata: IBarChartFormulaExtraMetadata) {
    const graphContentModel = this.getGraphContentModel(extraMetadata)
    const dataConfig = graphContentModel.dataConfiguration

    // Observe caseDataHash which changes AFTER invalidateCases() is called.
    // This ensures caches are cleared and categoryArrayForAttrRole returns fresh data.
    const disposer = mstReaction(
      () => dataConfig.caseDataHash,
      () => {
        // Get fresh cell keys since visible categories may have changed
        const freshExtraMetadata = {
          ...extraMetadata,
          graphCellKeys: dataConfig.getAllCellKeys()
        }
        this.recalculateFormula(formulaContext, freshExtraMetadata)
      },
      { name: "BarChartFormulaAdapter.setupFormulaObservers.reaction" },
      graphContentModel
    )

    return () => {
      disposer?.()
    }
  }
}
