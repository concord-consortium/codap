import iframePhone from "iframe-phone"
import { getEnv, IAnyStateTreeNode } from "mobx-state-tree"
import { DIMessage } from "../../data-interactive/iframe-phone-types"
// There's nothing wrong in explicit ISharedModelManager interface, but probably dependency cycle could have been also
// avoided using `import type { SharedModelManager } from ...`.
import { ISharedModelManager } from "../shared/shared-model-manager"
import type { FormulaManager } from "../formula/formula-manager"
import { IGlobalValueManager, kGlobalValueManagerType } from "../global/global-value-manager"

export interface ITileEnvironment {
  sharedModelManager?: ISharedModelManager
  formulaManager?: FormulaManager
  notify?: (message: DIMessage, callback: iframePhone.ListenerCallback) => void
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

export function getGlobalValueManager(sharedModelManager?: ISharedModelManager) {
  return sharedModelManager?.getSharedModelsByType(kGlobalValueManagerType)?.[0] as IGlobalValueManager | undefined
}

export function notify(node: IAnyStateTreeNode, message: DIMessage, callback: iframePhone.ListenerCallback) {
  getTileEnvironment(node)?.notify?.(message, callback)
}
