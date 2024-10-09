import { isAlive, isStateTreeNode } from "mobx-state-tree"
import { useCallback } from "react"
import { useDataDisplayModelContext } from "./use-data-display-model"

export const useDataDisplayAnimation = () => {
  const _model = useDataDisplayModelContext()
  // context is initialized with a default value that isn't a real model
  const model = isStateTreeNode(_model) && isAlive(_model) ? _model : undefined
  const isAnimating = useCallback(() => !!model?.animationTimerId, [model])
  const startAnimation = useCallback(() => model?.startAnimation(), [model])
  const stopAnimation = useCallback(() => model?.stopAnimation(), [model])
  return { isAnimating, startAnimation, stopAnimation }
}
