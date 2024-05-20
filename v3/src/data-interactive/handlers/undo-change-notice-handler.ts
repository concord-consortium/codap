import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, diNotImplementedYet } from "../data-interactive-types"

export const diUndoChangeNoticeHandler: DIHandler = {
  // TODO Implement operation: undoableActionPerformed | undoButtonPressed | redoButtonPressed
  notify: diNotImplementedYet
}

registerDIHandler("undoChangeNotice", diUndoChangeNoticeHandler)
