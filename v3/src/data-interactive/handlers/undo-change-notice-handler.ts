import { isWebViewModel } from "../../components/web-view/web-view-model"
import { appState } from "../../models/app-state"
import { registerCustomUndoRedo } from "../../models/history/custom-undo-redo-registry"
import { ICustomPatch } from "../../models/history/tree-types"
import { withCustomUndoRedo } from "../../models/history/with-custom-undo-redo"
import { getDocumentContentFromNode } from "../../utilities/mst-document-utils"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIHandlerFnResult, DIResources, DIValues } from "../data-interactive-types"
import { errorResult, noInteractiveFrameResult } from "./di-results"

const kPluginUndoRedoPatchType = "PluginUndoRedo"

interface IPluginUndoRedoPatch extends ICustomPatch {
  type: typeof kPluginUndoRedoPatchType
  data: {
    tileId: string
  }
}

function sendUndoRedoMessage(tileId: string, operation: "undoAction" | "redoAction") {
  const documentContent = appState.document.content
  if (!documentContent) return
  documentContent.broadcastMessage({
    action: "notify",
    resource: "undoChangeNotice",
    values: { operation }
  }, (response: any) => {
    if (response && !response.success) {
      console.warn(`Plugin ${tileId} failed to handle ${operation}:`, response)
    }
  }, tileId)
}

registerCustomUndoRedo({
  [kPluginUndoRedoPatchType]: {
    undo: (_node, patch: IPluginUndoRedoPatch) => {
      sendUndoRedoMessage(patch.data.tileId, "undoAction")
    },
    redo: (_node, patch: IPluginUndoRedoPatch) => {
      sendUndoRedoMessage(patch.data.tileId, "redoAction")
    }
  }
})

function undoRedoResult(): { canUndo: boolean, canRedo: boolean } {
  const { document } = appState
  return { canUndo: document.canUndo, canRedo: document.canRedo }
}

export const diUndoChangeNoticeHandler: DIHandler = {
  notify(resources: DIResources, values?: DIValues) {
    const { interactiveFrame } = resources
    if (!interactiveFrame) return noInteractiveFrameResult

    const vals = values as { operation?: string } | undefined
    const operation = vals?.operation

    switch (operation) {
      case "undoableActionPerformed": {
        const webViewContent = isWebViewModel(interactiveFrame.content)
          ? interactiveFrame.content : undefined
        if (!webViewContent) {
          return errorResult("Interactive frame content not found")
        }
        const documentContent = getDocumentContentFromNode(interactiveFrame)
        if (!documentContent) {
          return errorResult("Document content not found")
        }
        const tileId = interactiveFrame.id
        webViewContent.applyModelChange(() => {
          withCustomUndoRedo<IPluginUndoRedoPatch>({
            type: kPluginUndoRedoPatchType,
            data: { tileId }
          })
        }, {
          undoStringKey: "DG.Undo.interactiveUndoableAction",
          redoStringKey: "DG.Redo.interactiveUndoableAction"
        })
        return { success: true, values: undoRedoResult() } as DIHandlerFnResult
      }
      case "undoButtonPress": {
        const { document } = appState
        document.undoLastAction()
        return { success: true, values: undoRedoResult() } as DIHandlerFnResult
      }
      case "redoButtonPress": {
        const { document } = appState
        document.redoLastAction()
        return { success: true, values: undoRedoResult() } as DIHandlerFnResult
      }
      default:
        return errorResult(`Unknown undoChangeNotice operation: ${operation}`)
    }
  }
}

registerDIHandler("undoChangeNotice", diUndoChangeNoticeHandler)
