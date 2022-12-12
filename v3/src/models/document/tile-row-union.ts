import { types } from "mobx-state-tree"
import { FreeTileRow } from "./free-tile-row"
import { LegacyTileRowModel } from "./legacy-tile-row"
import { MosaicTileRow } from "./mosaic-tile-row"

export const TileRowModelUnion = types.union(LegacyTileRowModel, FreeTileRow, MosaicTileRow)
