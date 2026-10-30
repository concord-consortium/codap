import { ITileModel } from "../../../models/tiles/tile-model"
import { toV2Id } from "../../../utilities/codap-utils"
import { t } from "../../../utilities/translation/translate"
import { GraphPlace } from "../../axis-graph-shared"
import { isGraphContentModel } from "./graph-content-model"

type OrientableGraphPlace = Exclude<GraphPlace, "plot" | "legend">

// V2's axis orientations (graph_types.js:41-48), which V2 reports as `axisOrientation` in
// `attributeChange` (graph_controller.js:553, data_display_controller.js:863-864). The top, right
// categorical and Y2 axes have their own values. (A legend changed from its menu reports "none"; see
// legendMenuAttributeChangeNotification.)
const axisPlaceToOrientationMap: Record<OrientableGraphPlace, string> = {
  "bottom": "horizontal",
  "top": "top",
  "left": "vertical",
  "leftLower": "vertical",
  "rightCat": "right",
  "rightNumeric": "vertical2",
  "yPlus": "vertical"
}

// V2 reports a removal's `attributeName` as the title of the attribute-menu item that removed it, in
// the user's language (DG.DataDisplayMenu.removeAttribute_*), as the menu shows it
const kRemoveAttributeLabelKeys: Partial<Record<GraphPlace, string>> = {
  bottom: "DG.DataDisplayMenu.removeAttribute_x",
  top: "DG.DataDisplayMenu.removeAttribute_top",
  rightCat: "DG.DataDisplayMenu.removeAttribute_right",
  rightNumeric: "DG.DataDisplayMenu.removeAttribute_y2",
  legend: "DG.DataDisplayMenu.removeAttribute_legend",
  plot: "DG.DataDisplayMenu.removeAttribute_legend"
}
export function removeAttributeLabel(place: GraphPlace, attrName: string) {
  return t(kRemoveAttributeLabelKeys[place] ?? "DG.DataDisplayMenu.removeAttribute_y", { vars: [attrName] })
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

  // as in V2, a drop on the plot area or the legend carries no axisOrientation
  const axisOrientation = place === "plot" || place === "legend" ? undefined : axisPlaceToOrientationMap[place]
  const attributeName = attrIdToRemove ? removeAttributeLabel(place, attrName) : attrName
  const plotType = tile.content.plotType
  const primaryAxis = tile.content.dataConfiguration.primaryRole || "x"

  const values: IAttrChangeValues = {
    attributeId: toV2Id(attrId),
    attributeName,
    plotType,
    primaryAxis
  }

  if (axisOrientation) values.axisOrientation = axisOrientation

  return values
}
