import { registerTileComponentInfo } from "./tile-component-info"
import { registerTileContentInfo } from "./tile-content-info"
import { PlaceholderTileComponent } from "../../components/tiles/placeholder/placeholder-tile"
import { IUnknownContentModel, UnknownContentModel } from "./unknown-content"
import { kUnknownTileType } from "./unknown-types"
import { ComponentTitleBar } from "../../components/component-title-bar"

export function defaultContent(): IUnknownContentModel {
  return UnknownContentModel.create()
}

registerTileContentInfo({
  type: kUnknownTileType,
  prefix: "UNKN",
  modelClass: UnknownContentModel,
  defaultContent,
  getTitle: () => "Unknown"
})

registerTileComponentInfo({
  type: kUnknownTileType,
  TitleBar: ComponentTitleBar,
  Component: PlaceholderTileComponent,
  tileEltClass: "placeholder-tile",
  tileHandlesOwnSelection: true,
})
