import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { SliderComponent } from "./slider-component"
import { kSliderTileType, kSliderTileClass } from "./slider-defs"
import { SliderModel } from "./slider-model"
import { SliderTitleBar } from "./slider-title-bar"
import SliderIcon from '../../assets/icons/icon-slider.svg'

registerTileContentInfo({
  type: kSliderTileType,
  modelClass: SliderModel,
  // TODO: deal with auto-incrementing global value names for uniqueness
  defaultContent: () => SliderModel.create({ globalValue: { name: "v1", value: 0.5 }})
})

registerTileComponentInfo({
  type: kSliderTileType,
  TitleBar: SliderTitleBar,
  Component: SliderComponent,
  tileEltClass: kSliderTileClass,
  Icon: SliderIcon,
  height: 98,
  width: 300,
  isUserResizable: true,
})
