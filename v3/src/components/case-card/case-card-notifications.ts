import { ITileModel } from "../../models/tiles/tile-model"
import { updateTileNotification } from "../../models/tiles/tile-notifications"
import { kCaseCardTileType } from "./case-card-defs"

// V2 emits { action:'notify', resource:'component', values:{ operation:'change column width',
// type:'DG.CaseCard' } } from apps/dg/components/case_card/case_card_view.js (~:119) on
// completed column-width drag. Payload carries no width/collection — bare operation only.
// No-ops for non-case-card tiles so it's safe to call from generic notify callbacks.
export function changeColumnWidthNotification(caseCardTile?: ITileModel) {
  if (caseCardTile?.content.type !== kCaseCardTileType) return
  return updateTileNotification("change column width", {}, caseCardTile)
}
