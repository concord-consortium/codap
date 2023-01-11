import { registerTileComponentInfo } from "./tile-component-info"
import { registerTileContentInfo } from "./tile-content-info"
import { PlaceholderTileComponent } from "../../components/tiles/placeholder/placeholder-tile"
import { IUnknownContentModel, UnknownContentModel } from "./unknown-content"
import { kUnknownTileType } from "./unknown-types"

export function defaultContent(): IUnknownContentModel {
  return UnknownContentModel.create()
}

registerTileContentInfo({
  type: kUnknownTileType,
  modelClass: UnknownContentModel,
  defaultContent
})

registerTileComponentInfo({
  type: kUnknownTileType,
  Component: PlaceholderTileComponent,
  tileEltClass: "placeholder-tile",
  tileHandlesOwnSelection: true
})
