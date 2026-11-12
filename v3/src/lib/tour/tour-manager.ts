import {
  createCoachmarksEngine, CreateCoachmarksEngineArgs, EngineHandle, EngineStep, isLaidOut
} from "@concord-consortium/coachmarks"
// After the package import, so the theme's rules follow coachmarks' base.css in the bundle.
import "@concord-consortium/coachmarks/styles/codap"
import { createElement } from "react"
import CloseIcon from "../../assets/icons/close-tile-icon.svg"
import { DEBUG_PLUGINS, debugLog } from "../debug"
import { isWebViewModel } from "../../components/web-view/web-view-model"
import { findTileFromNameOrId } from "../../data-interactive/resource-parser-utils"
import { ITileModel } from "../../models/tiles/tile-model"
import { uniqueId } from "../../utilities/js-utils"
import { t } from "../../utilities/translation/translate"
import { resolveElement, TourElementKey } from "./tour-elements"
import { defaultTourOptions, ITourConfig, ITourOptions, ITourPopover } from "./tour-types"

export interface TourStepInput {
  tourKey?: string
  testId?: string
  selector?: string
  component?: string
  popover?: { title?: string, description?: string, side?: string, align?: string }
  id?: string
}

export interface HighlightRequestValues extends TourStepInput {}

export interface TourRequestValues extends ITourOptions {
  steps: TourStepInput[]
}

/** CODAP's look and wording for a tour or highlight. A plugin's own options are spread over these. */
function codapPresentation(kind: "tour" | "highlight"): CreateCoachmarksEngineArgs {
  return {
    initialFocus: "none",
    showAvatar: false,
    smoothScroll: false,
    ariaLabel: t("V3.Tour.stepRegion"),
    closeBtnAriaLabel: t("V3.Tour.close"),
    closeIcon: createElement(CloseIcon, { className: "coachmarks-popover-close-icon" }),
    prevBtnText: t("V3.Tour.previous"),
    nextBtnText: t("V3.Tour.next"),
    doneBtnText: t(kind === "tour" ? "V3.Tour.gotIt" : "V3.Tour.done"),
    // coachmarks fills {{current}} and {{total}}; CODAP's string uses %{current} and %{total}.
    progressText: t("V3.Tour.progress", { vars: { current: "{{current}}", total: "{{total}}" } }),
  }
}

/** coachmarks defaults a popover to the top; CODAP's tours default to the right. */
function withCodapSide(popover?: ITourPopover): ITourPopover {
  return { ...popover, side: popover?.side ?? "right" }
}

/** An element the engine can anchor a popover to: in the document and laid out. */
function isShowable(el: Element | null): el is HTMLElement {
  return !!el && isLaidOut(el as HTMLElement)
}

interface ActiveTourState {
  type: "highlight" | "tour"
  engineInstance: EngineHandle
  ownerTile: ITileModel | null
  tourId?: string
  originalSteps?: TourStepInput[]
  filteredSteps?: { input: TourStepInput, originalIndex: number }[]
  filteredToOriginalIndex?: number[]
  currentFilteredIdx?: number
  hasStartedStep?: boolean
  highlightId?: string
  highlightTarget?: Record<string, string>
}

class TourManager {
  private active: ActiveTourState | null = null

