import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { kGraphTileClass, kGraphTileType } from "./graph-defs"
import { GraphModel } from "./models/graph-model"
import { GraphComponent } from "./components/graph-component"

registerTileContentInfo({
  type: kGraphTileType,
  modelClass: GraphModel,
  defaultContent: () => GraphModel.create()
})

registerTileComponentInfo({
  type: kGraphTileType,
  Component: GraphComponent,
  tileEltClass: kGraphTileClass
})
