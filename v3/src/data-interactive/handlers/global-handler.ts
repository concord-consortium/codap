import { kDefaultSliderName, kDefaultSliderValue } from "../../components/slider/slider-utils"
import { appState } from "../../models/app-state"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { getGlobalValueManager } from "../../models/global/global-value-manager"
import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIGlobal, DIHandler, DIResources, DIValues } from "../data-interactive-types"
import { valuesFromGlobal } from "../data-interactive-type-utils"
import { valuesRequiredResult } from "./di-results"

const illegalValueResult = { success: false, values: { error: t("V3.DI.Error.globalIllegalValue") } } as const

// A global value is a number, or text that reads as one. Unlike V2, which stored whatever it was sent,
// anything else (booleans, empty text, other text) is refused, since sliders and formulas expect numbers.
export function toGlobalValue(value: unknown) {
  const num = typeof value === "number" ? value
            : typeof value === "string" && value.trim() !== "" ? Number(value)
            : NaN
  return isFinite(num) ? num : undefined
}

export const diGlobalHandler: DIHandler = {
  create(_resources: DIResources, values?: DIValues) {
    const { document } = appState
    const globalManager = getGlobalValueManager(getSharedModelManager(document))
    // as in V2, a create with no values makes a global value with the default name and value
    const { name, value } = (values ?? {}) as DIGlobal

    const _value = toGlobalValue(value ?? kDefaultSliderValue)
    if (_value == null) return illegalValueResult

    const globalSnapshot = {
      name: (name || globalManager?.uniqueName() || kDefaultSliderName).toString(),
      value: _value
    }

    if (globalManager?.getValueByName(globalSnapshot.name)) {
      return { success: false, values: { error: t("V3.DI.Error.globalDuplicateName") } }
    }

    const global = document.applyModelChange(() => globalManager?.addValueSnapshot(globalSnapshot))
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
    if (!values) return valuesRequiredResult
    const { value } = values as DIGlobal
    if (!global || value == null) return { success: false, values: { error: t("V3.DI.Error.missingGlobalOrValue") } }

    const _value = toGlobalValue(value)
    if (_value == null) return illegalValueResult

    document.applyModelChange(
      () => global.setValue(_value),
      // a value that doesn't change leaves what can be redone
      { keepRedo: global.value === _value && !global.isUpdatingDynamically }
    )
    return { success: true }
  }
}

registerDIHandler("global", diGlobalHandler)
