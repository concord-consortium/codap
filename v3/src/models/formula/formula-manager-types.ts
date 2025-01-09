import { BoundaryManager } from "../boundaries/boundary-manager"
import { IDataSet } from "../data/data-set"
import { IGlobalValueManager } from "../global/global-value-manager"
import { ITileContentModel } from "../tiles/tile-content"
import { IFormula } from "./formula"
import { CaseList } from "./formula-types"

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

export interface IFormulaAdapterApi {
  getDatasets: () => Map<string, IDataSet>
  getBoundaryManager: () => Maybe<BoundaryManager>
  getGlobalValueManager: () => Maybe<IGlobalValueManager>
  getFormulaContext(formulaId: string): IFormulaContext
  getFormulaExtraMetadata(formulaId: string): IFormulaExtraMetadata
}

export class FormulaManagerAdapter implements IFormulaManagerAdapter {
  type: string
  api: IFormulaAdapterApi

  constructor(type: string, api: IFormulaAdapterApi) {
    this.type = type
    this.api = api
  }

  addContentModel(tileContent: ITileContentModel) {
    // subclasses should override if they deal with content models
  }

  removeContentModel(IMapContentModelId: string) {
    // subclasses should override if they deal with content models
  }

  getActiveFormulas() {
    // subclasses should override
    return [] as Array<{ formula: IFormula, extraMetadata: any }>
  }

  recalculateFormula(formulaContext: IFormulaContext, extraMetadata: any, casesToRecalculateDesc?: CaseList) {
    // subclasses should override
  }

  getFormulaError(formulaContext: IFormulaContext, extraMetadata: any): Maybe<string> {
    // subclasses should override
    return undefined
  }

  setFormulaError(formulaContext: IFormulaContext, extraMetadata: any, errorMsg: string) {
    // subclasses should override
  }

  setupFormulaObservers(formulaContext: IFormulaContext, extraMetadata: any): () => void {
    // subclasses should override
    return () => undefined
  }
}

export interface IFormulaManagerAdapter {
  type: string
  // This method returns all the formulas supported by this adapter. It should exclusively return formulas that need
  // active tracking and recalculation whenever any of their dependencies change. The adapter might opt not to return
  // formulas that currently shouldn't be recalculated, such as when the formula's adornment is hidden.
  addContentModel: (contentModel: ITileContentModel) => void
  removeContentModel: (IMapContentModelId: string) => void
  getActiveFormulas: () => ({ formula: IFormula, extraMetadata: any })[]
  recalculateFormula: (formulaContext: IFormulaContext, extraMetadata: any, casesToRecalculateDesc?: CaseList) => void
  getFormulaError: (formulaContext: IFormulaContext, extraMetadata: any) => Maybe<string>
  setFormulaError: (formulaContext: IFormulaContext, extraMetadata: any, errorMsg: string) => void
  setupFormulaObservers?: (formulaContext: IFormulaContext, extraMetadata: any) => () => void
}
