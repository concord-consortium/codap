import { ISharedModelManager } from "../models/shared/shared-model-manager"
import { ITileModel, ITileModelSnapshotIn } from "../models/tiles/tile-model"
import { CodapV2Document } from "./codap-v2-document"
import { ICodapV2BaseComponent } from "./codap-v2-types"

/*
  Tiles that can be imported from components in v2 documents should register their
  importer functions here.
 */

// the arguments passed to a v2 component importer function
export interface V2TileImportArgs {
  v2Component: ICodapV2BaseComponent
  v2Document: CodapV2Document
  sharedModelManager?: ISharedModelManager
  // function to call to insert the imported tile into the document
  insertTile: (tileSnap: ITileModelSnapshotIn) => ITileModel | undefined
}
export type V2TileImportFn = (args: V2TileImportArgs) => ITileModel | undefined

// map from v2 component type to import function
const gV2TileImporters = new Map<string, V2TileImportFn>()

// register an importer for the specified v2 component type
export function registerV2TileImporter(v2ComponentType: string, importFn: V2TileImportFn) {
  gV2TileImporters.set(v2ComponentType, importFn)
}

// import the specified v2 component using the appropriate registered importer
export function importV2Component(args: V2TileImportArgs) {
  return gV2TileImporters.get(args.v2Component.type)?.(args)
}
