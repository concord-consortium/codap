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

// V2 emits `expand/collapse all` (with the literal `/` in the op name) from
// apps/dg/components/case_table/case_table_view.js (~:2172) on the table-spacer
// expand-all-or-collapse-all button. A single op covers both directions, and V2's
// payload carries no expand/collapse discriminator. V3 adds an additive `to` field —
// the resulting state ("expanded" or "collapsed") — following the discriminator pattern
// established in PR #2592 (e.g. background image `to: "added"|"removed"`). V2 plugins
// ignore the extra field; V3-aware plugins can branch on it without inferring state.
// Payload: { operation:'expand/collapse all', type:'DG.CaseTable', to:'expanded'|'collapsed' }.
export function expandCollapseAllNotification(tile?: ITileModel, to?: "expanded" | "collapsed") {
  if (tile?.content.type !== kCaseTableTileType) return
  return updateTileNotification("expand/collapse all", to ? { to } : {}, tile)
}

// V2 emits `join` on the component resource from apps/dg/utilities/data_context_utilities.js
// (~:924) when a user joins attributes from another dataset into a destination case table
// (drag-drop on an attribute header). V2's payload has a documented bug: `type: DG.CaseTable`
// is the SC class OBJECT, not the string — what plugins actually receive is malformed (audit
// §3.5). V3 emits the well-formed string via `updateTileNotification`, which the lifecycle/
// operational logic in `tileNotification` routes as an operational op (so `type` becomes
// `'DG.CaseTable'`). No-ops for non-case-table tiles.
export function joinNotification(destCaseTableTile?: ITileModel) {
  if (destCaseTableTile?.content.type !== kCaseTableTileType) return
  return updateTileNotification("join", {}, destCaseTableTile)
}
