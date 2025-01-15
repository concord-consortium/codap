import { IAnyStateTreeNode } from "mobx-state-tree"
import { DEBUG_FORMULAS, debugLog } from "../../../../lib/debug"
import { ICase } from "../../../../models/data/data-set-types"
import { registerFormulaAdapter } from "../../../../models/formula/formula-adapter-registry"
import type { IFormulaContext } from "../../../../models/formula/formula-manager-types"
import type { IFormulaAdapterApi } from "../../../../models/formula/formula-manager-adapter"
import { math } from "../../../../models/formula/functions/math"
import { formulaError } from "../../../../models/formula/utils/misc"
import { getFormulaManager } from "../../../../models/tiles/tile-environment"
import type { IGraphContentModel } from "../../models/graph-content-model"
import {
  BaseGraphFormulaAdapter, IBaseGraphFormulaExtraMetadata, getDefaultArgument
} from "../base-graph-formula-adapter"
import { isPlottedFunctionAdornment } from "./plotted-function-adornment-model"
import { FormulaFn, kPlottedFunctionType } from "./plotted-function-adornment-types"

const PLOTTED_FUNCTION_FORMULA_ADAPTER = "PlottedFunctionFormulaAdapter"

const X_ARG_SYMBOL = "x"

export interface IPlottedFunctionFormulaExtraMetadata extends IBaseGraphFormulaExtraMetadata {}

export class PlottedFunctionFormulaAdapter extends BaseGraphFormulaAdapter {

  static register() {
    registerFormulaAdapter(api => new PlottedFunctionFormulaAdapter(api))
  }

  static get(node?: IAnyStateTreeNode) {
    return getFormulaManager(node)?.adapters.find(({ type }) =>
      type === PLOTTED_FUNCTION_FORMULA_ADAPTER
    ) as Maybe<PlottedFunctionFormulaAdapter>
  }

  constructor(api: IFormulaAdapterApi) {
    super(PLOTTED_FUNCTION_FORMULA_ADAPTER, api)
  }

  getAdornment(graphContentModel: IGraphContentModel) {
    const adornment = graphContentModel.adornments.find(a => a.type === kPlottedFunctionType)
    if (adornment && isPlottedFunctionAdornment(adornment)) {
      return adornment
    }
  }

  recalculateFormula(formulaContext: IFormulaContext, extraMetadata: IPlottedFunctionFormulaExtraMetadata) {
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
      const formulaFunction = this.computeFormula(formulaContext, extraMetadata, cases)
      if (!adornment.plottedFunctions.get(instanceKey)) {
        adornment.addPlottedFunction(formulaFunction, instanceKey)
      } else {
        adornment.updatePlottedFunctionValue(formulaFunction, instanceKey)
      }
    })
  }

  computeFormula(
    formulaContext: IFormulaContext, extraMetadata: IPlottedFunctionFormulaExtraMetadata, childMostCases: ICase[]
  ): FormulaFn {
    const { formula } = formulaContext
    debugLog(DEBUG_FORMULAS, `[plotted function formula] recalculate "${formula.canonical}"`)
    const formulaScope = this.getMathJSScope(formulaContext, extraMetadata, childMostCases)

    try {
      const compiledFormula = math.compile(formula.canonical)
      const extraScope = new Map()
      formulaScope.setExtraScope(extraScope)
      return (x: number) => {
        // Plotted function lets users use special "x" symbol that is resolved to the currently plotted graph X-axis
        // value. The graph will do the rendering itself, so it expects a function that takes a single argument ("x").
        extraScope.set(X_ARG_SYMBOL, x)
        // Plotted function should also support use of the x-axis attribute name as a dummy variable. For example,
        // with mammals, in a scatterplot with Speed on the y-axis and Sleep on the x-axis, the formula `Sleep * Sleep`
        // should be valid. `getDefaultArgument` will return the name of the x-axis attribute, which is "Sleep" in this
        // case.
        extraScope.set(getDefaultArgument(this.getGraphContentModel(extraMetadata)), x)
        try {
          return compiledFormula.evaluate(formulaScope)
        } catch (e: any) {
          // This will catch any runtime error (e.g. using case-dependant attribute or undefined symbol).
          this.setFormulaError(formulaContext, extraMetadata, formulaError(e.message))
          return NaN
        }
      }
    } catch (e: any) {
      // This will catch any errors thrown by math.compile(). It's very unlikely it ever happens, as syntax error
      // should be caught by the parsers way before we get here, but just in case...
      this.setFormulaError(formulaContext, extraMetadata, formulaError(e.message))
    }
    return () => NaN
  }
}
