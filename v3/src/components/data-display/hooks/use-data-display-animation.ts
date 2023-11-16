import { useCallback } from "react"
import { useDataDisplayModelContext } from "./use-data-display-model"

export const useDataDisplayAnimation = () => {
  const model = useDataDisplayModelContext()
  const isAnimating = useCallback(() => model.animationEnabled, [model])
  const startAnimation = useCallback(() => model.startAnimation(), [model])
  const stopAnimation = useCallback(() => model.stopAnimation(), [model])
  return { isAnimating, startAnimation, stopAnimation }
}
