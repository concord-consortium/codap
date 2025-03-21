import { IAdornmentModel } from "../../components/graph/adornments/adornment-models"
import { IGraphContentModel, isGraphContentModel } from "../../components/graph/models/graph-content-model"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources } from "../data-interactive-types"
import { adornmentNotFoundResult } from "./di-results"

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
    if (!adornment?.isVisible) return adornmentNotFoundResult
    if (!isGraphContentModel(component?.content)) return { success: false, values: { error: "Not a graph component" } }

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
    return { success: false, values: { error: "Unsupported adornment type" } }
  }
}

registerDIHandler("adornment", diAdornmentHandler)
