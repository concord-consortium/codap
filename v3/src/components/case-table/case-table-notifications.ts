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

// V2 emits `resize column` (singular) from two sites:
//   - apps/dg/components/case_table/case_table_controller.js (~:906) on the "Fit Width"
//     attribute-menu item (single-column auto-fit)
//   - apps/dg/components/case_table/case_table_view.js (~:1926) on user drag-resize
// Both carry only { operation:'resize column', type:'DG.CaseTable' } — no width/attr info.
export function resizeColumnNotification(tile?: ITileModel) {
  if (tile?.content.type !== kCaseTableTileType) return
  return updateTileNotification("resize column", {}, tile)
}

// V2 emits `resize columns` (plural) from apps/dg/components/case_table/case_table_controller.js
// (~:1136) on the "Fit All Columns" inspector button. Payload: { operation:'resize columns',
// type:'DG.CaseTable' }. Audit §3.5: V2's log at that site has a `%` typo (missing `@`) —
// V3 must NOT replicate.
export function resizeColumnsNotification(tile?: ITileModel) {
  if (tile?.content.type !== kCaseTableTileType) return
  return updateTileNotification("resize columns", {}, tile)
}
