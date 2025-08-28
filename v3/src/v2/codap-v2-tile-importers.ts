import { IFreeTileInRowOptions } from "../models/document/free-tile-row"
import { IGlobalValueManager } from "../models/global/global-value-manager"
import { IDataSetMetadata } from "../models/shared/data-set-metadata"
import { ISharedDataSet } from "../models/shared/shared-data-set"
import { ISharedModel } from "../models/shared/shared-model"
import { ITileContentModel } from "../models/tiles/tile-content"
import { ITileModel, ITileModelSnapshotIn } from "../models/tiles/tile-model"
import { CodapV2Document } from "./codap-v2-document"
import { ICodapV2BaseComponent } from "./codap-v2-types"

/*
  Tiles that can be imported from components in v2 documents should register their
  importer functions here.
 */
// the arguments passed to a v2 component importer function
export type GetCaseDataResult = { sharedData?: ISharedDataSet, sharedMetadata?: IDataSetMetadata }
export type LayoutTransformFn = (layout: IFreeTileInRowOptions) => IFreeTileInRowOptions
export interface V2TileImportArgs {
  v2Component: ICodapV2BaseComponent
  v2Document: CodapV2Document
  getCaseData: (dataContextGuid: number) => GetCaseDataResult
  getGlobalValues: () => Maybe<IGlobalValueManager>
  // function to call to insert the imported tile into the document
  insertTile: (tileSnap: ITileModelSnapshotIn, transform?: LayoutTransformFn) => ITileModel | undefined
  linkSharedModel: (tileContent: ITileContentModel, sharedModel?: ISharedModel, isProvider?: boolean) => void
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

export type V2TileSnapshotProcessorFn = (tileModel: ITileModel, tileSnap: ITileModelSnapshotIn) => ITileModelSnapshotIn

// During the process of importing a tile, there may be a need to post-process the snapshot. For example, a
// graph tile needs to post-process so that its GraphPointLayerModel gets the correct ID. Without doing so,
// applySnapshot cannot determine that the sole element of the layers array is a GraphPointLayerModel.
export const gV2PostImportSnapshotProcessors
  = new Map<string, (tileModel: ITileModel, tileSnap: ITileModelSnapshotIn) => ITileModelSnapshotIn>()

// register an importer for the specified v2 component type
export function registerV2PostImportSnapshotProcessor(v2ComponentType: string, processorFn: V2TileSnapshotProcessorFn) {
  gV2PostImportSnapshotProcessors.set(v2ComponentType, processorFn)
}
