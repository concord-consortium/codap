import { isWebViewModel } from "../../components/web-view/web-view-model"
import { appState } from "../../models/app-state"
import { uiState } from "../../models/ui-state"
import { toV2Id } from "../../utilities/codap-utils"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources, diNotImplementedYet, DIValues, DIInteractiveFrame } from "../data-interactive-types"
import { noInteractiveFrameResult } from "./di-results"

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
    }
    return { success: true, values }
  },
  // Notify needs to handle:
  // dirty: true
  // image: ...
  // request: openGuideConfiguration | indicateBusy | indicateIdle
  // cursorMode: true
  notify: diNotImplementedYet,
  update(resources: DIResources, values?: DIValues) {
    const { interactiveFrame } = resources
    if (!interactiveFrame) return noInteractiveFrameResult
    const webViewContent = isWebViewModel(interactiveFrame.content) ? interactiveFrame.content : undefined
    // CODAP v2 seems to ignore interactiveFrame updates when an array is passed for values
    if (Array.isArray(values)) return { success: true }

    const {
      allowEmptyAttributeDeletion, blockAPIRequestsWhileEditing, cannotClose, dimensions, name,
      preventAttributeDeletion, preventBringToFront, preventDataContextReorg, preventTopLevelReorg,
      respectEditableItemAttribute, subscribeToDocuments, title, version
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
    })
    return { success: true }
  }
}

registerDIHandler("interactiveFrame", diInteractiveFrameHandler)
