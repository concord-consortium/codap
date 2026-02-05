import { ICodapV2UnivariateAdornment } from "../../../../v2/codap-v2-types"
import { stringToCellKey } from "../../utilities/cell-key-utils"
import { exportAdornmentBase, IAdornmentExporterOptions } from "../adornment-content-info"
import { IUnivariateMeasureAdornmentModel } from "./univariate-measure-adornment-model"

// v3 label coords are cell-relative proportions, but v2 expects plot-relative proportions
function measureCoordToProportion(coord: number, cellIndex: number, cellCount: number) {
  return (cellIndex + coord) / cellCount
}

export function exportUnivariateMeasure(model: IUnivariateMeasureAdornmentModel, options: IAdornmentExporterOptions) {
  const { categoricalAttrs, xCategories, yCategories } = options
  const { role: _splitRole, attrId: splitAttrId } = categoricalAttrs[0] ?? {}
  // v2 ignores top and right splits
  const splitRole = ["x", "y"].includes(_splitRole) ? _splitRole : undefined
  const splitCats = splitRole === "x"
                      ? xCategories
                      : splitRole === "y"
                        ? yCategories
                        : [""]
  const coordsMap = new Map<string, { x: number, y: number }>()
  model.measures.forEach((measure, key) => {
    const parsedKey = stringToCellKey(String(key))
    const splitValue = splitAttrId ? parsedKey[splitAttrId] : undefined
    if (splitValue != null && coordsMap.get(splitValue) == null && measure.labelCoords != null) {
      coordsMap.set(splitValue, measure.labelCoords)
    }
  })
  const firstMeasureCoords = model.firstMeasure?.labelCoords
  const equationCoordsArray: ICodapV2UnivariateAdornment["equationCoordsArray"] = splitRole && coordsMap.size
    ? splitCats.map((cat, index) => {
        const coords = coordsMap.get(cat)
        const xIndex = splitRole === "x" ? index : 0
        // reverse y cell index: cells are rendered bottom to top but y coords are top to bottom
        const yIndex = splitRole === "y" ? (yCategories.length - 1) - index: 0
        return coords
                ? {
                  proportionX: measureCoordToProportion(coords.x, xIndex, xCategories.length),
                  proportionY: measureCoordToProportion(coords.y, yIndex, yCategories.length)
                }
                : null
        // filter out nulls; not clear how v2 handles missing coords entries
      }).filter(_coords => !!_coords)
    : firstMeasureCoords
      ? [{
          proportionX: measureCoordToProportion(firstMeasureCoords.x, 0, 1),
          proportionY: measureCoordToProportion(firstMeasureCoords.y, 0, 1)
        }]
      : []
  return {
    ...exportAdornmentBase(model, options),
    equationCoordsArray
  }
}
