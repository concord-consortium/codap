import { ITileModel } from "../../models/tiles/tile-model"
import { updateTileNotification } from "../../models/tiles/tile-notifications"
import { kCaseTableTileType } from "./case-table-defs"

// V2 emits { action:'notify', resource:'component', values:{ operation:'open case table',
// type:'DG.CaseTable' } } from apps/dg/controllers/document_controller.js (~:1069) in
// `openCaseTablesForEachContext` — the bulk-open path invoked by Ctrl+Alt+T or by creating
// a new case-table component via menu. V3 has no bulk-open path; the user-visible analogues
// are per-dataset open/create actions (tool-shelf, plugin API). Emit here for V2-plugin
// compat. No-ops for non-case-table tiles so it can be called unconditionally from generic
// notify callbacks.
export function openCaseTableNotification(tile?: ITileModel) {
  if (tile?.content.type !== kCaseTableTileType) return
  return updateTileNotification("open case table", {}, tile)
}
