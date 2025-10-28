import { kDefaultTileHeight, kDefaultTileWidth, kTitleBarHeight } from "../components/constants"
import { IFreeTileRow, isFreeTileLayout } from "../models/document/free-tile-row"
import { ISharedModelManager } from "../models/shared/shared-model-manager"
import { ITileModel } from "../models/tiles/tile-model"
import { toV2Id } from "../utilities/codap-utils"
import { CodapV2Component, CodapV2ComponentStorage } from "./codap-v2-types"

export interface V2ExporterOutput {
  type: CodapV2Component["type"]
  componentStorage?: CodapV2ComponentStorage
}

interface IGameContextMetadata {
  gameName?: string
  gameUrl?: string
  gameState?: any
}
export type GameContextMetadataMap = Record<string, IGameContextMetadata>

export interface V2TileExportArgs {
  tile: ITileModel
  row?: IFreeTileRow
  sharedModelManager?: ISharedModelManager
  gameContextMetadataMap?: GameContextMetadataMap
}
interface V2TileExportFnOptions {
  suppressName?: boolean
}
interface V2TileExportFnOptionsProp {
  options?: (args: V2TileExportArgs) => V2TileExportFnOptions
}
export type V2TileExportFn = ((args: V2TileExportArgs) => Maybe<V2ExporterOutput>) & V2TileExportFnOptionsProp

// map from v2 component type to export function
const gV2TileExporters = new Map<string, V2TileExportFn>()

/**
 * Take a v2 component type and remove the properties which
 * exportV2Component will handle. This type is what the V2TileExportFn
 * should return.
 */
export type V2ExportedComponent<ComponentType> = Omit<ComponentType, "layout" | "guid" | "id" | "savedHeight">

// register a v2 exporter for the specified tile type
export function registerV2TileExporter(tileType: string, exportFn: V2TileExportFn) {
  gV2TileExporters.set(tileType, exportFn)
}

// export the specified v2 component using the appropriate registered exporter
export function exportV2Component(args: V2TileExportArgs): Maybe<CodapV2Component> {
  const { tile } = args
  const v2ExportFn = gV2TileExporters.get(tile.content.type)
  const suppressName = v2ExportFn?.options?.(args).suppressName
  const output = v2ExportFn?.(args)
  if (!output) return

  const layout = args.row?.getTileLayout(tile.id)
  if (!isFreeTileLayout(layout)) return

  const id = toV2Id(tile.id)
  const name = suppressName ? undefined : { name: tile.name }
  const tileWidth = layout.width ?? kDefaultTileWidth
  const tileHeight = layout.height ?? kDefaultTileHeight

  return {
    type: output.type,
    guid: id,
    id,
    componentStorage: {
      ...name,
      title: tile._title,
      cannotClose: tile.cannotClose,
      userSetTitle: tile.userSetTitle || (!!tile._title && tile._title !== tile.name),
      // include the component-specific storage
      ...output.componentStorage
    },
    layout: {
      width: tileWidth,
      height: layout.isMinimized ? kTitleBarHeight : tileHeight,
      left: layout.position.x,
      top: layout.position.y,
      isVisible: !layout.isHidden,
      zIndex: layout.zIndex
    },
    savedHeight: layout.isMinimized ? tileHeight : null
  } as CodapV2Component
}
