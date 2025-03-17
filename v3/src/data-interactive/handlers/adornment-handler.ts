import { getSnapshot } from "@concord-consortium/mobx-state-tree"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources } from "../data-interactive-types"
import { adornmentNotFoundResult } from "./di-results"
import { t } from "../../utilities/translation/translate"


export const diAdornmentHandler: DIHandler = {
  get(resources: DIResources) {
    const { adornment } = resources
    if (!adornment) return adornmentNotFoundResult

    const adornmentSnapshot = getSnapshot(adornment)

    // Translate `labelTitle` if it exists.
    if ("labelTitle" in adornmentSnapshot && typeof adornmentSnapshot.labelTitle === "string") {
      return {
        success: true,
        values: {
          ...adornmentSnapshot,
          labelTitle: t(adornmentSnapshot.labelTitle)
        }
      }
    }

    return {
      success: true,
      values: adornmentSnapshot
    } 
  }
}

registerDIHandler("adornment", diAdornmentHandler)
