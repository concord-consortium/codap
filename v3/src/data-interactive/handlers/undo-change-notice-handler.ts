import { when } from "mobx"
import { IAnyStateTreeNode } from "mobx-state-tree"
import { isWebViewModel } from "../../components/web-view/web-view-model"
import { appState } from "../../models/app-state"
import { ICustomUndoRedoPatcher, registerCustomUndoRedo } from "../../models/history/custom-undo-redo-registry"
import { ICustomPatch } from "../../models/history/tree-types"
import { withCustomUndoRedo } from "../../models/history/with-custom-undo-redo"
import { getDocumentContentFromNode } from "../../utilities/mst-document-utils"
import { registerDIHandler } from "../data-interactive-handler"
import { t } from "../../utilities/translation/translate"
import { DIAsyncHandler, DIHandlerFnResult, DIResources, DIValues } from "../data-interactive-types"
import { errorResult, noInteractiveFrameResult } from "./di-results"

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
    // as in V2, only an explicit `success: false` is a failure
    if (response?.success === false) {
      console.warn(`Plugin ${tileId} failed to handle ${operation}:`, response)
      // as in V2 (data_interactive_phone_handler.js:2308-2312)
      appState.alert(t(operation === "undoAction" ? "DG.Undo.exceptionOccurred" : "DG.Redo.exceptionOccurred"),
        undefined)
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

// wait for the new entry so the reply describes the history after it; give up after a second
async function newUndoEntryRecorded(priorUndoEntryId?: string) {
  const undoManager = appState.document.treeManagerAPI?.undoManager
  if (!undoManager) return
  try {
    await when(() => !!undoManager.undoEntry && undoManager.undoEntry.id !== priorUndoEntryId, { timeout: 1000 })
  } catch {
    // timed out
  }
}

export const diUndoChangeNoticeHandler: DIAsyncHandler = {
  async notify(resources: DIResources, values?: DIValues) {
    const { interactiveFrame } = resources
    if (!interactiveFrame) return noInteractiveFrameResult

    const vals = values as { operation?: string, logMessage?: string } | undefined
    const operation = vals?.operation

    switch (operation) {
      case "undoableActionPerformed": {
        const webViewContent = isWebViewModel(interactiveFrame.content)
          ? interactiveFrame.content : undefined
        if (!webViewContent) {
          return errorResult("Interactive frame content not found")
        }
        if (!getDocumentContentFromNode(interactiveFrame)) {
          return errorResult("Document content not found")
        }
        const tileId = interactiveFrame.id
        const priorUndoEntryId = appState.document.treeManagerAPI?.undoManager.undoEntry?.id
        webViewContent.applyModelChange(() => {
          withCustomUndoRedo<IPluginUndoRedoPatch>({
            type: kPluginUndoRedoPatchType,
            data: { tileId }
          })
        }, {
          undoStringKey: "DG.Undo.interactiveUndoableAction",
          redoStringKey: "DG.Redo.interactiveUndoableAction",
          // as in V2 (data_interactive_phone_handler.js:2320, :2338)
          log: `Interactive action occurred: ${vals?.logMessage || "Unknown action"}`
        })
        await newUndoEntryRecorded(priorUndoEntryId)
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
