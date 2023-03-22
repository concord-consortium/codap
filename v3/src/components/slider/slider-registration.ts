import { IGlobalValueManager, kGlobalValueManagerType } from "../../models/global/global-value-manager"
import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { SliderComponent } from "./slider-component"
import { kSliderTileType, kSliderTileClass } from "./slider-defs"
import { SliderModel } from "./slider-model"
import { SliderTitleBar } from "./slider-title-bar"
import SliderIcon from '../../assets/icons/icon-slider.svg'
import { registerV2TileImporter } from "../../v2/codap-v2-tile-importers"
import { isV2SliderComponent } from "../../v2/codap-v2-types"

registerTileContentInfo({
  type: kSliderTileType,
  prefix: "SLID",
  modelClass: SliderModel,
  defaultContent: options => {
    const sharedModelManager = options?.env?.sharedModelManager
    const sharedModels = sharedModelManager?.getSharedModelsByType(kGlobalValueManagerType)
    const globals = sharedModels?.[0] as IGlobalValueManager | undefined
    const name = globals?.uniqueName() || "v1"
    return SliderModel.create({ globalValue: { name, value: 0.5 }})
  }
})

registerTileComponentInfo({
  type: kSliderTileType,
  TitleBar: SliderTitleBar,
  Component: SliderComponent,
  tileEltClass: kSliderTileClass,
  Icon: SliderIcon,
  defaultWidth: 300,
  isFixedHeight: true
})

registerV2TileImporter("DG.SliderView", ({ v2Component, v2Document, sharedModelManager, insertTile }) => {
  if (!isV2SliderComponent(v2Component)) return

  // const { title = "", _links_ } = v2Component.componentStorage
  // const globalId = _links_.model.id
  // const v2Global = v2Document.globalValues.find(_global => _global.guid === globalId)
  // const { guid, ...globalSnap } = v2Global || {}
  // const v3Global = GlobalValue.create(v2Global ? { ...globalSnap } : {})

  return SliderModel.create()
})
