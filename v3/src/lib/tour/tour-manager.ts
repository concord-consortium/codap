import { driver, DriveStep, Driver } from "driver.js"
import "driver.js/dist/driver.css"
import "./tour-styles.scss"
import { DEBUG_PLUGINS, debugLog } from "../debug"
import { isWebViewModel } from "../../components/web-view/web-view-model"
import { findTileFromNameOrId } from "../../data-interactive/resource-parser-utils"
import { ITileModel } from "../../models/tiles/tile-model"
import { uniqueId } from "../../utilities/js-utils"
import { resolveElement, TourElementKey } from "./tour-elements"
import { defaultTourOptions, ITourConfig } from "./tour-types"

export interface TourStepInput {
  tourKey?: string
  testId?: string
  selector?: string
  component?: string
  popover?: { title?: string, description?: string, side?: string, align?: string }
  id?: string
  // per-step driver.js overrides
  disableActiveInteraction?: boolean
  stagePadding?: number
  stageRadius?: number
}

export interface HighlightRequestValues extends TourStepInput {
  overlayColor?: string
  overlayOpacity?: number
}

export interface TourRequestValues {
  steps: TourStepInput[]
  // Overlay options
  overlayColor?: string
  overlayOpacity?: number
  stagePadding?: number
  stageRadius?: number
  // Navigation options
  showButtons?: ("next" | "previous" | "close")[]
  disableButtons?: ("next" | "previous" | "close")[]
  showProgress?: boolean
  allowKeyboardControl?: boolean
  allowClose?: boolean
  disableActiveInteraction?: boolean
  // Presentation options
  animate?: boolean
  smoothScroll?: boolean
  popoverOffset?: number
  // Label customization
  progressText?: string
  nextBtnText?: string
  prevBtnText?: string
  doneBtnText?: string
}

interface ActiveTourState {
  type: "highlight" | "tour"
  driverInstance: Driver
  ownerTile: ITileModel | null
  tourId?: string
  originalSteps?: TourStepInput[]
  filteredSteps?: { input: TourStepInput, originalIndex: number }[]
  filteredToOriginalIndex?: number[]
  currentFilteredIdx?: number
  hasStartedStep?: boolean
  setCancelling?: () => void
  highlightId?: string
  highlightTarget?: Record<string, string>
}

class TourManager {
  private active: ActiveTourState | null = null

  /** Resolve a step's target to a DOM element and the targeting property for notifications */
  private resolveTarget(step: TourStepInput): { element: Element | null, targetProp: Record<string, string> } {
    if (step.tourKey) {
      if (!step.tourKey.includes(".")) {
        debugLog(DEBUG_PLUGINS, `Invalid tourKey "${step.tourKey}" — expected "namespace.element" format`)
        return { element: null, targetProp: { tourKey: step.tourKey } }
      }
      const resolved = resolveElement(step.tourKey as TourElementKey)
      if (!resolved) {
        debugLog(DEBUG_PLUGINS, `Unknown tourKey "${step.tourKey}" — not found in tour element registry`)
        return { element: null, targetProp: { tourKey: step.tourKey } }
      }
      const scope = step.component ? this.findComponentRoot(step.component) : document
      const el = scope?.querySelector(resolved.selector) ?? null
      return { element: el, targetProp: { tourKey: step.tourKey } }
    }
    if (step.testId) {
      try {
        const sel = `[data-testid="${CSS.escape(step.testId)}"]`
        const scope = step.component ? this.findComponentRoot(step.component) : document
        const el = scope?.querySelector(sel) ?? null
        return { element: el, targetProp: { testId: step.testId } }
      } catch { return { element: null, targetProp: { testId: step.testId } } }
    }
    if (step.selector) {
      try {
        const scope = step.component ? this.findComponentRoot(step.component) : document
        const el = scope?.querySelector(step.selector) ?? null
        return { element: el, targetProp: { selector: step.selector } }
      } catch { return { element: null, targetProp: { selector: step.selector } } }
    }
    // If only component is provided (no tourKey/testId/selector), target the tile itself
    if (step.component) {
      const el = this.findComponentRoot(step.component)
      return { element: el, targetProp: { component: step.component } }
    }
    return { element: null, targetProp: {} }
  }

  /** Find a tile's DOM root by name or ID */
  private findComponentRoot(nameOrId: string): Element | null {
    const tile = findTileFromNameOrId(nameOrId)
    if (!tile) return null
    return document.getElementById(tile.id)
  }

