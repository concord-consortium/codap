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
        preventBringToFront: false,
        preventDataContextReorg: false,
        savedState: webViewContent?.state,
        standaloneUndoModeAvailable: false,
        title: interactiveFrame.title,
        version: "0.1",
      }
      return { success: true, values }
    }
    return noIFResult
  },
  create: diNotImplementedYet,
  update(resources: DIResources, _values?: DIValues) {
    // TODO: Expand to handle additional values
    const { interactiveFrame } = resources
    if (!interactiveFrame) return noIFResult
    // CODAP v2 seems to ignore interactiveFrame updates when an array is passed for values
    if (Array.isArray(_values)) return { success: true }

    const values = _values as DIInteractiveFrame
    interactiveFrame.applyModelChange(() => {
      if (values?.title) interactiveFrame.setTitle(values.title)
      if (values?.dimensions) {
        appState.document.content?.setTileDimensions(interactiveFrame.id, values.dimensions)
      }
    })
    return { success: true }
  },
  delete: diNotImplementedYet
}

registerDIHandler("interactiveFrame", diInteractiveFrameHandler)
