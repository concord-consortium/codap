import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DINotification, DIResources, DIValues } from "../data-interactive-types"
import { uiState } from "../../models/ui-state"

const componentNotFoundResult = { success: false , values: { error: t("V3.DI.Error.componentNotFound") } } as const

export const diComponentHandler: DIHandler = {
  notify(resources: DIResources, values?: DIValues) {
    const { component } = resources
    if (!component) return componentNotFoundResult

    if (!values) return { success: false, values: { error: t("V3.DI.Error.valuesRequired") } }

    const { request } = values as DINotification
    if (request === "select") {
      uiState.setFocusedTile(component.id)
    }

    return { success: true }
  }
}

registerDIHandler("component", diComponentHandler)
