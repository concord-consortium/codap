import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { kGraphTileClass, kGraphTileType } from "./graph-defs"
import { GraphModel } from "./models/graph-model"
import { GraphComponent } from "./components/graph-component"
import { EmptyAxisModel } from "../axis/models/axis-model"
import { GraphTitleBar } from "./components/graph-title-bar"
import GraphIcon from '../../assets/icons/icon-graph.svg'

registerTileContentInfo({
  type: kGraphTileType,
  modelClass: GraphModel,
  defaultContent: () => GraphModel.create({
    axes: {
      bottom: EmptyAxisModel.create({place: "bottom"}),
      left: EmptyAxisModel.create({place: "left"})
    }
  })
})

registerTileComponentInfo({
  type: kGraphTileType,
  TitleBar: GraphTitleBar,
  Component: GraphComponent,
  tileEltClass: kGraphTileClass,
  Icon: GraphIcon,
  height: 300,
  width: 300,
  isUserResizable: true, 
})
