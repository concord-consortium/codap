import { useCallback, useEffect, useRef } from "react"
import { isAlive } from "mobx-state-tree"
import { IApplyModelChangeOptions } from "../../models/history/apply-model-change"
import { ISliderModel } from "./slider-model"

const kAnimationDuration = 500 // ms

// Ease-out cubic: fast start, slow finish
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * Hook that provides animated axis rescaling for the slider.
 * When the user edits the slider value to a position outside the current axis bounds,
 * this animates the axis from the old bounds to the new bounds using requestAnimationFrame
 * and the axis model's volatile setDynamicDomain, so the thumb slides into view.
 */
export function useSliderAxisAnimation(sliderModel: ISliderModel | undefined) {
  const rafRef = useRef<number>(0)

  const cancelAnimation = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
    if (sliderModel?._isAxisAnimating) {
      sliderModel.axis.clearDynamicDomain()
      sliderModel.setIsAxisAnimating(false)
    }
  }, [sliderModel])

  // Clean up on unmount
  useEffect(() => cancelAnimation, [cancelAnimation])

  const animateAxisToEncompass = useCallback((inputValue: number, options: IApplyModelChangeOptions) => {
    if (!sliderModel) return

    // Cancel any in-progress animation
    cancelAnimation()

    // Save old domain
    const oldMin = sliderModel.axis.domain[0]
    const oldMax = sliderModel.axis.domain[1]

    // Apply the model change atomically (for undo/redo)
    sliderModel.applyModelChange(
      () => {
        sliderModel.encompassValue(inputValue)
        sliderModel.setValue(inputValue)
      },
      options
    )

    // Read new persisted bounds after encompassValue
    const newMin = sliderModel.axis.min
    const newMax = sliderModel.axis.max

    // If bounds didn't change, no animation needed
    if (newMin === oldMin && newMax === oldMax) return

    // Start animation: override domain back to old bounds, then animate to new
    sliderModel.setIsAxisAnimating(true)
    sliderModel.axis.setDynamicDomain(oldMin, oldMax)

    const startTime = performance.now()

    function animate(currentTime: number) {
      // Stop if model was destroyed (e.g. tile closed) or persisted bounds changed (e.g. undo)
      if (!isAlive(sliderModel!) ||
          sliderModel!.axis.min !== newMin || sliderModel!.axis.max !== newMax) {
        rafRef.current = 0
        if (isAlive(sliderModel!)) {
          sliderModel!.axis.clearDynamicDomain()
          sliderModel!.setIsAxisAnimating(false)
        }
        return
      }

      const elapsed = currentTime - startTime
      const t = Math.min(elapsed / kAnimationDuration, 1)
      const eased = easeOutCubic(t)

      const min = oldMin + (newMin - oldMin) * eased
      const max = oldMax + (newMax - oldMax) * eased
      sliderModel!.axis.setDynamicDomain(min, max)

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        rafRef.current = 0
        sliderModel!.axis.clearDynamicDomain()
        sliderModel!.setIsAxisAnimating(false)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
  }, [sliderModel, cancelAnimation])

  return { animateAxisToEncompass, cancelAnimation }
}
