import { kDefaultSliderName, kDefaultSliderValue } from "../../components/slider/slider-utils"
import { appState } from "../../models/app-state"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { getGlobalValueManager } from "../../models/global/global-value-manager"
import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIGlobal, DIHandler, DIResources, DIValues } from "../data-interactive-types"
import { valuesFromGlobal } from "../data-interactive-type-utils"

const illegalValueResult = { success: false, values: { error: t("V3.DI.Error.globalIllegalValue") } } as const
const isIllegalValue = (value: any) => !isFinite(value)

export const diGlobalHandler: DIHandler = {
  create(_resources: DIResources, values?: DIValues) {
    const { document } = appState
    const globalManager = getGlobalValueManager(getSharedModelManager(document))
    const { name, value } = values as DIGlobal

    const _value = Number(value ?? kDefaultSliderValue)
    if (isIllegalValue(_value)) return illegalValueResult

    const globalSnapshot = {
      name: (name || globalManager?.uniqueName() || kDefaultSliderName).toString(),
      value: _value
    }

    if (globalManager?.getValueByName(globalSnapshot.name)) {
      return { success: false, values: { error: t("V3.DI.Error.globalDuplicateName") } }
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
    const { document } = appState
    const { global } = resources
    const { value } = values as DIGlobal
    if (!global || !value) return { success: false, values: { error: t("V3.DI.Error.missingGlobalOrValue") } }

    const _value = Number(value)
    if (isIllegalValue(_value)) return illegalValueResult

    document.applyModelChange(
      () => global.setValue(_value)
    )
    return { success: true }
  }
}

registerDIHandler("global", diGlobalHandler)
