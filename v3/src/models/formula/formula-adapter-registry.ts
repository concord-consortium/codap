import { IFormulaAdapterApi, IFormulaManagerAdapter } from "./formula-manager-types"

export type FormulaAdapterCreateFn = (api: IFormulaAdapterApi) => IFormulaManagerAdapter

const formulaAdapterCreators: FormulaAdapterCreateFn[] = []

export function registerFormulaAdapter(adapterCreator: FormulaAdapterCreateFn) {
  formulaAdapterCreators.push(adapterCreator)
}

export function createFormulaAdapters(api: IFormulaAdapterApi) {
  return formulaAdapterCreators.map(creator => creator(api))
}
