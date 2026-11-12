import { ITileModel } from "../../../models/tiles/tile-model"
import { toV2Id } from "../../../utilities/codap-utils"
import { GraphPlace } from "../../axis-graph-shared"
import { graphPlaceToAttrRole, V2AxisOrientation } from "../../data-display/data-display-types"
import { removeAttributeLabel } from "../../data-display/remove-attribute-label"
import { isGraphContentModel } from "./graph-content-model"

// The `axisOrientation` V2 reports in `attributeChange` (graph_controller.js:553,
// data_display_controller.js:863-864) for each axis. The top, right categorical and Y2 axes have their
// own values. A drop on the legend has none.
type OrientableGraphPlace = Exclude<GraphPlace, "legend" | "plot">
const axisPlaceToOrientationMap: Record<OrientableGraphPlace, V2AxisOrientation> = {
  "bottom": "horizontal",
  "top": "top",
  "left": "vertical",
  "leftLower": "vertical",
  "rightCat": "right",
  "rightNumeric": "vertical2",
  "yPlus": "vertical"
}

export interface IAttrChangeValues {
  attributeId: string | number
  attributeName?: string
  axisOrientation?: V2AxisOrientation
  plotType?: string,
  primaryAxis?: string
}

export const attrChangeNotificationValues = (
  place: GraphPlace, attrId: string, attrName = "", attrIdToRemove = "", tile?: ITileModel
) => {
  if (!isGraphContentModel(tile?.content)) return

  const axisOrientation = place in axisPlaceToOrientationMap
                            ? axisPlaceToOrientationMap[place as OrientableGraphPlace]
                            : undefined
  const attributeName = attrIdToRemove ? removeAttributeLabel(graphPlaceToAttrRole[place], attrName) : attrName
  const plotType = tile.content.plotType
  const primaryAxis = tile.content.dataConfiguration.primaryRole || "x"

  const values: IAttrChangeValues = {
    attributeId: toV2Id(attrId || attrIdToRemove),
    attributeName,
    plotType,
    primaryAxis
  }

  if (axisOrientation) values.axisOrientation = axisOrientation

  return values
}
