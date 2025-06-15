import { IAnyStateTreeNode } from "mobx-state-tree"
import { BoundaryManager } from "../boundaries/boundary-manager"
import { IDataSet } from "../data/data-set"
import { IGlobalValueManager } from "../global/global-value-manager"
import { IFormula } from "./formula"
import { IFormulaManagerAdapter, IFormulaContext, IFormulaExtraMetadata, CaseList } from "./formula-manager-types"

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

  addContentModel(tileContent: IAnyStateTreeNode) {
    // subclasses should override if they deal with content models
  }

  removeContentModel(IMapContentModelId: string) {
    // subclasses should override if they deal with content models
  }

  getActiveFormulas() {
    // subclasses should override
    return [] as Array<{ formula: IFormula; extraMetadata: any; }>
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
