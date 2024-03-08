import { withoutUndo } from "../../models/history/without-undo"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources, diNotImplementedYet, DIValues } from "../data-interactive-types"

const noIFResult = {success: false, values: {error: 'Interactive Frame not found'}} as const

export const diInteractiveFrameHandler: DIHandler = {
  get(resources: DIResources) {
    // TODO: Fix many hard coded values
    const { interactiveFrame } = resources
    return interactiveFrame
      ? {
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
            standaloneUndoModeAvailable: false,
            title: interactiveFrame.title,
            version: "0.1",
          }
        }
      : noIFResult
  },
  create: diNotImplementedYet,
  update(resources: DIResources, values?: DIValues) {
    // TODO: Expand to handle additional values
    const { interactiveFrame } = resources
    if (!interactiveFrame) return noIFResult
    interactiveFrame.applyUndoableAction(() => {
      withoutUndo()
      if (values?.title) interactiveFrame.setTitle(values.title)
    }, "", "")
    return { success: true }
  },
  delete: diNotImplementedYet
}

registerDIHandler("interactiveFrame", diInteractiveFrameHandler)
