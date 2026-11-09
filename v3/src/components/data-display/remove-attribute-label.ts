import { t } from "../../utilities/translation/translate"
import { GraphAttrRole } from "./data-display-types"

const kRemoveAttributeLabelKeys: Partial<Record<GraphAttrRole, string>> = {
  x: "DG.DataDisplayMenu.removeAttribute_x",
  y: "DG.DataDisplayMenu.removeAttribute_y",
  rightNumeric: "DG.DataDisplayMenu.removeAttribute_y2",
  legend: "DG.DataDisplayMenu.removeAttribute_legend",
  topSplit: "DG.DataDisplayMenu.removeAttribute_top",
  rightSplit: "DG.DataDisplayMenu.removeAttribute_right"
}

// The title of the attribute menu's "Remove" item for an attribute in `role`. As in V2
// (data_display_controller.js:843-866), a removal's notice carries this title as its `attributeName`.
export function removeAttributeLabel(role: GraphAttrRole, attrName = "") {
  return t(kRemoveAttributeLabelKeys[role] ?? "DG.DataDisplayMenu.removeAttribute_y", { vars: [attrName] })
}
