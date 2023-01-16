import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { HelloComponent } from "./hello"
import { kHelloCodapTileType, kHelloCodapTileClass } from "./hello-defs"
import { HelloCodapModel } from "./hello-model"

registerTileContentInfo({
  type: kHelloCodapTileType,
  modelClass: HelloCodapModel,
  defaultContent: () => HelloCodapModel.create()
})

registerTileComponentInfo({
  type: kHelloCodapTileType,
  Component: HelloComponent,
  tileEltClass: kHelloCodapTileClass
})