  /** Build popover config, merging registry defaults with plugin overrides */
  private buildPopover(step: TourStepInput): DriveStep["popover"] | undefined {
    let defaults: { title?: string, description?: string } = {}
    if (step.tourKey) {
      if (step.tourKey.includes(".")) {
        const resolved = resolveElement(step.tourKey as TourElementKey)
        if (resolved) {
          defaults = { title: resolved.title, description: resolved.description }
        }
      }
    }
    const title = step.popover?.title ?? defaults.title
    const description = step.popover?.description ?? defaults.description
    if (!title && !description) return undefined

    const popover: DriveStep["popover"] = { title, description }
    const rawSide = step.popover?.side
    const rawAlign = step.popover?.align
    if (rawSide === "top" || rawSide === "right" || rawSide === "bottom" || rawSide === "left") {
      popover.side = rawSide
    }
    if (rawAlign === "start" || rawAlign === "center" || rawAlign === "end") {
      popover.align = rawAlign
    }
    return popover
  }

  /** Send a notification to the owning plugin */
  private notify(tile: ITileModel, message: Record<string, unknown>) {
    const content = isWebViewModel(tile.content) ? tile.content : undefined
    content?.broadcastMessage(
      { action: "notify", resource: "interactiveFrame", values: message },
      () => { /* no-op callback */ }
    )
  }

  /** Extract the targeting property from a step input (tourKey > testId > selector) */
  private getTargetPropFromInput(input: TourStepInput): Record<string, string> {
    if (input.tourKey) return { tourKey: input.tourKey }
    if (input.testId) return { testId: input.testId }
    if (input.selector) return { selector: input.selector }
    return {}
  }

  /** Cancel the current active tour/highlight, notifying the owner if needed */
  cancelActive() {
    if (!this.active) return
    const { type, driverInstance, ownerTile } = this.active
    if (type === "tour") {
      this.active.setCancelling?.()
      if (ownerTile) {
        const notification: Record<string, unknown> = {
          operation: "tourUpdate",
          tourId: this.active.tourId,
          type: "cancelled",
          totalSteps: this.active.originalSteps?.length ?? 0,
          visibleSteps: this.active.filteredToOriginalIndex?.length ?? 0,
        }
        if (this.active.hasStartedStep) {
          const idx = this.active.currentFilteredIdx ?? 0
          const origIdx = this.active.filteredToOriginalIndex?.[idx] ?? 0
          const input = this.active.filteredSteps?.[idx]?.input
          notification.stepIndex = origIdx
          if (input?.id) notification.id = input.id
          if (input) Object.assign(notification, this.getTargetPropFromInput(input))
        }
        this.notify(ownerTile, notification)
      }
    } else if (type === "highlight" && ownerTile) {
      this.notify(ownerTile, {
        operation: "highlightUpdate",
        type: "highlightCleared",
        ...(this.active.highlightId && { id: this.active.highlightId }),
        ...this.active.highlightTarget
      })
    }
    driverInstance.destroy()
    this.active = null
  }

  /** Highlight a single element */
  highlight(tile: ITileModel, values: HighlightRequestValues) {
    this.cancelActive()

    const { element, targetProp } = this.resolveTarget(values)
    if (!element) return { success: true as const }

    const popover = this.buildPopover(values)
    const driverObj = driver({
      allowClose: true,
      allowKeyboardControl: true,
      overlayClickBehavior: "close",
      popoverClass: "codap-tour-popover",
      ...(values.overlayColor != null && { overlayColor: values.overlayColor }),
      ...(values.overlayOpacity != null && { overlayOpacity: values.overlayOpacity }),
      ...(values.stagePadding != null && { stagePadding: values.stagePadding }),
      ...(values.stageRadius != null && { stageRadius: values.stageRadius }),
      onDeselected: () => {
        if (this.active?.type === "highlight") {
          this.notify(tile, {
            operation: "highlightUpdate", type: "highlightCleared",
            ...(values.id && { id: values.id }), ...targetProp
          })
          this.active = null
        }
      }
    })

    this.active = {
      type: "highlight", driverInstance: driverObj, ownerTile: tile,
      highlightId: values.id, highlightTarget: targetProp
    }

    driverObj.highlight({ element: element as HTMLElement, popover })

    this.notify(tile, {
      operation: "highlightUpdate", type: "highlighted",
      ...(values.id && { id: values.id }), ...targetProp
    })

    return { success: true as const }
  }

