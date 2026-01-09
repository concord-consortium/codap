import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources, DIValues } from "../data-interactive-types"
import { getDocumentContentFromNode } from "../../utilities/mst-document-utils"
import { valuesRequiredResult } from "./di-results"

export const diConfigurationHandler: DIHandler = {
  get(resources: DIResources) {
    const {configuration} = resources
    const documentContent = getDocumentContentFromNode(resources.interactiveFrame)
    let value:boolean | undefined
    // Although there is currently only one configuration, we use a switch statement to
    // facilitate future expansion.
    switch (configuration) {
      case "gaussianFitEnabled":
        value = documentContent?.gaussianFitEnabled
        break
      default:
    }
    if (value === undefined) {
      return {
        success: false,
        values: { error: `unknown configuration "${configuration}"` }
      }
    }
    return {
      success: true,
      // The type case is necessary to satisfy the return type
      values: { value: (value ? "yes" : "") as any }
    }
  },
  update(resources: DIResources, values?: DIValues) {
    const {configuration} = resources
    const documentContent = getDocumentContentFromNode(resources.interactiveFrame)
    if (!values) return valuesRequiredResult
    const {value} = values as {value: string}
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
