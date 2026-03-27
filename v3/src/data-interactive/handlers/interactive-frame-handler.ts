import { isWebViewModel } from "../../components/web-view/web-view-model"
import { tourManager, HighlightRequestValues, TourRequestValues, TourStepInput } from "../../lib/tour/tour-manager"
import { appState } from "../../models/app-state"
import { uiState } from "../../models/ui-state"
import { toV2Id } from "../../utilities/codap-utils"
import { gLocale } from "../../utilities/translation/locale"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DINotification, DIResources, DIValues, DIInteractiveFrame } from "../data-interactive-types"
import { noInteractiveFrameResult, valuesRequiredResult } from "./di-results"

function pickString(val: unknown): string | undefined {
  return typeof val === "string" ? val : undefined
}

function pickNumber(val: unknown): number | undefined {
  return typeof val === "number" ? val : undefined
}

function pickBoolean(val: unknown): boolean | undefined {
  return typeof val === "boolean" ? val : undefined
}

function pickStringArray<T extends string>(val: unknown, allowed: readonly T[]): T[] | undefined {
  if (!Array.isArray(val)) return undefined
  const filtered = val.filter((v: unknown): v is T => typeof v === "string" && (allowed as readonly string[]).includes(v))
  return filtered.length > 0 ? filtered : undefined
}

function sanitizeStepInput(raw: unknown): TourStepInput | null {
  if (typeof raw !== "object" || raw == null) return null
  const v = raw as Record<string, unknown>
  return {
    ...(v.tourKey != null && { tourKey: pickString(v.tourKey) }),
    ...(v.testId != null && { testId: pickString(v.testId) }),
    ...(v.selector != null && { selector: pickString(v.selector) }),
    ...(v.component != null && { component: pickString(v.component) }),
    ...(v.id != null && { id: pickString(v.id) }),
    ...(v.disableActiveInteraction != null && { disableActiveInteraction: pickBoolean(v.disableActiveInteraction) }),
    ...(v.stagePadding != null && { stagePadding: pickNumber(v.stagePadding) }),
    ...(v.stageRadius != null && { stageRadius: pickNumber(v.stageRadius) }),
    ...(v.popover != null && typeof v.popover === "object" && {
      popover: {
        title: pickString((v.popover as Record<string, unknown>).title),
        description: pickString((v.popover as Record<string, unknown>).description),
        side: pickString((v.popover as Record<string, unknown>).side),
        align: pickString((v.popover as Record<string, unknown>).align),
      }
    }),
  }
}

function sanitizeHighlightValues(raw: Record<string, unknown>): HighlightRequestValues {
  const step = sanitizeStepInput(raw) ?? {}
  return {
    ...step,
    ...(raw.overlayColor != null && { overlayColor: pickString(raw.overlayColor) }),
    ...(raw.overlayOpacity != null && { overlayOpacity: pickNumber(raw.overlayOpacity) }),
  }
}

const buttonNames = ["next", "previous", "close"] as const

function sanitizeTourValues(raw: Record<string, unknown>): TourRequestValues {
  const rawSteps = Array.isArray(raw.steps) ? raw.steps : []
  const steps = rawSteps.map(sanitizeStepInput).filter((s): s is TourStepInput => s != null)
  return {
    steps,
    ...(raw.overlayColor != null && { overlayColor: pickString(raw.overlayColor) }),
    ...(raw.overlayOpacity != null && { overlayOpacity: pickNumber(raw.overlayOpacity) }),
    ...(raw.stagePadding != null && { stagePadding: pickNumber(raw.stagePadding) }),
    ...(raw.stageRadius != null && { stageRadius: pickNumber(raw.stageRadius) }),
    ...(raw.showButtons != null && { showButtons: pickStringArray(raw.showButtons, buttonNames) }),
    ...(raw.disableButtons != null && { disableButtons: pickStringArray(raw.disableButtons, buttonNames) }),
    ...(raw.showProgress != null && { showProgress: pickBoolean(raw.showProgress) }),
    ...(raw.allowKeyboardControl != null && { allowKeyboardControl: pickBoolean(raw.allowKeyboardControl) }),
    ...(raw.allowClose != null && { allowClose: pickBoolean(raw.allowClose) }),
    ...(raw.disableActiveInteraction != null &&
      { disableActiveInteraction: pickBoolean(raw.disableActiveInteraction) }),
    ...(raw.animate != null && { animate: pickBoolean(raw.animate) }),
    ...(raw.smoothScroll != null && { smoothScroll: pickBoolean(raw.smoothScroll) }),
    ...(raw.popoverOffset != null && { popoverOffset: pickNumber(raw.popoverOffset) }),
    ...(raw.progressText != null && { progressText: pickString(raw.progressText) }),
    ...(raw.nextBtnText != null && { nextBtnText: pickString(raw.nextBtnText) }),
    ...(raw.prevBtnText != null && { prevBtnText: pickString(raw.prevBtnText) }),
    ...(raw.doneBtnText != null && { doneBtnText: pickString(raw.doneBtnText) }),
  }
}

