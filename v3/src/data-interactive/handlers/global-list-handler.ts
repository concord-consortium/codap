import { appState } from "../../models/app-state"
import { GlobalValueManager } from "../../models/global/global-value-manager"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DISingleValues } from "../data-interactive-types"
import { valuesFromGlobal } from "../di-conversion-utils"

export const diGlobalListHandler: DIHandler = {
  get() {
    const { document } = appState
    const globalManager = document.content?.getFirstSharedModelByType(GlobalValueManager)
    const values: DISingleValues[] = []
    globalManager?.globals.forEach(global => values.push(valuesFromGlobal(global)))

    return {
      success: true,
      values
    }
  }
}

registerDIHandler("globalList", diGlobalListHandler)
