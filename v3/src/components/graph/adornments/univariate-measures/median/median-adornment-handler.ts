import { DIAdornmentHandler } from "../../../../../data-interactive/handlers/adornment-handler"
import { isMedianAdornment } from "./median-adornment-model"
import { kMedianType } from "./median-adornment-types"
import { univariateMeasureAdornmentBaseHandler } from "../univariate-measure-adornment-base-handler"

export const medianAdornmentHandler: DIAdornmentHandler = univariateMeasureAdornmentBaseHandler({
  adornmentType: kMedianType,
  getMeasureValue: (adornment, cellKeyString) => adornment.measures.get(cellKeyString)?.value ?? NaN,
  isAdornmentOfType: isMedianAdornment,
  measureName: "median"
})