export const diInteractiveFrameHandler: DIHandler = {
  get(resources: DIResources) {
    const { interactiveFrame } = resources
    if (!interactiveFrame) return noInteractiveFrameResult

    const dimensions = appState.document.content?.getTileDimensions(interactiveFrame.id)
    const webViewContent = isWebViewModel(interactiveFrame.content) ? interactiveFrame.content : undefined
    const {
      allowEmptyAttributeDeletion, blockAPIRequestsWhileEditing, preventAttributeDeletion, preventBringToFront,
      preventDataContextReorg, preventTopLevelReorg, respectEditableItemAttribute, state: savedState,
      subscribeToDocuments, version
    } = webViewContent ?? {}
    const values: DIInteractiveFrame = {
      allowEmptyAttributeDeletion,
      blockAPIRequestsWhileEditing,
      codapVersion: appState.getVersion(),
      dimensions,
      externalUndoAvailable: !uiState.standaloneMode,
      id: toV2Id(interactiveFrame.id),
      name: interactiveFrame.title,
      preventAttributeDeletion,
      preventBringToFront,
      preventDataContextReorg,
      preventTopLevelReorg,
      respectEditableItemAttribute,
      savedState,
      standaloneUndoModeAvailable: uiState.standaloneMode,
      subscribeToDocuments,
      title: interactiveFrame.title,
      version,
      lang: gLocale.current
    }
    return { success: true, values }
  },
  // TODO: also handle dirty, image, openGuideConfiguration
  notify(resources: DIResources, values?: DIValues) {
    const { interactiveFrame } = resources
    if (!interactiveFrame) return noInteractiveFrameResult

    if (!values) return valuesRequiredResult

    const { request, cursorMode } = values as DINotification
    switch (request) {
      case "indicateBusy": {
        // cursorMode may arrive as a boolean or string from the plugin API
        const isCursorMode = cursorMode === true || cursorMode === "true"
        uiState.setBusy(true, isCursorMode)
        break
      }
      case "indicateIdle":
        uiState.setBusy(false)
        break
      case "highlight":
        return tourManager.highlight(interactiveFrame, sanitizeHighlightValues(values as Record<string, unknown>))
      case "clearHighlight":
        return tourManager.clearHighlight(interactiveFrame)
      case "startTour":
        return tourManager.startTour(interactiveFrame, sanitizeTourValues(values as Record<string, unknown>))
      case "endTour":
        return tourManager.endTour(interactiveFrame, pickString((values as Record<string, unknown>)?.tourId))
      case "tourNext":
        return tourManager.tourNext(interactiveFrame)
      case "tourPrevious":
        return tourManager.tourPrevious(interactiveFrame)
      case "tourMoveTo":
        return tourManager.tourMoveTo(interactiveFrame, pickNumber((values as Record<string, unknown>)?.stepIndex))
      case "tourRefresh":
        return tourManager.tourRefresh(interactiveFrame)
    }

    // Unrecognized requests return success to avoid breaking plugins (matches V2 behavior)
    return { success: true }
  },
  update(resources: DIResources, values?: DIValues) {
    const { interactiveFrame } = resources
    if (!interactiveFrame) return noInteractiveFrameResult
    const webViewContent = isWebViewModel(interactiveFrame.content) ? interactiveFrame.content : undefined
    // CODAP v2 seems to ignore interactiveFrame updates when an array is passed for values
    if (Array.isArray(values)) return { success: true }

    const {
      allowEmptyAttributeDeletion, blockAPIRequestsWhileEditing, cannotClose, dimensions,
      handlesLocaleChange, name, preventAttributeDeletion, preventBringToFront,
      preventDataContextReorg, preventTopLevelReorg, respectEditableItemAttribute,
      subscribeToDocuments, title, version
    } = values as DIInteractiveFrame
    interactiveFrame.applyModelChange(() => {
      if (allowEmptyAttributeDeletion != null) {
        webViewContent?.setAllowEmptyAttributeDeletion(allowEmptyAttributeDeletion)
      }
      if (cannotClose) interactiveFrame.setCannotClose(cannotClose)
      if (dimensions) {
        appState.document.content?.setTileDimensions(interactiveFrame.id, dimensions)
      }
      if (name && !interactiveFrame.userSetTitle) {
        interactiveFrame.setTitle(name)
      }
      if (blockAPIRequestsWhileEditing != null) {
        webViewContent?.setBlockAPIRequestsWhileEditing(blockAPIRequestsWhileEditing)
      }
      if (preventAttributeDeletion != null) webViewContent?.setPreventAttributeDeletion(preventAttributeDeletion)
      if (preventBringToFront != null) webViewContent?.setPreventBringToFront(preventBringToFront)
      if (preventDataContextReorg != null) webViewContent?.setPreventDataContextReorg(preventDataContextReorg)
      if (preventTopLevelReorg != null) webViewContent?.setPreventTopLevelReorg(preventTopLevelReorg)
      if (respectEditableItemAttribute != null) {
        webViewContent?.setRespectEditableItemAttribute(respectEditableItemAttribute)
      }
      if (subscribeToDocuments != null) {
        webViewContent?.setSubscribeToDocuments(subscribeToDocuments)
      }
      if (title && !interactiveFrame.userSetTitle) {
        interactiveFrame.setTitle(title)
      }
      if (version) webViewContent?.setVersion(version)
      if (handlesLocaleChange != null) webViewContent?.setHandlesLocaleChange(handlesLocaleChange)
    })
    return { success: true }
  }
}

registerDIHandler("interactiveFrame", diInteractiveFrameHandler)
