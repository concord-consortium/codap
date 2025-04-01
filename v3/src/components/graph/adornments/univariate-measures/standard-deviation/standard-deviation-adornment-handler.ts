import { DIAdornmentHandler } from "../../../../../data-interactive/handlers/adornment-handler"
import { isStandardDeviationAdornment } from "./standard-deviation-adornment-model"
import { kStandardDeviationType } from "./standard-deviation-adornment-types"
import { univariateMeasureAdornmentBaseHandler } from "../univariate-measure-adornment-base-handler"

export const standardDeviationAdornmentHandler: DIAdornmentHandler = univariateMeasureAdornmentBaseHandler({
  adornmentType: kStandardDeviationType,
  getAdditionalData: (adornment, cellKey, dataConfig) => {
    if (isStandardDeviationAdornment(adornment)) {
      const primaryAttrId = dataConfig?.primaryAttributeID
      return adornment.computeMeasureRange(primaryAttrId, cellKey, dataConfig)
    }
  },
  getMeasureValue: (adornment, cellKeyString) => adornment.measures.get(cellKeyString)?.value ?? NaN,
  isAdornmentOfType: isStandardDeviationAdornment,
  measureName: "mean"
})
