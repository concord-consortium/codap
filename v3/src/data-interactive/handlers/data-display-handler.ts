import { ITileContentModel } from "../../models/tiles/tile-content"
import { getTileContentInfo } from "../../models/tiles/tile-content-info"
import { t } from "../../utilities/translation/translate"
import { kComponentTypeV3ToV2Map } from "../data-interactive-component-types"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources } from "../data-interactive-types"
import { componentNotFoundResult } from "./di-results"

export interface DIDataDisplayHandler {
  get: (content: ITileContentModel) => Maybe<Record<string, any>>
}

// registry of data display handlers -- key is v2 tile type
export const diDataDisplayHandlers = new Map<string, DIDataDisplayHandler>()

export function registerDataDisplayHandler(type: string, handler: DIDataDisplayHandler) {
  diDataDisplayHandlers.set(type, handler)
}

export const diDataDisplayHandler: DIHandler = {
  get(resources: DIResources) {
    const { component } = resources
    if (!component) return componentNotFoundResult

    const { content } = component

    const v2Type = getTileContentInfo(content.type)?.getV2Type?.(content) ?? kComponentTypeV3ToV2Map[content.type]
    const handler = diDataDisplayHandlers.get(v2Type)
    const imgSnapshotRes = { ...handler?.get(component?.content) }
    const { exportDataUri, success } = imgSnapshotRes
    console.log("exportDataUri 3", exportDataUri)
    const values = success
      ? { exportDataUri }
      : { error: t("V3.DI.Error.dataDisplayNotFound") }

    return {
      success,
      values
    }
  }
}

registerDIHandler("dataDisplay", diDataDisplayHandler)
