import { registerTileComponentInfo } from "../tile-component-info"
import { registerTileContentInfo } from "../tile-content-info"
import { kPlaceholderTileType, PlaceholderContentModel } from "./placeholder-content"
import { PlaceholderTileComponent } from "../../../components/tiles/placeholder/placeholder-tile"
import { ComponentTitleBar } from "../../../components/component-title-bar"

function defaultPlaceholderContent() {
  return PlaceholderContentModel.create()
}

registerTileContentInfo({
  type: kPlaceholderTileType,
  prefix: "PLAC",
  modelClass: PlaceholderContentModel,
  defaultContent: defaultPlaceholderContent,
  getTitle: () => "Placeholder"
})

registerTileComponentInfo({
  type: kPlaceholderTileType,
  TitleBar: ComponentTitleBar,
  Component: PlaceholderTileComponent,
  tileEltClass: "placeholder-tile",
  tileHandlesOwnSelection: true,
})
