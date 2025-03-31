import { colord } from "colord"
import { kellyColors } from "../../utilities/color-utils"
import { compareValues } from "../../utilities/data-utils"
import { gLocale } from "../../utilities/translation/locale"
import { CodapV2ColorMap, ICodapV2CategoryMap, isV2CategoryMap } from "../../v2/codap-v2-data-set-types"
import { IAttribute } from "./attribute"
import { ICategoryMove, ICategorySetSnapshot } from "./category-set"
import { MinimalMovesFinder } from "./minimal-moves-finder"

export type V2CategorySetInput = CodapV2ColorMap | ICodapV2CategoryMap

export function importV2CategorySet(attribute: IAttribute, input: V2CategorySetInput): Maybe<ICategorySetSnapshot> {
  let moves: ICategoryMove[] = []
  // map from category string to hex color string
  const colors: Record<string, string> = {}

  let colorMap: CodapV2ColorMap = {}

  // build default category set order (sorted alphanumerically)
  const categories = attribute.strValues.filter(value => value != null && value !== "")
  const categoriesSet = new Set(categories)
  const sortedOrder = Array.from(categoriesSet)
  sortedOrder.sort((a, b) => compareValues(a, b, gLocale.compareStrings))

  if (isV2CategoryMap(input)) {
    const { __order: importOrder, ..._colors } = input
    colorMap = _colors

    const importedIntersection = importOrder.filter(value => categoriesSet.has(value))
    const importedIntersectionSet = new Set(importedIntersection)
    const categoriesIntersection = sortedOrder.filter(value => importedIntersectionSet.has(value))

    /*
     * V2 writes out the __order array, which is an array of every category in order, even if
     * the user has not changed the order from the default. V3 maintains a list of changes that
     * the user has made to the default order and so nothing needs to be stored if the user hasn't
     * changed the order. To map from the v2 representation to the v3 representation, we first
     * identify the longest block of consecutive values in the correct order. If the user has made
     * no changes, then this block will contain all of the values. If the v2 order differs from
     * the default (sorted) order, then the set of moves required to prepend and append values to
     * the block will be stored in the moves array.
     */
    const minMovesFinder = new MinimalMovesFinder(categoriesIntersection, importedIntersection)
    moves = minMovesFinder.minMoves()
  }
  else {
    colorMap = input
  }

  // V2 assigns colors to categories in the order they appear in the data.
  // For now, v3 assigns colors to categories in sorted order.
  for (let i = 0; i < sortedOrder.length; ++i) {
    const category = sortedOrder[i]
    const defaultColor = kellyColors[i % kellyColors.length]
    const importColor = colorMap[category]
    if (importColor) {
      const importColorStr = typeof importColor === "string" ? importColor : importColor.colorString
      const defaultColorD = colord(defaultColor)
      const importColorD = colord(importColorStr)
      // if the v2 color is different than the default color, store it as a color change
      if (defaultColorD.toHex() !== importColorD.toHex()) {
        colors[category] = importColorD.toHex()
      }
    }
  }

  if (moves.length > 0 || Object.keys(colors).length > 0) {
    return {
      attribute: attribute.id,
      moves,
      colors
    }
  }
}
