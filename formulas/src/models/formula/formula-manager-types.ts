// eslint-disable-next-line import-x/no-cycle
import { IDataSet } from "../data/data-set"
import type { ICase } from "../data/data-set-types"
import { IAnyStateTreeNode } from "mobx-state-tree"
import type { IFormula } from "./formula"
import { IGlobalValueManager } from "../global/global-value-manager"

export type CaseList = ICase[] | "ALL_CASES"
export interface IFormulaMetadata {
  formula: IFormula
  registeredDisplay: string
  isInitialized: boolean
  adapter: IFormulaManagerAdapter
  dispose?: () => void
}

// Note that specific formula adapters might extend this interface and provide more information.
// `dataSetId` is the required minimum, as each formula is always associated with a single data set that is considered
// to be the "local one" (e.g. any formula's symbol is resolved to an attribute of this data set).
export interface IFormulaExtraMetadata {
  dataSetId: string
  attributeId?: string
  defaultArgument?: string
}

export interface IFormulaContext extends Partial<IFormulaMetadata> {
  dataSet: IDataSet
  formula: IFormula
}

export interface IFormulaManagerAdapter {
  type: string
  addContentModel: (contentModel: IAnyStateTreeNode) => void
  removeContentModel: (contentModelId: string) => void
  // This method returns all the formulas supported by this adapter. It should exclusively return formulas that need
  // active tracking and recalculation whenever any of their dependencies change. The adapter might opt not to return
  // formulas that currently shouldn't be recalculated, such as when the formula's adornment is hidden.
  getActiveFormulas: () => ({ formula: IFormula, extraMetadata: any })[]
  recalculateFormula: (formulaContext: IFormulaContext, extraMetadata: any, casesToRecalculateDesc?: CaseList) => void
  getFormulaError: (formulaContext: IFormulaContext, extraMetadata: any) => Maybe<string>
  setFormulaError: (formulaContext: IFormulaContext, extraMetadata: any, errorMsg: string) => void
  setupFormulaObservers?: (formulaContext: IFormulaContext, extraMetadata: any) => () => void
}

export interface IFormulaManager {
  adapters: IFormulaManagerAdapter[]
  areAdaptersInitialized: boolean

  addDataSet: (dataSet: IDataSet) => void
  removeDataSet: (dataSetId: string) => void
  getSyntaxError: (displayString: string) => any
  isRandomFunctionPresent: (canonicalString: string) => boolean
  rerandomize: (formulaId: string) => void
  /**
   * Note: This overlaps with `registerGlobalValueManagerLookupFunction`. If you have a global value manager
   * registered, you need to call this function too.
   */
  addGlobalValueManager(globalValueManager: IGlobalValueManager): void
}
