import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources } from "../data-interactive-types"
import { getDocumentContentPropertyFromNode } from "../../utilities/mst-utils"

export const diConfigurationHandler: DIHandler = {
  get(_resources: DIResources) {
    const isEnabled = getDocumentContentPropertyFromNode(_resources.interactiveFrame, 'gaussianFitEnabled')
    return { success: true,
      values: [
        {
          name: 'gaussianFitEnabled',
          value: isEnabled ? "yes" : ""
        }
      ]
    }
  }
  ,
}

registerDIHandler("configurationList", diConfigurationHandler)
