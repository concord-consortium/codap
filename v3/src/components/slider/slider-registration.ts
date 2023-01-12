import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { SliderComponent } from "./slider-component"
import { kSliderTileType, kSliderTileClass } from "./slider-defs"
import { SliderModel } from "./slider-model"

registerTileContentInfo({
  type: kSliderTileType,
  modelClass: SliderModel,
  defaultContent: () => SliderModel.create()
})

registerTileComponentInfo({
  type: kSliderTileType,
  Component: SliderComponent,
  tileEltClass: kSliderTileClass
})
