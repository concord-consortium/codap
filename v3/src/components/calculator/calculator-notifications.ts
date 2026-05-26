import { ITileModel } from "../../models/tiles/tile-model"
import { updateTileNotification } from "../../models/tiles/tile-notifications"
import { kCalculatorTileType } from "./calculator-defs"

// V2 emits { action:'notify', resource:'component', values:{ operation:'calculate', type:'DG.Calculator' } }
// from apps/dg/components/calculator/calculator.js on both clearValue (~:94) and evaluate (~:156).
// No-ops for non-calculator tiles so it's safe to call from generic notify callbacks.
export function calculateNotification(calculatorTile?: ITileModel) {
  if (calculatorTile?.content.type !== kCalculatorTileType) return
  return updateTileNotification("calculate", {}, calculatorTile)
}
