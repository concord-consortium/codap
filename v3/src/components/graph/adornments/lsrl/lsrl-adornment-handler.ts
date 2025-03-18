import { getSnapshot } from "@concord-consortium/mobx-state-tree"
import { DIAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { IAdornmentModel } from "../adornment-models"
import { isLSRLAdornment } from "./lsrl-adornment-model"

export const lsrlAdornmentHandler: DIAdornmentHandler = {
  get(adornment: IAdornmentModel) {
    if (!isLSRLAdornment(adornment)) {
      return { success: false, values: { error: "Not a least squares line adornment" } }
    }

    const fullAdornmentSnapshot = {
      ...getSnapshot(adornment),
      // Extract volatile properties for each line
      lines: Object.fromEntries(
        Array.from(adornment.lines.entries()).map(([cellKey, linesMap]) => {
          return [
            cellKey,
            Object.fromEntries(
              Array.from(linesMap.entries()).map(([legendKey, line]) => {
                return [
                  legendKey,
                  {
                    ...getSnapshot(line),
                    category: line.category,
                    intercept: line.intercept,
                    rSquared: line.rSquared,
                    sdResiduals: line.sdResiduals,
                    slope: line.slope
                  }
                ]
              })
            )
          ]
        })
      )
    }

    return fullAdornmentSnapshot
  }
}

