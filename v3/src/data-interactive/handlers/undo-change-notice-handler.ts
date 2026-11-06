import { IAnyStateTreeNode } from "mobx-state-tree"
import { isWebViewModel } from "../../components/web-view/web-view-model"
import { kHostPageId } from "../../lib/embedded-mode/embedded-mode-registry"
import { appState } from "../../models/app-state"
import { ICustomUndoRedoPatcher, registerCustomUndoRedo } from "../../models/history/custom-undo-redo-registry"
import { ICustomPatch } from "../../models/history/tree-types"
import { withCustomUndoRedo } from "../../models/history/with-custom-undo-redo"
import { getDocumentContentFromNode } from "../../utilities/mst-document-utils"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIHandlerFnResult, DIResources, DIValues } from "../data-interactive-types"
import { errorResult } from "./di-results"

const kPluginUndoRedoPatchType = "PluginUndoRedo"

interface IPluginUndoRedoPatch extends ICustomPatch {
  type: typeof kPluginUndoRedoPatchType
  data: {
    tileId: string
  }
}

function isPluginUndoRedoPatch(patch: ICustomPatch): patch is IPluginUndoRedoPatch {
  return patch.type === kPluginUndoRedoPatchType
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

const pluginUndoRedoPatcher: ICustomUndoRedoPatcher = {
  undo: (_node: IAnyStateTreeNode, patch: ICustomPatch) => {
    if (isPluginUndoRedoPatch(patch)) {
      sendUndoRedoMessage(patch.data.tileId, "undoAction")
    }
  },
  redo: (_node: IAnyStateTreeNode, patch: ICustomPatch) => {
    if (isPluginUndoRedoPatch(patch)) {
      sendUndoRedoMessage(patch.data.tileId, "redoAction")
    }
  }
}

registerCustomUndoRedo({ [kPluginUndoRedoPatchType]: pluginUndoRedoPatcher })

function undoRedoResult(): { canUndo: boolean, canRedo: boolean } {
  const { document } = appState
  return { canUndo: document.canUndo, canRedo: document.canRedo }
}

export const diUndoChangeNoticeHandler: DIHandler = {
  notify(resources: DIResources, values?: DIValues) {
    const { interactiveFrame } = resources

    const vals = values as { operation?: string } | undefined
    const operation = vals?.operation

    switch (operation) {
      case "undoableActionPerformed": {
        // a request from the host page has no frame, so its entry goes on the document and its
        // undoAction and redoAction go back to the host page, as in V2
        if (interactiveFrame) {
          if (!isWebViewModel(interactiveFrame.content)) {
            return errorResult("Interactive frame content not found")
          }
          if (!getDocumentContentFromNode(interactiveFrame)) {
            return errorResult("Document content not found")
          }
        }
        const tileId = interactiveFrame?.id ?? kHostPageId
        const model = interactiveFrame?.content ?? appState.document
        model.applyModelChange(() => {
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
