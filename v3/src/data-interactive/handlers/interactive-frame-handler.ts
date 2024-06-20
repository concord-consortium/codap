import { isWebViewModel } from "../../components/web-view/web-view-model"
import { appState } from "../../models/app-state"
import { toV2Id } from "../../utilities/codap-utils"
import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources, diNotImplementedYet, DIValues, DIInteractiveFrame } from "../data-interactive-types"

const noIFResult = {success: false, values: {error: t("V3.DI.Error.interactiveFrameNotFound")}} as const

export const diInteractiveFrameHandler: DIHandler = {
  get(resources: DIResources) {
    // TODO: Fix many hard coded values
    const { interactiveFrame } = resources
    if (interactiveFrame) {
      const dimensions = appState.document.content?.getTileDimensions(interactiveFrame.id)
      const webViewContent = isWebViewModel(interactiveFrame.content) ? interactiveFrame.content : undefined
      const values: DIInteractiveFrame = {
        dimensions,
        externalUndoAvailable: true,
        id: toV2Id(interactiveFrame.id),
        name: interactiveFrame.title,
        preventAttributeDeletion: webViewContent?.preventAttributeDeletion,
        preventBringToFront: false,
        preventDataContextReorg: false,
        respectEditableItemAttribute: webViewContent?.respectEditableItemAttribute,
        savedState: webViewContent?.state,
        standaloneUndoModeAvailable: false,
        title: interactiveFrame.title,
        version: "0.1",
      }
      return { success: true, values }
    }
    return noIFResult
  },
  // Notify needs to handle:
  // dirty: true
  // image: ...
  // request: openGuideConfiguration | indicateBusy | indicateIdle
  // cursorMode: true
  notify: diNotImplementedYet,
  update(resources: DIResources, _values?: DIValues) {
    // TODO: Expand to handle additional values
    const { interactiveFrame } = resources
    if (!interactiveFrame) return noIFResult
    const webViewContent = isWebViewModel(interactiveFrame.content) ? interactiveFrame.content : undefined
    // CODAP v2 seems to ignore interactiveFrame updates when an array is passed for values
    if (Array.isArray(_values)) return { success: true }

    const values = _values as DIInteractiveFrame
    const { dimensions, preventAttributeDeletion, respectEditableItemAttribute, title } = values
    interactiveFrame.applyModelChange(() => {
      if (dimensions) {
        appState.document.content?.setTileDimensions(interactiveFrame.id, dimensions)
      }
      if (preventAttributeDeletion != null) webViewContent?.setPreventAttributeDeletion(preventAttributeDeletion)
      if (respectEditableItemAttribute != null) {
        webViewContent?.setRespectEditableItemAttribute(respectEditableItemAttribute)
      }
      if (title) interactiveFrame.setTitle(title)
    })
    return { success: true }
  }
}

registerDIHandler("interactiveFrame", diInteractiveFrameHandler)
