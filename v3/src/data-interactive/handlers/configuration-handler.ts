import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources, DIUpdateConfigurationValue, DIValues } from "../data-interactive-types"
import { appState } from "../../models/app-state"
import { fieldRequiredResult, valuesRequiredResult } from "./di-results"

export const diConfigurationHandler: DIHandler = {
  get(resources: DIResources) {
    const {configuration} = resources
    const documentContent = appState.document.content
    let value : string | undefined
    // Although there is currently only one configuration, we use a switch statement to
    // facilitate future expansion.
    switch (configuration) {
      case "gaussianFitEnabled":
        value = documentContent?.gaussianFitEnabled ? "yes" : ''
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
    if (!values) return valuesRequiredResult
    const {configuration} = resources
    const documentContent = appState.document.content
    const { value } = values as DIUpdateConfigurationValue
    // Although there is currently only one configuration, we use a switch statement to
    // facilitate future expansion.
    switch (configuration) {
      case "gaussianFitEnabled":
        if (value == null) return fieldRequiredResult("Update", "configuration", "value")
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
