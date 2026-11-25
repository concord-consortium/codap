import { AttributeType } from "../../models/data/attribute-types"
import { t } from "../../utilities/translation/translate"

const kTreatAsLabelKeys: Partial<Record<AttributeType, string>> = {
  categorical: "DG.DataDisplayMenu.treatAsCategorical",
  numeric: "DG.DataDisplayMenu.treatAsNumeric",
  date: "V3.DataDisplayMenu.treatAsDate"
}

// The title of the attribute menu's "Treat as" item that changes an attribute to `treatAs`. As in V2
// (data_display_controller.js:843-866), the change's notice carries this title as its `attributeName`.
export function treatAsLabel(treatAs: AttributeType) {
  const key = kTreatAsLabelKeys[treatAs]
  return key ? t(key) : ""
}
