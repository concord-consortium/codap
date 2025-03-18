import { IAdornmentModel } from "../../components/graph/adornments/adornment-models"
import { IGraphContentModel, isGraphContentModel } from "../../components/graph/models/graph-content-model"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources } from "../data-interactive-types"
import { adornmentNotFoundResult } from "./di-results"

export interface DIAdornmentHandler {
  get: (adornment: IAdornmentModel, component: IGraphContentModel) => Maybe<Record<string, any>>
}

const diAdornmentHandlers = new Map<string, DIAdornmentHandler>()

export const registerAdornmentHandler = (type: string, handler: DIAdornmentHandler) => {
  diAdornmentHandlers.set(type, handler)
}

export const diAdornmentHandler: DIHandler = {
  get(resources: DIResources) {
    const { adornment, component } = resources
    if (!adornment) return adornmentNotFoundResult
    if (!isGraphContentModel(component?.content)) return { success: false, values: { error: "Not a graph component" } }

    let values: Maybe<Record<string, any>> 
    const handler = diAdornmentHandlers.get(adornment.type)

    if (handler) {
      values = handler?.get(adornment, component.content)
    }

    if (values) return { success: true, values }
    return { success: false, values: { error: "Unsupported adornment type" } }
  }
}

registerDIHandler("adornment", diAdornmentHandler)
