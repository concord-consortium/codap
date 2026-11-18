import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler } from "../data-interactive-types"
import { appState } from "../../models/app-state"

export const diConfigurationListHandler: DIHandler = {
  get() {
    const gaussianFitEnabled = appState.document.content?.gaussianFitEnabled
    return {
      success: true,
      values: [
        {
          name: "gaussianFitEnabled",
          value: gaussianFitEnabled ? "yes" : ''
        }
      ]
    }
  }
}

registerDIHandler("configurationList", diConfigurationListHandler)
