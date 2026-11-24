// PROTOTYPE: how a range slider shows its ends -- in the readout, and to screen readers.
// CODAP-1566: at the precision set in its attribute's properties, the way the case table shows the attribute's
// values. With none set, numbers use the scale's resolution, and dates the date scale's display precision (as on
// mapping-time-sliders), so a date range reads "5/23/2005 – 6/14/2005" rather than with a time of day.
import { IAttribute } from "../../models/data/attribute"
import { formatDate } from "../../utilities/date-utils"
import { MultiScale } from "../axis/models/multi-scale"
import { isDateAxisModel } from "../axis/models/numeric-axis-models"
import { getNumFormatterForAttribute } from "../case-tile-common/attribute-format-utils"
import { ISliderModel } from "./slider-model"

// only a precision that fits the attribute's type counts (Four Seals' date attribute carries a numeric one)
function formatWithAttribute(value: number, attr: IAttribute) {
  if (attr.type === "date") {
    return attr.datePrecision ? formatDate(new Date(value * 1000), attr.datePrecision) ?? undefined : undefined
  }
  return typeof attr.precision === "number" ? getNumFormatterForAttribute(attr)?.(value) || undefined : undefined
}

// `value` is a number, or a date in seconds (as the date scale has it)
export function formatRangeEnd(value: number, slider: ISliderModel, multiScale?: MultiScale) {
  const attr = slider.attribute
  const withAttribute = attr ? formatWithAttribute(value, attr) : undefined
  if (withAttribute) return withAttribute
  if (slider.scaleType === "date" && isDateAxisModel(slider.axis)) {
    return formatDate(new Date(value * 1000), slider.axis.precisionForDisplay) ?? String(value)
  }
  return multiScale ? multiScale.formatValueForScale(value) : String(value)
}
