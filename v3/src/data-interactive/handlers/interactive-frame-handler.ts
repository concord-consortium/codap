import { isWebViewModel } from "../../components/web-view/web-view-model"
import { withoutUndo } from "../../models/history/without-undo"
import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources, diNotImplementedYet, DIValues } from "../data-interactive-types"

const noIFResult = {success: false, values: {error: t("V3.DI.Error.interactiveFrameNotFound")}} as const

export const diInteractiveFrameHandler: DIHandler = {
  get(resources: DIResources) {
    // TODO: Fix many hard coded values
    const { interactiveFrame } = resources
    if (interactiveFrame) {
      const webViewContent = isWebViewModel(interactiveFrame.content) ? interactiveFrame.content : undefined
      return {
        success: true,
        values: {
          dimensions: {
            width: 600,
            height: 500
          },
          externalUndoAvailable: true,
          name: interactiveFrame.title,
          preventBringToFront: false,
          preventDataContextReorg: false,
          savedState: webViewContent?.state,
          standaloneUndoModeAvailable: false,
          title: interactiveFrame.title,
          version: "0.1",
        }
      }
    }
    return noIFResult
  },
  create: diNotImplementedYet,
  update(resources: DIResources, values?: DIValues) {
    // TODO: Expand to handle additional values
    const { interactiveFrame } = resources
    if (!interactiveFrame) return noIFResult
    if (Array.isArray(values)) return { success: true } // CODAP v2 seems to ignore interactiveFrame updates when an array is passed for values

    interactiveFrame.applyUndoableAction(() => {
      withoutUndo()
      if (values?.title) interactiveFrame.setTitle(values.title)
    }, "", "")
    return { success: true }
  },
  delete: diNotImplementedYet
}

registerDIHandler("interactiveFrame", diInteractiveFrameHandler)