  /** Resolve a step's target to a DOM element and the targeting property for notifications */
  private resolveTarget(step: TourStepInput): { element: Element | null, targetProp: Record<string, string> } {
    const componentEcho: Record<string, string> = step.component ? { component: step.component } : {}
    if (step.tourKey) {
      if (!step.tourKey.includes(".")) {
        debugLog(DEBUG_PLUGINS, `Invalid tourKey "${step.tourKey}" — expected "namespace.element" format`)
        return { element: null, targetProp: { tourKey: step.tourKey, ...componentEcho } }
      }
      const resolved = resolveElement(step.tourKey as TourElementKey)
      if (!resolved) {
        debugLog(DEBUG_PLUGINS, `Unknown tourKey "${step.tourKey}" — not found in tour element registry`)
        return { element: null, targetProp: { tourKey: step.tourKey, ...componentEcho } }
      }
      const scope = step.component ? this.findComponentRoot(step.component) : document
      const el = scope?.querySelector(resolved.selector) ?? null
      return { element: el, targetProp: { tourKey: step.tourKey, ...componentEcho } }
    }
    if (step.testId) {
      try {
        const sel = `[data-testid="${CSS.escape(step.testId)}"]`
        const scope = step.component ? this.findComponentRoot(step.component) : document
        const el = scope?.querySelector(sel) ?? null
        return { element: el, targetProp: { testId: step.testId, ...componentEcho } }
      } catch { return { element: null, targetProp: { testId: step.testId, ...componentEcho } } }
    }
    if (step.selector) {
      try {
        const scope = step.component ? this.findComponentRoot(step.component) : document
        const el = scope?.querySelector(step.selector) ?? null
        return { element: el, targetProp: { selector: step.selector, ...componentEcho } }
      } catch { return { element: null, targetProp: { selector: step.selector, ...componentEcho } } }
    }
    // If only component is provided (no tourKey/testId/selector), target the tile itself.
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
  private buildPopover(step: TourStepInput): ITourPopover {
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

    const popover: ITourPopover = {}
    if (title) popover.title = title
    if (description) popover.description = description
    const rawSide = step.popover?.side
    const rawAlign = step.popover?.align
    if (rawSide === "top" || rawSide === "right" || rawSide === "bottom" || rawSide === "left") {
      popover.side = rawSide
    }
    if (rawAlign === "start" || rawAlign === "center" || rawAlign === "end") {
      popover.align = rawAlign
    }
    return withCodapSide(popover)
  }

  /** Send a notification to the owning plugin */
  private notify(tile: ITileModel, message: Record<string, unknown>) {
    const content = isWebViewModel(tile.content) ? tile.content : undefined
    content?.broadcastMessage(
      { action: "notify", resource: "interactiveFrame", values: message },
      () => { /* no-op callback */ }
    )
  }

  /** Extract the targeting property from a step input (tourKey > testId > selector, plus component echo) */
  private getTargetPropFromInput(input: TourStepInput): Record<string, string> {
    const out: Record<string, string> = {}
    if (input.tourKey) out.tourKey = input.tourKey
    else if (input.testId) out.testId = input.testId
    else if (input.selector) out.selector = input.selector
    if (input.component) out.component = input.component
    return out
  }

  /** Ends the active tour or highlight. Callbacks the engine fires while tearing down are ignored. */
  private endActive() {
    const active = this.active
    this.active = null
    active?.engineInstance.destroy()
  }

  /** Cancel the current active tour/highlight, notifying the owner if needed */
  cancelActive() {
    if (!this.active) return
    const { type, ownerTile } = this.active
    if (type === "tour") {
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
    this.endActive()
  }

  /** Highlight a single element */
  highlight(tile: ITileModel, values: HighlightRequestValues) {
    this.cancelActive()

    const { element, targetProp } = this.resolveTarget(values)
    if (!isShowable(element)) return { success: true as const }

    const isCurrent = () => this.active?.engineInstance === engineObj
    const engineObj = createCoachmarksEngine({
      ...codapPresentation("highlight"),
      allowClose: true,
      allowKeyboardControl: true,
      onCancelRequested: () => { if (isCurrent()) this.cancelActive() },
      onDestroyed: () => {
        if (!isCurrent() || this.active?.type !== "highlight") return
        const { ownerTile, highlightId, highlightTarget } = this.active
        if (ownerTile) {
          this.notify(ownerTile, {
            operation: "highlightUpdate", type: "highlightCleared",
            ...(highlightId && { id: highlightId }),
            ...highlightTarget
          })
        }
        this.active = null
      }
    })

    this.active = {
      type: "highlight", engineInstance: engineObj, ownerTile: tile,
      highlightId: values.id, highlightTarget: targetProp
    }

    engineObj.highlight({ element, popover: this.buildPopover(values) })

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
      this.endActive()
    }
    return { success: true as const }
  }

  /** Start a multi-step tour */
  startTour(tile: ITileModel, values: TourRequestValues) {
    this.cancelActive()

    const tourId = `tour-${uniqueId()}`
    const originalSteps = values.steps ?? []
    const filteredSteps: { engineStep: EngineStep, originalIndex: number, input: TourStepInput }[] = []

    for (let i = 0; i < originalSteps.length; i++) {
      const step = originalSteps[i]
      const { element } = this.resolveTarget(step)
      if (!isShowable(element)) continue
      filteredSteps.push({
        engineStep: {
          element,
          popover: this.buildPopover(step),
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

    let currentFilteredIdx = 0
    const filteredToOriginalIndex = filteredSteps.map(s => s.originalIndex)

    const isCurrent = () => this.active?.engineInstance === engineObj
    const engineObj = createCoachmarksEngine({
      ...codapPresentation("tour"),
      ...defaultTourOptions,
      ...(values.showButtons != null && { showButtons: values.showButtons }),
      ...(values.showProgress != null && { showProgress: values.showProgress }),
      ...(values.allowKeyboardControl != null && { allowKeyboardControl: values.allowKeyboardControl }),
      ...(values.allowClose != null && { allowClose: values.allowClose }),
      ...(values.disableButtons != null && { disableButtons: values.disableButtons }),
      ...(values.animate != null && { animate: values.animate }),
      ...(values.smoothScroll != null && { smoothScroll: values.smoothScroll }),
      ...(values.popoverOffset != null && { popoverOffset: values.popoverOffset }),
      ...(values.progressText != null && { progressText: values.progressText }),
      ...(values.nextBtnText != null && { nextBtnText: values.nextBtnText }),
      ...(values.prevBtnText != null && { prevBtnText: values.prevBtnText }),
      ...(values.doneBtnText != null && { doneBtnText: values.doneBtnText }),
      onHighlightStarted: (_el, _step, { state }) => {
        if (!isCurrent()) return
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
        // A step left before its popover was positioned never sent stepStarted.
        if (!isCurrent() || !this.active?.hasStartedStep) return
        this.active.hasStartedStep = false
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
        if (!isCurrent()) return
        this.notify(tile, {
          operation: "tourUpdate", tourId, type: "completed",
          totalSteps: originalSteps.length, visibleSteps: filteredSteps.length
        })
        this.active = null
      },
      onCancelRequested: () => { if (isCurrent()) this.cancelActive() }
    })

    this.active = {
      type: "tour", engineInstance: engineObj, ownerTile: tile, tourId,
      originalSteps,
      filteredToOriginalIndex,
      filteredSteps: filteredSteps.map(s => ({ input: s.input, originalIndex: s.originalIndex })),
      currentFilteredIdx: 0,
      hasStartedStep: false,
    }

    engineObj.drive(filteredSteps.map(s => s.engineStep))
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
    this.active.engineInstance.moveNext()
    return { success: true as const }
  }

  /** Move to the previous tour step programmatically */
  tourPrevious(tile: ITileModel) {
    if (this.active?.type !== "tour") return { success: true as const }
    if (this.active.ownerTile && this.active.ownerTile !== tile) return { success: true as const }
    this.active.engineInstance.movePrevious()
    return { success: true as const }
  }

  /** Move to a specific tour step by original (pre-filter) step index */
  tourMoveTo(tile: ITileModel, stepIndex?: number) {
    if (this.active?.type !== "tour" || stepIndex == null) return { success: true as const }
    if (this.active.ownerTile && this.active.ownerTile !== tile) return { success: true as const }
    const filteredIdx = this.active.filteredToOriginalIndex?.indexOf(stepIndex) ?? -1
    if (filteredIdx < 0) return { success: true as const }
    this.active.engineInstance.moveTo(filteredIdx)
    return { success: true as const }
  }

  /** Refresh the tour overlay/popover position after a layout change */
  tourRefresh(tile: ITileModel) {
    if (!this.active) return { success: true as const }
    if (this.active.ownerTile && this.active.ownerTile !== tile) return { success: true as const }
    this.active.engineInstance.refresh()
    return { success: true as const }
  }

  /** Run an internal (non-plugin) tour, e.g. the feature tour from the Help menu */
  runInternalTour(config: ITourConfig) {
    this.cancelActive()

    const resolvedSteps: EngineStep[] = []
    for (const step of config.steps) {
      if (step.skip) continue
      let el: HTMLElement | null = null
      if (typeof step.element === "string") {
        el = document.querySelector<HTMLElement>(step.element)
      } else if (step.element) {
        el = step.element
      }
      if (!isShowable(el)) continue
      resolvedSteps.push({ element: el, popover: withCodapSide(step.popover) })
    }
    if (resolvedSteps.length === 0) return

    const isCurrent = () => this.active?.engineInstance === engineObj
    const engineObj = createCoachmarksEngine({
      ...codapPresentation("tour"),
      ...defaultTourOptions,
      ...config.options,
      onDestroyed: () => { if (isCurrent()) this.active = null },
      onCancelRequested: () => { if (isCurrent()) this.cancelActive() }
    })

    this.active = {
      type: "tour", engineInstance: engineObj, ownerTile: null
    }

    engineObj.drive(resolvedSteps)
  }

  /** Clean up any active tour/highlight owned by a disconnecting plugin tile */
  cleanupForTile(tile: ITileModel) {
    if (this.active?.ownerTile === tile) {
      this.endActive()
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
