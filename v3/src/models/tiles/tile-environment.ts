import { getEnv, hasEnv, IAnyStateTreeNode } from "mobx-state-tree"
import { ILogFunctionEnv } from "../../lib/log-message"
// There's nothing wrong in explicit ISharedModelManager interface, but probably dependency cycle could have been also
// avoided using `import type { SharedModelManager } from ...`.
import { ISharedModelManager } from "../shared/shared-model-manager"
import type { IFormulaManager } from "../formula/formula-manager-types"
import { IGlobalValueManager, kGlobalValueManagerType } from "../global/global-value-manager"
import { ICoreNotifyFunctionEnv } from "../../data-interactive/notification-core-types"

export interface ITileEnvironment extends
  Partial<ILogFunctionEnv>, Partial<ICoreNotifyFunctionEnv>
{
  sharedModelManager?: ISharedModelManager
  formulaManager?: IFormulaManager
}

export function getTileEnvironment(node?: IAnyStateTreeNode) {
  return node && hasEnv(node) ? getEnv<ITileEnvironment | undefined>(node) : undefined
}

export function getSharedModelManager(node?: IAnyStateTreeNode) {
  return getTileEnvironment(node)?.sharedModelManager
}

export function getFormulaManager(node?: IAnyStateTreeNode) {
  return getTileEnvironment(node)?.formulaManager
}

export function getGlobalValueManager(sharedModelManager?: ISharedModelManager) {
  return sharedModelManager?.getSharedModelsByType(kGlobalValueManagerType)?.[0] as IGlobalValueManager | undefined
}
