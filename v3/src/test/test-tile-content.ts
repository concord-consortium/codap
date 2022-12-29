import { Instance } from "mobx-state-tree"
import { TileContentModel } from "../models/tiles/tile-content"
import { registerTileContentInfo } from "../models/tiles/tile-content-info"

export const TestTileContent = TileContentModel
  .named("TestTileContent")
  .props({
    test: ""
  })
export interface ITestTileContent extends Instance<typeof TestTileContent> {}

registerTileContentInfo({
  type: "Test",
  modelClass: TestTileContent,
  defaultContent: () => TestTileContent.create()
})
