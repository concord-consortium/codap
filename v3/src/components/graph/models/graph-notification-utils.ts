import { ITileModel } from "../../../models/tiles/tile-model"
import { toV2Id } from "../../../utilities/codap-utils"
import { GraphPlace } from "../../axis-graph-shared"
import { AxisOrientation } from "../../axis/axis-types"
import { isGraphContentModel } from "./graph-content-model"

type OrientableGraphPlace = Exclude<GraphPlace, "plot" | "legend">

const axisPlaceToOrientationMap: Record<OrientableGraphPlace, AxisOrientation> = {
  "bottom": "horizontal",
  "top": "horizontal",
  "left": "vertical",
  "rightCat": "vertical",
  "rightNumeric": "vertical",
  "yPlus": "vertical"
}

export interface IAttrChangeValues {
  attributeId: string | number
  attributeName?: string
  axisOrientation?: string
  plotType?: string,
  primaryAxis?: string
}

export const attrChangeNotificationValues = (
  place: GraphPlace, attrId: string, attrName = "", attrIdToRemove = "", tile?: ITileModel
) => {
  if (!isGraphContentModel(tile?.content)) return

  const placeHasOrientation = place !== "plot" && place !== "legend"
  const axisOrientation = placeHasOrientation ? axisPlaceToOrientationMap[place] : undefined
  const attributeName = attrIdToRemove
    ? `Remove ${ axisOrientation === "horizontal" ? "X" : "Y" }: ${attrName}`
    : attrName
  const plotType = tile.content.plotType
  const primaryAxis = tile.content.dataConfiguration.primaryRole || "x"

  const values: IAttrChangeValues = {
    attributeId: toV2Id(attrId),
    attributeName,
    plotType,
    primaryAxis
  }

  if (placeHasOrientation) values.axisOrientation = axisOrientation

  return values
}
