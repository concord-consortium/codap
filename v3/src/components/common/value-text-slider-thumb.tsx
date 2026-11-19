import { useContext, useRef } from "react"
import { mergeProps, useFocusRing, useHover, useSliderThumb, VisuallyHidden } from "react-aria"
import { SliderStateContext, SliderTrackContext, useSlottedContext } from "react-aria-components"

const kNoTrackRef = { current: null }

interface IProps {
  // Announced by screen readers in place of the thumb's numeric value
  valueText: string
  index?: number
}

/**
 * A replacement for React Aria Components' <SliderThumb>, for use inside a <SliderTrack>, that sets the input's
 * aria-valuetext, which <SliderThumb> doesn't support. Like <SliderThumb>, it is built on useSliderThumb, which labels
 * the input from the slider's <Label>, and it renders the same class and data attributes, so the same styles apply.
 */
export function ValueTextSliderThumb({ valueText, index = 0 }: IProps) {
  const state = useContext(SliderStateContext)
  if (!state) throw new Error("ValueTextSliderThumb must be rendered inside a Slider")

  // <SliderTrack> provides an object ref; the context's type also allows a callback ref
  const trackContextRef = useSlottedContext(SliderTrackContext)?.ref
  const trackRef = trackContextRef && typeof trackContextRef !== "function" ? trackContextRef : kNoTrackRef
  const inputRef = useRef<HTMLInputElement>(null)
  const { thumbProps, inputProps, isDragging, isFocused, isDisabled } = useSliderThumb(
    { index, trackRef, inputRef }, state
  )
  const { focusProps, isFocusVisible } = useFocusRing()
  const { hoverProps, isHovered } = useHover({})

  return (
    <div
      {...mergeProps(thumbProps, hoverProps)}
      className="react-aria-SliderThumb"
      data-hovered={isHovered || undefined}
      data-dragging={isDragging || undefined}
      data-focused={isFocused || undefined}
      data-focus-visible={isFocusVisible || undefined}
      data-disabled={isDisabled || undefined}
    >
      <VisuallyHidden>
        <input
          ref={inputRef}
          {...mergeProps(inputProps, focusProps, { "aria-valuetext": valueText })}
          data-testid="value-text-slider-thumb-input"
        />
      </VisuallyHidden>
    </div>
  )
}