  /** Clear an active highlight without notifying the calling plugin */
  clearHighlight(tile: ITileModel) {
    if (this.active?.type === "highlight") {
      const { ownerTile } = this.active
      // If a different plugin owns it, notify the owner
      if (ownerTile && ownerTile !== tile) {
        this.notify(ownerTile, {
          operation: "highlightUpdate", type: "highlightCleared",
          ...(this.active.highlightId && { id: this.active.highlightId }),
          ...this.active.highlightTarget
        })
      }
      this.active.driverInstance.destroy()
      this.active = null
    }
    return { success: true as const }
  }

  /** Start a multi-step tour */
  startTour(tile: ITileModel, values: TourRequestValues) {
    this.cancelActive()

    const tourId = `tour-${uniqueId()}`
    const originalSteps = values.steps ?? []
    const filteredSteps: { driverStep: DriveStep, originalIndex: number, input: TourStepInput }[] = []

    for (let i = 0; i < originalSteps.length; i++) {
      const step = originalSteps[i]
      const { element } = this.resolveTarget(step)
      if (!element) continue
      filteredSteps.push({
        driverStep: {
          element: element as HTMLElement,
          popover: this.buildPopover(step),
          ...(step.disableActiveInteraction != null && { disableActiveInteraction: step.disableActiveInteraction }),
          ...(step.stagePadding != null && { stagePadding: step.stagePadding }),
          ...(step.stageRadius != null && { stageRadius: step.stageRadius }),
        },
        originalIndex: i,
        input: step
      })
    }

    // Empty or all-filtered: immediate completed
    if (filteredSteps.length === 0) {
      this.notify(tile, {
        operation: "tourUpdate", tourId, type: "completed",
        totalSteps: originalSteps.length, visibleSteps: 0
      })
      return { success: true as const, values: { tourId } }
    }

    let isCancelling = false
    let currentFilteredIdx = 0
    const filteredToOriginalIndex = filteredSteps.map(s => s.originalIndex)

    const driverObj = driver({
      ...defaultTourOptions,
      ...(values.overlayColor != null && { overlayColor: values.overlayColor }),
      ...(values.overlayOpacity != null && { overlayOpacity: values.overlayOpacity }),
      ...(values.stagePadding != null && { stagePadding: values.stagePadding }),
      ...(values.stageRadius != null && { stageRadius: values.stageRadius }),
      ...(values.showButtons != null && { showButtons: values.showButtons }),
      ...(values.showProgress != null && { showProgress: values.showProgress }),
      ...(values.allowKeyboardControl != null && { allowKeyboardControl: values.allowKeyboardControl }),
      ...(values.allowClose != null && { allowClose: values.allowClose }),
      ...(values.disableActiveInteraction != null && { disableActiveInteraction: values.disableActiveInteraction }),
      ...(values.disableButtons != null && { disableButtons: values.disableButtons }),
      ...(values.animate != null && { animate: values.animate }),
      ...(values.smoothScroll != null && { smoothScroll: values.smoothScroll }),
      ...(values.popoverOffset != null && { popoverOffset: values.popoverOffset }),
      ...(values.progressText != null && { progressText: values.progressText }),
      ...(values.nextBtnText != null && { nextBtnText: values.nextBtnText }),
      ...(values.prevBtnText != null && { prevBtnText: values.prevBtnText }),
      ...(values.doneBtnText != null && { doneBtnText: values.doneBtnText }),
      steps: filteredSteps.map(s => s.driverStep),
      onHighlightStarted: (_el: unknown, _step: unknown, { state }: { state: { activeIndex?: number } }) => {
        if (isCancelling) return
        currentFilteredIdx = state.activeIndex ?? 0
        if (this.active) {
          this.active.currentFilteredIdx = currentFilteredIdx
          this.active.hasStartedStep = true
        }
        const origIdx = filteredToOriginalIndex[currentFilteredIdx]
        const input = filteredSteps[currentFilteredIdx].input
        this.notify(tile, {
          operation: "tourUpdate", tourId, type: "stepStarted",
          stepIndex: origIdx, totalSteps: originalSteps.length,
          visibleSteps: filteredSteps.length,
          ...(input.id && { id: input.id }),
          ...this.getTargetPropFromInput(input)
        })
      },
      onDeselected: () => {
        if (isCancelling) return
        const origIdx = filteredToOriginalIndex[currentFilteredIdx]
        const input = filteredSteps[currentFilteredIdx].input
        this.notify(tile, {
          operation: "tourUpdate", tourId, type: "stepEnded",
          stepIndex: origIdx, totalSteps: originalSteps.length,
          visibleSteps: filteredSteps.length,
          ...(input.id && { id: input.id }),
          ...this.getTargetPropFromInput(input)
        })
      },
      onDestroyed: () => {
        if (isCancelling) return
        this.notify(tile, {
          operation: "tourUpdate", tourId, type: "completed",
          totalSteps: originalSteps.length, visibleSteps: filteredSteps.length
        })
        this.active = null
      }
    })

    this.active = {
      type: "tour", driverInstance: driverObj, ownerTile: tile, tourId,
      originalSteps,
      filteredToOriginalIndex,
      filteredSteps: filteredSteps.map(s => ({ input: s.input, originalIndex: s.originalIndex })),
      currentFilteredIdx: 0,
      hasStartedStep: false,
      setCancelling: () => { isCancelling = true }
    }

    driverObj.drive()
    return { success: true as const, values: { tourId } }
  }

