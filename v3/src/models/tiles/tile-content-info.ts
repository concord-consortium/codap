import { IAnyStateTreeNode } from "mobx-state-tree"
import { FormulaManagerAdapter } from "../formula/formula-manager-adapter"
import { AppConfigModelType } from "../stores/app-config-model"
import { TileContentModel, ITileContentSnapshotWithType, ITileContentModel } from "./tile-content"
import { ITileEnvironment } from "./tile-environment"

// avoids circular dependency on ITileModel
export interface ITileLikeModel {
  title?: string
  content: ITileContentModel
}

export interface IDefaultContentOptions {
  // environment in which the tile will be created
  env?: ITileEnvironment;
  // title is only currently used by the Geometry and Table tiles
  title?: string;
  // url is added so the CLUE core can add an image tile to the document when a user
  // drops an image on the document.
  url?: string;
  // appConfig contains stamps (for drawing tool), placeholderText (for text tool), etc.
  appConfig?: AppConfigModelType;
}

type TileModelSnapshotPreProcessor = (tile: any) => any

type TileContentSnapshotPostProcessor =
      (content: any, idMap: Record<string, string>, asTemplate?: boolean) => any

export interface ITileContentInfo {
  type: string;
  prefix: string; // conventionally four uppercase chars
  modelClass: typeof TileContentModel;
  defaultContent: (options?: IDefaultContentOptions) => ITileContentSnapshotWithType;
  defaultName?: (options?: IDefaultContentOptions) => string | undefined
  titleBase?: string;
  getTitle: (tile: ITileLikeModel) => string | undefined;
  getV2Type?: (content: ITileContentModel) => string;
  isSingleton?: boolean; // Only one instance of a tile is open per document (e.g. calculator and guide)
  hideOnClose?: (content?: ITileContentModel) => boolean;
  addSidecarNotes?: boolean;
  defaultHeight?: number;
  exportNonDefaultHeight?: boolean;
  tileSnapshotPreProcessor?: TileModelSnapshotPreProcessor;
  contentSnapshotPostProcessor?: TileContentSnapshotPostProcessor;
  getFormulaAdapters?: (node: IAnyStateTreeNode) => Array<Maybe<FormulaManagerAdapter>>;
}

const gTileContentInfoMap: Record<string, ITileContentInfo> = {}

export function registerTileContentInfo(tileContentInfo: ITileContentInfo) {
  // toLowerCase() for legacy support of tool names
  gTileContentInfoMap[tileContentInfo.type.toLowerCase()] = tileContentInfo
}

// ToolContent type, e.g. kDrawingTileType, kGeometryTileType, etc.
// undefined is supported so callers do not need to check the type before passing
// it in.
export function getTileContentInfo(type?: string) {
  // toLowerCase() for legacy support of tool names
  return type ? gTileContentInfoMap[type.toLowerCase()] : undefined
}

export function getTileContentModels() {
  return Object.values(gTileContentInfoMap).map(info => info.modelClass)
}

export function getTileTypes() {
  // the keys are toLowerCased(), so we look up the actual id
  return Object.values(gTileContentInfoMap).map(info => info.type)
}

export function getTilePrefixes() {
  return Object.values(gTileContentInfoMap).map(info => info.prefix)
}

export function getTitle(tile?: ITileLikeModel) {
  const tileContentInfo = getTileContentInfo(tile?.content.type)
  return (tile && tileContentInfo?.getTitle?.(tile)) ?? ""
}

export interface ITileExportOptions {
  json?: boolean; // default true, but some tiles (e.g. geometry) use their export code to produce other formats
  includeId?: boolean;
  excludeTitle?: boolean;
  rowHeight?: number;
  transformImageUrl?: (url: string, filename?: string) => string;
}

export interface IDocumentExportOptions extends ITileExportOptions {
  includeTileIds?: boolean;
  appendComma?: boolean;
  transformImageUrl?: (url: string, filename?: string) => string;
}

export function isRegisteredTileType(type: string) {
  return !!getTileContentInfo(type)
}
