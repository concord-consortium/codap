import { types } from "mobx-state-tree"
import { FreeTileRow, IFreeTileRow } from "./free-tile-row"
import { ILegacyTileRowModel, LegacyTileRowModel } from "./legacy-tile-row"
import { IMosaicTileRow, MosaicTileRow } from "./mosaic-tile-row"

export const TileRowModelUnion = types.union(LegacyTileRowModel, FreeTileRow, MosaicTileRow)
export type ITileRowModelUnion = ILegacyTileRowModel | IFreeTileRow | IMosaicTileRow
