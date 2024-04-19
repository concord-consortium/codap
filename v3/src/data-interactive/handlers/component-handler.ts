import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DINotification, DIResources, DIValues } from "../data-interactive-types"
import { uiState } from "../../models/ui-state"
import { appState } from "../../models/app-state"

const componentNotFoundResult = { success: false , values: { error: t("V3.DI.Error.componentNotFound") } } as const

export const diComponentHandler: DIHandler = {
  delete(resources: DIResources) {
    const { component } = resources
    if (!component) return componentNotFoundResult

    appState.document.deleteTile(component.id)

    return { success: true }
  },
  notify(resources: DIResources, values?: DIValues) {
    const { component } = resources
    if (!component) return componentNotFoundResult

    if (!values) return { success: false, values: { error: t("V3.DI.Error.valuesRequired") } }

    const { request } = values as DINotification
    if (request === "select") {
      uiState.setFocusedTile(component.id)
    // } else if (request === "autoScale") { // TODO Handle autoScale requests
    }

    return { success: true }
  }
}

registerDIHandler("component", diComponentHandler)
