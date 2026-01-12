import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources } from "../data-interactive-types"
import { getDocumentContentPropertyFromNode } from "../../utilities/mst-utils"

export const diConfigurationListHandler: DIHandler = {
  get(_resources: DIResources) {
    const gaussianFitEnabled = getDocumentContentPropertyFromNode(_resources.interactiveFrame, "gaussianFitEnabled")
    return {
      success: true,
      values: [
        {
          name: "gaussianFitEnabled",
          value: gaussianFitEnabled ? "yes" : undefined
        }
      ]
    }
  },
}

registerDIHandler("configurationList", diConfigurationListHandler)
