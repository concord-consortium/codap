import { IClientUndoData } from "./tree-types"
import { IUndoManager } from "./undo-store"
import { withClientUndoData } from "./with-client-undo-data"

export interface ICodapUndoData extends IClientUndoData {
  undoStringKey: string
  redoStringKey: string
}

export function isCodapUndoData(clientData?: IClientUndoData): clientData is ICodapUndoData {
  return !!clientData?.undoStringKey && !!clientData?.redoStringKey
}

export function getUndoStringKey(undoStore?: IUndoManager) {
  const clientData = undoStore?.undoEntry?.clientData
  return isCodapUndoData(clientData) ? clientData.undoStringKey : "DG.mainPage.mainPane.undoButton.toolTip"
}

export function getRedoStringKey(undoStore?: IUndoManager) {
  const clientData = undoStore?.redoEntry?.clientData
  return isCodapUndoData(clientData) ? clientData.redoStringKey : "DG.mainPage.mainPane.redoButton.toolTip"
}

export function withUndoRedoStrings(undoStringKey: string, redoStringKey: string) {
  withClientUndoData({ undoStringKey, redoStringKey })
}
