import { kDefaultSliderName, kDefaultSliderValue } from "../../components/slider/slider-utils"
import { appState } from "../../models/app-state"
import { IGlobalValue } from "../../models/global/global-value"
import { GlobalValueManager } from "../../models/global/global-value-manager"
import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIGlobal, DIHandler, DIResources, DIValues } from "../data-interactive-types"

function valuesFromGlobal(global: IGlobalValue) {
  return {
    name: global.name,
    value: global.value,
    id: Number(global.id) // TODO This always returns null, which seems pretty useless
  }
}

export const diGlobalHandler: DIHandler = {
  create(_resources: DIResources, values?: DIValues) {
    const { document } = appState
    const globalManager = document.content?.getFirstSharedModelByType(GlobalValueManager)
    const { name, value } = values as DIGlobal
    const globalSnapshot = {
      name: name ?? globalManager?.uniqueName() ?? kDefaultSliderName,
      value: value ?? kDefaultSliderValue
    }

    const global = globalManager?.addValueSnapshot(globalSnapshot)
    if (global) {
      return { success: true, values: valuesFromGlobal(global) }
    }
    
    return { success: false, values: { error: t("V3.DI.Error.globalCreation") } }
  },
  get(resources: DIResources) {
    const { global } = resources
    if (!global) return { success: false, values: { error: t("V3.DI.Error.notFound") }}

    return {
      success: true,
      values: valuesFromGlobal(global)
    }
  },
  update(resources: DIResources, values?: DIValues) {
    const { global } = resources
    const { value } = values as DIGlobal
    if (!global || !value) return { success: false, values: { error: t("V3.DI.Error.globalNotFound") } }

    global.applyUndoableAction(
      () => global.setValue(Number(value))
    )
    return { success: true }
  }
}

registerDIHandler("global", diGlobalHandler)
