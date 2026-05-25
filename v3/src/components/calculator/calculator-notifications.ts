import { ITileModel } from "../../models/tiles/tile-model"
import { updateTileNotification } from "../../models/tiles/tile-notifications"

// V2 emits { action:'notify', resource:'component', values:{ operation:'calculate', type:'DG.Calculator' } }
// from apps/dg/components/calculator/calculator.js on both clearValue (~:94) and evaluate (~:156).
export function calculateNotification(calculatorTile?: ITileModel) {
  if (!calculatorTile) return
  return updateTileNotification("calculate", {}, calculatorTile)
}
