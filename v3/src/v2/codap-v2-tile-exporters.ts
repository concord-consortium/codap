import { kDefaultTileHeight, kDefaultTileWidth, kTitleBarHeight } from "../components/constants"
import { IFreeTileRow, isFreeTileLayout } from "../models/document/free-tile-row"
import { ISharedModelManager } from "../models/shared/shared-model-manager"
import { ITileModel } from "../models/tiles/tile-model"
import { toV2Id } from "../utilities/codap-utils"
import { CodapV2Component, CodapV2ComponentStorage } from "./codap-v2-types"

export interface V2ExporterOutput {
  type: CodapV2Component["type"]
  storage?: CodapV2ComponentStorage
}

export interface V2TileExportArgs {
  tile: ITileModel
  row?: IFreeTileRow
  sharedModelManager?: ISharedModelManager
}
export type V2TileExportFn = (args: V2TileExportArgs) => Maybe<V2ExporterOutput>

// map from v2 component type to export function
const gV2TileExporters = new Map<string, V2TileExportFn>()

// register a v2 exporter for the specified tile type
export function registerV2TileExporter(tileType: string, exportFn: V2TileExportFn) {
  gV2TileExporters.set(tileType, exportFn)
}

// export the specified v2 component using the appropriate registered exporter
export function exportV2Component(args: V2TileExportArgs): Maybe<CodapV2Component> {
  const output = gV2TileExporters.get(args.tile.content.type)?.(args)
  if (!output) return

  const layout = args.row?.getTileLayout(args.tile.id)
  if (!isFreeTileLayout(layout)) return

  const id = toV2Id(args.tile.id)

  const tileWidth = layout.width ?? kDefaultTileWidth
  const tileHeight = layout.height ?? kDefaultTileHeight

  return {
    type: output.type,
    guid: id,
    id,
    componentStorage: {
      name: args.tile.name,
      title: args.tile._title,
      cannotClose: args.tile.cannotClose,
      // TODO_V2_EXPORT check this logic
      userSetTitle: !!args.tile._title && args.tile._title !== args.tile.name,
      // include the component-specific storage
      ...output.storage
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
