import { appState } from "../../models/app-state"
import { INewTileOptions } from "../../models/codap/create-tile"
import { isFreeTileRow } from "../../models/document/free-tile-row"
import { ITileContentModel, ITileContentSnapshotWithType } from "../../models/tiles/tile-content"
import { uiState } from "../../models/ui-state"
import { toV2Id } from "../../utilities/codap-utils"
import { t } from "../../utilities/translation/translate"
import {
  kComponentTypeV2ToV3Map, kComponentTypeV3ToV2Map, V2Component, V2SpecificComponent
} from "../data-interactive-component-types"
import { registerDIHandler } from "../data-interactive-handler"
import {
  DIErrorResult, DIHandler, DIHandlerFnResult, DINotification, DIResources, DIValues, isErrorResult
} from "../data-interactive-types"
import {
  componentNotFoundResult, errorResult, valuesRequiredResult
} from "./di-results"
import { getTileContentInfo } from "../../models/tiles/tile-content-info"
import { ITileModel } from "../../models/tiles/tile-model"

type CreateOrShowTileFn = (type: string, options?: INewTileOptions) => Maybe<ITileModel>

interface ICreateArgs {
  type: string  // v2 type
  values?: DIValues
  setCreateOrShow: (createOrShow: CreateOrShowTileFn) => void
  setOptions: (options: INewTileOptions) => void
}

export interface DIComponentHandler {
  create: (args: ICreateArgs) => ITileContentSnapshotWithType | DIErrorResult | undefined,
  get: (content: ITileContentModel) => Maybe<Record<string, any>>
  update?: (content: ITileContentModel, values: DIValues) => DIHandlerFnResult
}

// registry of tile component handlers -- key is v2 tile type
const diComponentHandlers = new Map<string, DIComponentHandler>()

export function registerComponentHandler(type: string, handler: DIComponentHandler) {
  diComponentHandlers.set(type, handler)
}

export const diComponentHandler: DIHandler = {
  create(_resources: DIResources, values?: DIValues) {
    if (!values) return valuesRequiredResult

    const { type, cannotClose, dimensions, name, title: _title } = values as V2Component
    const { document } = appState

    // check if there's a registered handler for this type
    const handler = diComponentHandlers.get(type)
    if (handler) {
      let createOrShow: CreateOrShowTileFn = (_type, _options) => document.content?.createOrShowTile(_type, _options)
      const newTileOptions: INewTileOptions = {}
      const setCreateOrShow = (_createOrShow: CreateOrShowTileFn) => createOrShow = _createOrShow
      const setOptions = (_options: INewTileOptions) => Object.assign(newTileOptions, _options)
      const content = handler?.create({ type, values, setCreateOrShow, setOptions })
      if (isErrorResult(content)) return content

      // Create the tile
      return document.applyModelChange(() => {
        const title = _title ?? name
        const options = { cannotClose, content, ...dimensions, name, title, ...newTileOptions }
        const tile = createOrShow(kComponentTypeV2ToV3Map[type], options)
        if (!tile) return errorResult(t("V3.DI.Error.componentNotCreated"))

        // TODO Handle isIndexHidden
        return {
          success: true,
          values: {
            id: toV2Id(tile.id),
            title: tile.title,
            type
          }
        }
      })
    }

    return errorResult(t("V3.DI.Error.unsupportedComponent", { vars: [type] }))

    // const v3Type: Maybe<string> = kComponentTypeV2ToV3Map[type]

    // const componentNotCreatedResult = errorResult(t("V3.DI.Error.componentNotCreated"))
    // return document.applyModelChange(() => {
    //   // General case
    //   if (kComponentTypeV2ToV3Map[type]) {
    //     let content: ITileContentSnapshotWithType | undefined
    //     const extraOptions: INewTileOptions = {}

    //     // TODO Handle other types:
    //     // text
    //     // guide
    //     // image view

    //     // Create the tile
    //     const title = _title ?? name
    //     const options = { cannotClose, content, ...dimensions, name, title, ...extraOptions }
    //     const tile = document.content?.createOrShowTile(kComponentTypeV2ToV3Map[type], options)
    //     if (!tile) return componentNotCreatedResult

    //     // TODO Handle position

    //     return {
    //       success: true,
    //       values: {
    //         id: toV2Id(tile.id),
    //         title: tile.title,
    //         type
    //       }
    //     }
    //   }

    //   return errorResult(t("V3.DI.Error.unsupportedComponent", { vars: [type] }))
    // })
  },

  delete(resources: DIResources) {
    const { component } = resources
    if (!component) return componentNotFoundResult

    const { document } = appState
    document.applyModelChange(() => {
      document.content?.deleteOrHideTile(component.id)
    })

    return { success: true }
  },

  get(resources: DIResources) {
    const { component } = resources
    if (!component) return componentNotFoundResult

    const { cannotClose, content, id, name: _name, _title } = component
    const v2Id = toV2Id(id)
    const name = _name || undefined
    const row = appState.document.content?.findRowContainingTile(id)
    const freeTileRow = row && isFreeTileRow(row) ? row : undefined
    const dimensions = freeTileRow?.getTileDimensions(id)
    const position = freeTileRow?.getTilePosition(id)
    const generalValues = {
      cannotClose,
      dimensions,
      id: v2Id,
      name,
      position,
      title: _title,
      type: kComponentTypeV3ToV2Map[content.type]
    }

    let values: Maybe<V2SpecificComponent>

    // check if there's a registered handler for this type
    const v2Type = getTileContentInfo(content.type)?.getV2Type?.(content) ?? kComponentTypeV3ToV2Map[content.type]
    const handler = diComponentHandlers.get(v2Type)
    if (handler) {
      values = { ...generalValues, ...handler?.get(content) } as V2SpecificComponent
    }

    if (values) return { success: true, values }
    return { success: false, values: { error: "Unsupported component type"} }
  },

  notify(resources: DIResources, values?: DIValues) {
    const { component } = resources
    if (!component) return componentNotFoundResult

    if (!values) return valuesRequiredResult

    const { request } = values as DINotification
    if (request === "select") {
      uiState.setFocusedTile(component.id)
    // } else if (request === "autoScale") { // TODO Handle autoScale requests
    }

    return { success: true }
  },

  update(resources: DIResources, values?: DIValues) {
    const { component } = resources
    if (!component) return componentNotFoundResult
    const { content } = component

    if (!values) return valuesRequiredResult

    const v2Type = getTileContentInfo(content.type)?.getV2Type?.(content) ?? kComponentTypeV3ToV2Map[content.type]
    const handler = diComponentHandlers.get(v2Type)
    if (handler) {
      // TODO: better error message?
      return handler.update?.(content, values) ?? errorResult(t("V3.DI.Error.notFound"))
    }

    return errorResult(t("V3.DI.Error.unsupportedComponent", { vars: [content.type] }))
  }
}

registerDIHandler("component", diComponentHandler)
