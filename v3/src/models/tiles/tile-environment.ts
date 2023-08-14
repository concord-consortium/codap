import { getEnv, IAnyStateTreeNode } from "mobx-state-tree"
// There's nothing wrong in explicit ISharedModelManager interface, but probably dependency cycle could have been also
// avoided using `import type { SharedModelManager } from ...`.
import { ISharedModelManager } from "../shared/shared-model-manager"
import type { FormulaManager } from "../data/formula-manager"

export interface ITileEnvironment {
  sharedModelManager?: ISharedModelManager
  formulaManager?: FormulaManager
}

export function getTileEnvironment(node?: IAnyStateTreeNode) {
  return node ? getEnv<ITileEnvironment | undefined>(node) : undefined
}

export function getSharedModelManager(node?: IAnyStateTreeNode) {
  return getTileEnvironment(node)?.sharedModelManager
}

export function getFormulaManager(node?: IAnyStateTreeNode) {
  return getTileEnvironment(node)?.formulaManager
}
