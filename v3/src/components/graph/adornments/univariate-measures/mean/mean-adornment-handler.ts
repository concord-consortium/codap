import { getSnapshot } from "@concord-consortium/mobx-state-tree"
import { DIAdornmentHandler } from "../../../../../data-interactive/handlers/adornment-handler"
import { IAdornmentModel } from "../../adornment-models"
import { isMeanAdornment } from "./mean-adornment-model"
import { t } from "../../../../../utilities/translation/translate"

export const meanAdornmentHandler: DIAdornmentHandler = {
  get(adornment: IAdornmentModel) {
    if (!isMeanAdornment(adornment)) return { success: false, values: { error: "Not a mean adornment" } }

    const fullAdornmentSnapshot = {
      ...getSnapshot(adornment),
      // Add volatile measure values to snapshot.
      measures: Object.fromEntries(
        Array.from(adornment.measures.entries()).map(([key, measure]) => 
          [key, { ...getSnapshot(measure), value: measure.value }]
        )
      ),
      labelTitle: t(adornment.labelTitle)
    }

    return fullAdornmentSnapshot
  }
}
