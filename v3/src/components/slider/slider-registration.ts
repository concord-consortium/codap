import { NumericAxisModel } from "../axis/models/axis-model"
import { GlobalValue } from "../../models/global/global-value"
import { IGlobalValueManager, kGlobalValueManagerType } from "../../models/global/global-value-manager"
import { ISharedModelManager } from "../../models/shared/shared-model-manager"
import { TileModel } from "../../models/tiles/tile-model"
import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { typedId } from "../../utilities/js-utils"
import { registerV2TileImporter } from "../../v2/codap-v2-tile-importers"
import { isV2SliderComponent } from "../../v2/codap-v2-types"
import { SliderComponent } from "./slider-component"
import { SliderInspector } from "./slider-inspector"
import { kSliderTileType, kSliderTileClass } from "./slider-defs"
import { SliderModel } from "./slider-model"
import { SliderTitleBar } from "./slider-title-bar"
import { AnimationDirections, AnimationModes, kDefaultAnimationDirection, kDefaultAnimationMode } from "./slider-types"
import SliderIcon from '../../assets/icons/icon-slider.svg'
import { ToolshelfButton } from "../tool-shelf/tool-shelf"

export const kSliderIdPrefix = "SLID"

function getGlobalValueManager(sharedModelManager?: ISharedModelManager) {
  const sharedModels = sharedModelManager?.getSharedModelsByType(kGlobalValueManagerType)
  return sharedModels?.[0] as IGlobalValueManager | undefined
}

registerTileContentInfo({
  type: kSliderTileType,
  prefix: kSliderIdPrefix,
  modelClass: SliderModel,
  defaultContent: options => {
    // create and register the global value along with the slider
    const sharedModelManager = options?.env?.sharedModelManager
    const globalValueManager = getGlobalValueManager(sharedModelManager)
    const name = globalValueManager?.uniqueName() || "v1"
    const globalValue = GlobalValue.create({ name, value: 0.5 })
    globalValueManager?.addValue(globalValue)
    return SliderModel.create({ globalValue: globalValue.id })
  }
})

registerTileComponentInfo({
  type: kSliderTileType,
  TitleBar: SliderTitleBar,
  Component: SliderComponent,
  InspectorPanel: SliderInspector,
  tileEltClass: kSliderTileClass,
  Icon: SliderIcon,
  ComponentToolshelfButton: ToolshelfButton,
  position: 4,
  toolshelfButtonOptions: {iconLabel: "DG.ToolButtonData.sliderButton.title",
                            buttonHint: "DG.ToolButtonData.sliderButton.toolTip"},
  defaultWidth: 300,
  isFixedHeight: true,
  // must be in sync with rendered size for auto placement code
  defaultHeight: 73

})

registerV2TileImporter("DG.SliderView", ({ v2Component, v2Document, sharedModelManager, insertTile }) => {
  if (!isV2SliderComponent(v2Component)) return

  const globalValueManager = getGlobalValueManager(sharedModelManager)
  if (!sharedModelManager || !globalValueManager) return

  // parse the v2 content
  const {
    title = "", _links_, lowerBound, upperBound, animationDirection, animationMode,
    restrictToMultiplesOf, maxPerSecond, userTitle, userSetTitle
  } = v2Component.componentStorage
  const globalId = _links_.model.id
  const v2Global = v2Document.globalValues.find(_global => _global.guid === globalId)
  if (!v2Global) return

  // create global value and add to manager
  const { guid, ...globalSnap } = v2Global
  const globalValue = GlobalValue.create({ ...globalSnap })
  globalValueManager.addValue(globalValue)
  // create slider model
  const slider = SliderModel.create({
    globalValue: globalValue.id,
    multipleOf: restrictToMultiplesOf ?? undefined,
    animationDirection: AnimationDirections[animationDirection] || kDefaultAnimationDirection,
    animationMode: AnimationModes[animationMode] || kDefaultAnimationMode,
    _animationRate: maxPerSecond ?? undefined,
    axis: NumericAxisModel.create({ place: "bottom", min: lowerBound ?? 0, max: upperBound ?? 12 })
  })
  // create and insert tile
  const sliderTile = TileModel.create({
    id: typedId(kSliderIdPrefix),
    title: title && (userTitle || userSetTitle) ? title : undefined,
    content: slider
  })
  insertTile(sliderTile)

  // link tile to global value manager
  sharedModelManager.addTileSharedModel(sliderTile.content, globalValueManager)
  return sliderTile
})
