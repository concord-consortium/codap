import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources, DIUpdateConfigurationValue, DIValues } from "../data-interactive-types"
import { getDocumentContentFromNode } from "../../utilities/mst-document-utils"
import { noInteractiveFrameResult, valuesRequiredResult } from "./di-results"

export const diConfigurationHandler: DIHandler = {
  get(resources: DIResources) {
    if (!resources.interactiveFrame) return noInteractiveFrameResult
    const {configuration} = resources
    const documentContent = getDocumentContentFromNode(resources.interactiveFrame)
    let value : string | undefined
    // Although there is currently only one configuration, we use a switch statement to
    // facilitate future expansion.
    switch (configuration) {
      case "gaussianFitEnabled":
        value = documentContent?.gaussianFitEnabled ? "yes" : undefined
        break
      default:
        return {
          success: false,
          values: { error: `unknown configuration "${configuration}"` }
        }
    }
    return {
      success: true,
      values: { name: configuration, value }
    }
  },
  update(resources: DIResources, values?: DIValues) {
    if (!resources.interactiveFrame) return noInteractiveFrameResult
    if (!values) return valuesRequiredResult
    const {configuration} = resources
    const documentContent = getDocumentContentFromNode(resources.interactiveFrame)
    const { value } = values as DIUpdateConfigurationValue
    // Although there is currently only one configuration, we use a switch statement to
    // facilitate future expansion.
    switch (configuration) {
      case "gaussianFitEnabled":
        documentContent?.setGaussianFitEnabled(value === "yes")
        return { success: true }
      default:
        return {
          success: false,
          values: { error: `unknown configuration "${configuration}"` }
        }
    }
  }
}

registerDIHandler("configuration", diConfigurationHandler)
