import { types } from "mobx-state-tree"
import { FreeTileRow, IFreeTileLayout, IFreeTileRow } from "./free-tile-row"
import { ILegacyTileLayoutModel, ILegacyTileRowModel, LegacyTileRowModel } from "./legacy-tile-row"
import { IMosaicTileNode, IMosaicTileRow, MosaicTileRow } from "./mosaic-tile-row"

export type ITileLayoutUnion = IFreeTileLayout | IMosaicTileNode | ILegacyTileLayoutModel

export const TileRowModelUnion = types.union(LegacyTileRowModel, FreeTileRow, MosaicTileRow)
export type ITileRowModelUnion = ILegacyTileRowModel | IFreeTileRow | IMosaicTileRow
