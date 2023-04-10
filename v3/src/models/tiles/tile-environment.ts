import { getEnv, IAnyStateTreeNode } from "mobx-state-tree"
import { ISharedModelManager } from "../shared/shared-model-manager"

export interface ITileEnvironment {
  sharedModelManager?: ISharedModelManager;
}

export function getTileEnvironment(node?: IAnyStateTreeNode) {
  return node ? getEnv<ITileEnvironment | undefined>(node) : undefined
}

export function getSharedModelManager(node?: IAnyStateTreeNode) {
  return getTileEnvironment(node)?.sharedModelManager
}
