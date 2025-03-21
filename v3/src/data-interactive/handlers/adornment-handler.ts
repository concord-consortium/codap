import { IAdornmentModel } from "../../components/graph/adornments/adornment-models"
import { IGraphContentModel, isGraphContentModel } from "../../components/graph/models/graph-content-model"
import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources } from "../data-interactive-types"
import { adornmentNotFoundResult, adornmentNotSupportedResult, errorResult } from "./di-results"

export interface DIAdornmentHandler {
  get: (adornment: IAdornmentModel, component: IGraphContentModel) => Maybe<Record<string, any>>
}

const diAdornmentHandlers = new Map<string, DIAdornmentHandler>()

const diAdornmentTypeAliases = new Map<string, string>()

export const registerAdornmentHandler = (type: string, handler: DIAdornmentHandler, alias?: string) => {
  diAdornmentHandlers.set(type, handler)
  if (alias) diAdornmentTypeAliases.set(alias, type)
  const trimType = type.replace(/\s/g, "")
  // register trimmed (without spaces) types as aliases
  if (trimType !== type) diAdornmentTypeAliases.set(trimType, type)
}

export const resolveAdornmentType = (typeOrAlias: unknown) => {
  return typeof typeOrAlias === "string"
          ? diAdornmentTypeAliases.get(typeOrAlias) ?? typeOrAlias
          : typeOrAlias
}

export const diAdornmentHandler: DIHandler = {
  get(resources: DIResources) {
    const { adornment, component } = resources
    if (!isGraphContentModel(component?.content)) {
      return errorResult(t("V3.DI.Error.unsupportedComponent", { vars: [component?.content.type] }))
    }
    if (!adornment) return adornmentNotFoundResult

    let values: Maybe<Record<string, any>>
    const handler = diAdornmentHandlers.get(adornment.type)

    if (handler) {
      values = handler?.get(adornment, component.content)
    }

    if (values) {
      return {
        success: true,
        values: {
          id: adornment.id,
          type: adornment.type,
          isVisible: adornment.isVisible,
          ...values
        }
      }
    }

    return adornmentNotSupportedResult
  }
}

registerDIHandler("adornment", diAdornmentHandler)
