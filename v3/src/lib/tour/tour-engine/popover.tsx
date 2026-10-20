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
import { t } from "../../../utilities/translation/translate"
import CloseIcon from "../../../assets/icons/close-tile-icon.svg"

interface PopoverProps { state: EngineLiveState }

function resolvePlacement(side: EngineStepPopover["side"], align: EngineStepPopover["align"]): Placement {
  const s = side ?? "right"
  if (align && align !== "center") {
    return `${s}-${align}`
  }
  return s
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

  // Reset drag on step transition. Keyed on activeIndex (not step.element) so consecutive
  // steps targeting the same element still reset the drag offset.
  const { position: dragPosition, isDragging, onPointerDown } = usePopoverDrag(state.activeIndex, popoverEl)

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

  // Focus does not move to the popover on step start, except when focus is in an iframe
  // (typical when a plugin starts the tour): keydown events never bubble out of an iframe,
  // so arrow/Escape would be dead. This works as a unit with `tabIndex={-1}` on the popover
  // root below and the `.codap-tour-popover:focus { outline: none }` rule in tour-styles.scss;
  // change one and the others need revisiting.
  useEffect(() => {
    if (popoverEl && document.activeElement?.tagName === "IFRAME") popoverEl.focus()
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

  // Previous is hidden on the first step, so going back to it would drop focus to <body>.
  const nextBtnRef = useRef<HTMLButtonElement>(null)
  const refocusAfterPrevious = useRef(false)
  const handlePrevious = () => {
    refocusAfterPrevious.current = true
    state.movePrevious()
  }
  useEffect(() => {
    if (!refocusAfterPrevious.current) return
    refocusAfterPrevious.current = false
    if (!popoverEl?.contains(document.activeElement)) (nextBtnRef.current ?? popoverEl)?.focus()
  }, [state.activeIndex, popoverEl])

  // Screen readers ignore a live region that is already filled when it appears, so the
  // region mounts empty and receives the step text once it is in the accessibility tree.
  const announcement = [step.popover?.title, step.popover?.description].filter(Boolean).join(" ")
  const [liveText, setLiveText] = useState("")
  useEffect(() => {
    const timer = window.setTimeout(() => setLiveText(announcement), 100)
    return () => window.clearTimeout(timer)
  }, [announcement])

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
        aria-label={t("V3.Tour.stepRegion")}
        tabIndex={-1}
        className={popoverClass}
        data-testid="codap-tour-popover"
        onPointerDown={onPointerDown}
      >
        <div className="codap-visually-hidden" aria-live="polite" aria-atomic="true"
            data-testid="codap-tour-popover-live-region">
          {liveText}
        </div>
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
        <div className="codap-tour-popover-buttons">
          {showButtons.includes("previous") && !isFirst && (
            <button
              type="button"
              className="codap-tour-popover-prev-btn"
              data-testid="codap-tour-popover-prev-btn"
              disabled={disabled.has("previous")}
              onClick={handlePrevious}
            >
              {opts.prevBtnText ?? t("V3.Tour.previous")}
            </button>
          )}
          {showButtons.includes("next") && (
            <button
              ref={nextBtnRef}
              type="button"
              className="codap-tour-popover-next-btn"
              data-testid="codap-tour-popover-next-btn"
              disabled={disabled.has("next")}
              onClick={() => state.moveNext()}
            >
              {isLast
                ? (opts.doneBtnText ?? t(state.kind === "tour" ? "V3.Tour.gotIt" : "V3.Tour.done"))
                : (opts.nextBtnText ?? t("V3.Tour.next"))}
            </button>
          )}
        </div>
        {showButtons.includes("close") && (opts.allowClose ?? true) && (
          <button
            type="button"
            aria-label={t("V3.Tour.close")}
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
