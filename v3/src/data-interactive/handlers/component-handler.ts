import { t } from "../../utilities/translation/translate"
import { appState } from "../../models/app-state"
import { uiState } from "../../models/ui-state"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DINotification, DIResources, DIValues } from "../data-interactive-types"

const componentNotFoundResult = { success: false, values: { error: t("V3.DI.Error.componentNotFound") } } as const

export const diComponentHandler: DIHandler = {
  delete(resources: DIResources) {
    const { component } = resources
    if (!component) return componentNotFoundResult

    const { document } = appState
    document.applyModelChange(() => {
      document.content?.deleteOrHideTile(component.id)
    })

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
