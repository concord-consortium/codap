import {
  arrow, autoUpdate, FloatingArrow, FloatingPortal, flip, Middleware, offset, Placement, shift, useFloating
} from "@floating-ui/react"
import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { renderProgressText } from "./progress-text"
import { scrollTargetIntoView } from "./scroll-into-view"
import { EngineLiveState } from "./tour-engine-state"
import { EngineStep, EngineStepPopover } from "./tour-engine-types"
import { useKeyboardControl } from "./use-keyboard-control"
import { usePopoverDrag } from "./use-popover-drag"
import { useReducedMotion } from "./use-reduced-motion"
import { useTargetWatcher } from "./use-target-watcher"
import CloseIcon from "../../../assets/icons/close-tile-icon.svg"

interface PopoverProps { state: EngineLiveState }

function resolvePlacement(side: EngineStepPopover["side"], align: EngineStepPopover["align"]): Placement {
  const s = side ?? "right"
  if (align && align !== "center") {
    return `${s}-${align}` as Placement
  }
  return s as Placement
}

export const Popover = observer(function Popover({ state }: PopoverProps) {
  if (!state.currentStep) return null
  return <PopoverContent state={state} step={state.currentStep} />
})

interface PopoverContentProps { state: EngineLiveState, step: EngineStep }

const PopoverContent = observer(function PopoverContent({ state, step }: PopoverContentProps) {
  const opts = state.options
  const arrowRef = useRef<SVGSVGElement>(null)
  const [popoverEl, setPopoverEl] = useState<HTMLElement | null>(null)

  const { position: dragPosition, isDragging, onPointerDown } = usePopoverDrag(step.element, popoverEl)

  const dragPlacement = useMemo<Placement | null>(() => {
    if (!dragPosition || !popoverEl) return null
    const targetRect = step.element.getBoundingClientRect()
    const popCx = dragPosition.x + popoverEl.offsetWidth / 2
    const popCy = dragPosition.y + popoverEl.offsetHeight / 2
    const tCx = targetRect.left + targetRect.width / 2
    const tCy = targetRect.top + targetRect.height / 2
    const dx = popCx - tCx
    const dy = popCy - tCy
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left"
    return dy > 0 ? "bottom" : "top"
  }, [dragPosition, popoverEl, step.element])

  const middleware = useMemo<Middleware[]>(() => {
    if (dragPosition) {
      return [
        {
          name: `dragOverride-${dragPosition.x}-${dragPosition.y}`,
          fn: () => ({ x: dragPosition.x, y: dragPosition.y })
        },
        arrow({ element: arrowRef, padding: 4 })
      ]
    }
    return [
      offset(opts.popoverOffset ?? 10),
      flip(),
      shift({ padding: 8 }),
      arrow({ element: arrowRef, padding: 4 })
    ]
  }, [opts.popoverOffset, dragPosition])

  const { refs, floatingStyles, context, placement, update } = useFloating({
    strategy: "fixed",
    placement: dragPlacement ?? resolvePlacement(step.popover?.side, step.popover?.align),
    middleware,
    whileElementsMounted: autoUpdate,
  })

  useEffect(() => {
    refs.setReference(step.element)
  }, [step.element, refs])

  const setFloating = useCallback((el: HTMLElement | null) => {
    refs.setFloating(el)
    setPopoverEl(el)
  }, [refs])

  // Focus the popover on first mount so arrow-key navigation works immediately.
  // Without this, focus stays on whatever launched the tour (often a plugin iframe),
  // and keystrokes never reach the document-level keydown listener.
  useEffect(() => {
    if (popoverEl) popoverEl.focus()
  }, [popoverEl])

  useEffect(() => {
    scrollTargetIntoView(step.element, opts.smoothScroll ?? false)
  }, [step.element, opts.smoothScroll])

  useEffect(() => { update() }, [state.refreshTick, update])

  const onTargetRemoved = useCallback(() => state.cancel(), [state])
  useTargetWatcher(step.element, onTargetRemoved)

  useKeyboardControl({
    enabled: opts.allowKeyboardControl ?? true,
    allowClose: opts.allowClose ?? true,
    popoverEl,
    onNext: () => state.moveNext(),
    onPrev: () => state.movePrevious(),
    onClose: () => state.cancel(),
  })

  const isFirst = state.activeIndex === 0
  const isLast = state.activeIndex === state.steps.length - 1
  const showButtons = opts.showButtons ?? ["next", "previous", "close"]
  const disabled = new Set(opts.disableButtons ?? [])
  const reducedMotion = useReducedMotion()
  const animationsDisabled = opts.animate === false
  const popoverClass = clsx(
    "codap-tour-popover",
    (reducedMotion || animationsDisabled) && "codap-tour-popover--reduced-motion",
    isDragging && "codap-tour-popover--dragging",
  )
  const arrowSide = placement.split("-")[0] as "top" | "right" | "bottom" | "left"

  return (
    <FloatingPortal>
      <div
        ref={setFloating}
        style={floatingStyles}
        role="region"
        aria-label="Tour step"
        tabIndex={-1}
        className={popoverClass}
        data-testid="codap-tour-popover"
        onPointerDown={onPointerDown}
      >
        <div aria-live="polite" aria-atomic="true" data-testid="codap-tour-popover-live-region">
          {step.popover?.title && (
            <div className="codap-tour-popover-title" data-testid="codap-tour-popover-title">
              {step.popover.title}
            </div>
          )}
          {step.popover?.description && (
            <div
              className="codap-tour-popover-description"
              data-testid="codap-tour-popover-description"
            >
              {step.popover.description}
            </div>
          )}
          {opts.showProgress && state.kind === "tour" && (
            <div
              className="codap-tour-popover-progress-text"
              data-testid="codap-tour-popover-progress-text"
            >
              {renderProgressText(opts.progressText, state.activeIndex + 1, state.steps.length)}
            </div>
          )}
        </div>
        <div className="codap-tour-popover-buttons">
          {showButtons.includes("previous") && !isFirst && (
            <button
              type="button"
              className="codap-tour-popover-prev-btn"
              data-testid="codap-tour-popover-prev-btn"
              disabled={disabled.has("previous")}
              onClick={() => state.movePrevious()}
            >
              {opts.prevBtnText ?? "Previous"}
            </button>
          )}
          {showButtons.includes("next") && (
            <button
              type="button"
              className="codap-tour-popover-next-btn"
              data-testid="codap-tour-popover-next-btn"
              disabled={disabled.has("next")}
              onClick={() => state.moveNext()}
            >
              {isLast ? (opts.doneBtnText ?? "Done") : (opts.nextBtnText ?? "Next")}
            </button>
          )}
        </div>
        {showButtons.includes("close") && (opts.allowClose ?? true) && (
          <button
            type="button"
            aria-label="Close"
            className="codap-tour-popover-close-btn"
            data-testid="codap-tour-popover-close-btn"
            onClick={() => state.cancel()}
          >
            <CloseIcon className="codap-tour-popover-close-icon"/>
          </button>
        )}
        <FloatingArrow
          ref={arrowRef}
          context={context}
          className={`codap-tour-popover-arrow-side-${arrowSide}`}
          fill="var(--codap-tour-popover-bg)"
          stroke="var(--codap-tour-popover-border)"
          strokeWidth={1}
        />
      </div>
    </FloatingPortal>
  )
})
