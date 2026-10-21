export interface EngineStepPopover {
  title?: string
  description?: string
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
}

export interface EngineStep {
  element: HTMLElement
  popover?: EngineStepPopover
}

export interface EngineOptions {
  showButtons?: ("next" | "previous" | "close")[]
  disableButtons?: ("next" | "previous")[]
  showProgress?: boolean
  allowKeyboardControl?: boolean
  allowClose?: boolean
  animate?: boolean
  smoothScroll?: boolean
  popoverOffset?: number
  progressText?: string
  nextBtnText?: string
  prevBtnText?: string
  doneBtnText?: string
}

export interface EngineLifecycleState { activeIndex: number }

export interface EngineCallbacks {
  /** Called when a step becomes active, before its popover renders. For highlights, called once. */
  onHighlightStarted?: (el: HTMLElement, step: EngineStep, ctx: { state: EngineLifecycleState }) => void
  /** Called when leaving a step: any navigation, or the tour ending. */
  onDeselected?: () => void
  /** Called when the engine has reached the end of a tour (not cancellation). */
  onDestroyed?: () => void
  /**
   * Called when the engine needs the manager to cancel: user clicked close, pressed Escape,
   * or the current step's target element was removed from the DOM mid-step.
   */
  onCancelRequested?: () => void
}

export interface EngineHandle {
  drive(): void
  highlight(step: EngineStep): void
  moveNext(): void
  movePrevious(): void
  moveTo(index: number): void
  refresh(): void
  destroy(): void
}

export interface CreateTourEngineArgs extends EngineOptions, EngineCallbacks {
  steps?: EngineStep[]
}
