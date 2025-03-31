import { IAdornmentModel } from "../../components/graph/adornments/adornment-models"
import { IGraphContentModel, isGraphContentModel } from "../../components/graph/models/graph-content-model"
import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIAttribute } from "../data-interactive-data-set-types"
import { DIErrorResult, DIHandler, DIHandlerFnResult, DIResources, DIValues } from "../data-interactive-types"
import { adornmentNotFoundResult, adornmentNotSupportedResult, valuesRequiredResult, errorResult } from "./di-results"

interface ICreateArgs {
  graphContent: IGraphContentModel
  values?: DIValues
}

export interface DIAdornmentHandler {
  create?: (args: ICreateArgs) => DIHandlerFnResult | DIErrorResult
  delete?: (args: ICreateArgs) => DIHandlerFnResult | DIErrorResult
  get: (adornment: IAdornmentModel, component: IGraphContentModel) => Maybe<Record<string, any>>
  update?: (args: ICreateArgs) => DIHandlerFnResult | DIErrorResult
}

const isTypeSpecified = (val: unknown): val is DIAttribute => {
  return typeof val === "object" && val !== null && "type" in val && typeof val.type === "string"
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

export const resolveAdornmentType = (typeOrAlias: unknown): string => {
  return typeof typeOrAlias === "string"
          ? diAdornmentTypeAliases.get(typeOrAlias) ?? typeOrAlias
          : String(typeOrAlias)
}

export const diAdornmentHandler: DIHandler = {
  create(resources: DIResources, values?: DIValues) {
    if (!values) return valuesRequiredResult

    const { component } = resources
    if (!isGraphContentModel(component?.content)) {
      return errorResult(t("V3.DI.Error.unsupportedComponent", { vars: [component?.content.type] }))
    }

    const graphContent = component.content
    if (isTypeSpecified(values) && values.type) {
      const { type } = values
      const resolvedType = resolveAdornmentType(type) ?? type
      const handler = diAdornmentHandlers.get(resolvedType)

      if (handler?.create) {
        return handler.create({graphContent, values})
      }

      return errorResult(t("V3.DI.Error.adornmentRequestNotSupported", { vars: [type, "create"] }))
    } else {
      return valuesRequiredResult
    }
  },

  delete(resources: DIResources, values?: DIValues) {
    const { component } = resources
    if (!isTypeSpecified(values) || !values.type) return valuesRequiredResult
    if (!isGraphContentModel(component?.content)) {
      return errorResult(t("V3.DI.Error.unsupportedComponent", { vars: [component?.content.type] }))
    }
  
    const { type } = values
    const resolvedType = resolveAdornmentType(type) ?? type
    const graphContent = component.content
    const adornmentsStore = graphContent.adornmentsStore
    const adornment = adornmentsStore.findAdornmentOfType<IAdornmentModel>(resolvedType)
  
    if (!adornment) return adornmentNotFoundResult
  
    const handler = diAdornmentHandlers.get(resolvedType)
  
    if (handler?.delete) {
      return handler.delete({ graphContent })
    }
  
    // If the adornment doesn't have a delete handler, we just hide the adornment.
    adornmentsStore.hideAdornment(resolvedType)
    return { success: true }
  },

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
  },

  update(resources: DIResources, values?: DIValues) {
    if (!values) return valuesRequiredResult

    const { component } = resources
    if (!isGraphContentModel(component?.content)) {
      return errorResult(t("V3.DI.Error.unsupportedComponent", { vars: [component?.content.type] }))
    }

    const graphContent = component.content
    if (isTypeSpecified(values) && values.type) {
      const { type } = values as any
      const resolvedType = resolveAdornmentType(type) ?? type
      const existingCountAdornment = graphContent.adornmentsStore.findAdornmentOfType<IAdornmentModel>(resolvedType)
      if (!existingCountAdornment) {
        return errorResult(t("V3.DI.Error.adornmentNotFound"))
      }

      const handler = diAdornmentHandlers.get(resolvedType)
      if (handler?.update) {
        return handler.update({graphContent, values})
      } else {
        return errorResult(t("V3.DI.Error.adornmentRequestNotSupported", { vars: [type, "update"] }))
      }
    } else {
      return valuesRequiredResult
    }
  }
}

registerDIHandler("adornment", diAdornmentHandler)
