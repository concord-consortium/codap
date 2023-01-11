import { Instance, types } from "mobx-state-tree"

export const TileMetadataModel = types.model("TileMetadataModel", {
    // id of associated tile
    id: types.string,
  })
export interface ITileMetadataModel extends Instance<typeof TileMetadataModel> {}
