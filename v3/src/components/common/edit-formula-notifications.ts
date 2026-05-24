import { ITileModel } from "../../models/tiles/tile-model"
import { updateTileNotification } from "../../models/tiles/tile-notifications"

// V2 emits { action:'notify', resource:'component', values:{ operation:'edit formula', type:'DG.CaseTable' } }
// from case_table_controller.js when an attribute's formula is created/edited via the case table.
export function editFormulaNotification(caseTableTile?: ITileModel) {
  if (!caseTableTile) return
  return updateTileNotification("edit formula", {}, caseTableTile)
}
