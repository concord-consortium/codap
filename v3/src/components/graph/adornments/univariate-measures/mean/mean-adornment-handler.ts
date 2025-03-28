import { DIAdornmentHandler } from "../../../../../data-interactive/handlers/adornment-handler"
import { isMeanAdornment } from "./mean-adornment-model"
import { kMeanType } from "./mean-adornment-types"
import { univariateMeasureAdornmentBaseHandler } from "../univariate-measure-adornment-base-handler"

export const meanAdornmentHandler: DIAdornmentHandler = univariateMeasureAdornmentBaseHandler({
  adornmentType: kMeanType,
  getMeasureValue: (adornment, cellKeyString) => adornment.measures.get(cellKeyString)?.value ?? NaN,
  isAdornmentOfType: isMeanAdornment,
  measureName: "mean",
})
