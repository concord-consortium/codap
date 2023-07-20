import { Instance } from "mobx-state-tree"
import { TileContentModel } from "../models/tiles/tile-content"
import { registerTileContentInfo } from "../models/tiles/tile-content-info"
import { registerTileComponentInfo } from "../models/tiles/tile-component-info"

export const TestTileContent = TileContentModel
  .named("TestTileContent")
  .props({
    test: ""
  })
export interface ITestTileContent extends Instance<typeof TestTileContent> {}

registerTileContentInfo({
  type: "Test",
  prefix: "TEST",
  modelClass: TestTileContent,
  defaultContent: () => TestTileContent.create()
})

registerTileComponentInfo({
  type: "Test",
  TitleBar: () => null,
  Component: () => null,
  tileEltClass: "test-tile",
  defaultWidth: 400,
  defaultHeight: 300
})
