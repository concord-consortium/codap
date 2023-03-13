import { ISharedModelManager } from "../models/shared/shared-model-manager"
import { ITileModel } from "../models/tiles/tile-model"
import { CodapV2Document } from "./codap-v2-document"
import { ICodapV2BaseComponent } from "./codap-v2-types"

export interface V2TileImportArgs {
  v2Component: ICodapV2BaseComponent
  v2Document: CodapV2Document
  sharedModelManager?: ISharedModelManager
  insertTile: (tile: ITileModel) => void
}
export type V2TileImportFn = (args: V2TileImportArgs) => void

const gV2TileImporters = new Map<string, V2TileImportFn>()

export function registerV2TileImporter(v2Type: string, importFn: V2TileImportFn) {
  gV2TileImporters.set(v2Type, importFn)
}

export function importV2Component(args: V2TileImportArgs) {
  return gV2TileImporters.get(args.v2Component.type)?.(args)
}
