import { isAlive, isStateTreeNode } from "mobx-state-tree"
import { useCallback } from "react"
import { useDataDisplayModelContextMaybe } from "./use-data-display-model"

export const useDataDisplayAnimation = () => {
  const _model = useDataDisplayModelContextMaybe()
  // the slider does not provide a data display model
  const model = isStateTreeNode(_model) && isAlive(_model) ? _model : undefined
  const isAnimating = useCallback(() => !!model?.animationTimerId, [model])
  const startAnimation = useCallback(() => model?.startAnimation(), [model])
  const stopAnimation = useCallback(() => model?.stopAnimation(), [model])
  return { isAnimating, startAnimation, stopAnimation }
}