  /** End an active tour, with optional tourId safety check */
  endTour(tile: ITileModel, tourId?: string) {
    if (this.active?.type !== "tour") return { success: true as const }
    if (this.active.ownerTile && this.active.ownerTile !== tile) return { success: true as const }
    if (tourId && this.active.tourId !== tourId) return { success: true as const }
    this.cancelActive()
    return { success: true as const }
  }

  /** Advance to the next tour step programmatically */
  tourNext(tile: ITileModel) {
    if (this.active?.type !== "tour") return { success: true as const }
    if (this.active.ownerTile && this.active.ownerTile !== tile) return { success: true as const }
    this.active.driverInstance.moveNext()
    return { success: true as const }
  }

  /** Move to the previous tour step programmatically */
  tourPrevious(tile: ITileModel) {
    if (this.active?.type !== "tour") return { success: true as const }
    if (this.active.ownerTile && this.active.ownerTile !== tile) return { success: true as const }
    this.active.driverInstance.movePrevious()
    return { success: true as const }
  }

  /** Move to a specific tour step by original (pre-filter) step index */
  tourMoveTo(tile: ITileModel, stepIndex?: number) {
    if (this.active?.type !== "tour" || stepIndex == null) return { success: true as const }
    if (this.active.ownerTile && this.active.ownerTile !== tile) return { success: true as const }
    const filteredIdx = this.active.filteredToOriginalIndex?.indexOf(stepIndex)
    if (filteredIdx == null || filteredIdx < 0) return { success: true as const }
    this.active.driverInstance.moveTo(filteredIdx)
    return { success: true as const }
  }

  /** Refresh the tour overlay/popover position after a layout change */
  tourRefresh(tile: ITileModel) {
    if (!this.active) return { success: true as const }
    if (this.active.ownerTile && this.active.ownerTile !== tile) return { success: true as const }
    this.active.driverInstance.refresh()
    return { success: true as const }
  }

  /** Run an internal (non-plugin) tour, e.g. the feature tour from the Help menu */
  runInternalTour(config: ITourConfig) {
    this.cancelActive()

    const activeSteps = config.steps.filter(step => {
      if (step.skip) return false
      if (typeof step.element === "string" && !document.querySelector(step.element)) return false
      return true
    })
    if (activeSteps.length === 0) return

    const driverObj = driver({
      ...config.options,
      steps: activeSteps
    })

    this.active = {
      type: "tour", driverInstance: driverObj, ownerTile: null
    }

    driverObj.drive()
  }

  /** Clean up any active tour/highlight owned by a disconnecting plugin tile */
  cleanupForTile(tile: ITileModel) {
    if (this.active?.ownerTile === tile) {
      this.active.driverInstance.destroy()
      this.active = null
    }
  }

  /** Check if there is an active tour or highlight (for testing) */
  get isActive() {
    return this.active != null
  }

  /** Get the active tour ID (for testing) */
  get activeTourId() {
    return this.active?.tourId
  }

  /** Get the active type (for testing) */
  get activeType() {
    return this.active?.type
  }
}

export const tourManager = new TourManager()
