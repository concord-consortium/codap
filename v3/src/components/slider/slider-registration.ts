import { SetRequired } from "type-fest"
import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { ITileLikeModel, registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { getGlobalValueManager } from "../../models/tiles/tile-environment"
import { ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { toV3GlobalId, toV3Id } from "../../utilities/codap-utils"
import { registerV2TileImporter } from "../../v2/codap-v2-tile-importers"
import { isV2SliderComponent } from "../../v2/codap-v2-types"
import { SliderComponent } from "./slider-component"
import { SliderInspector } from "./slider-inspector"
import { kSliderTileType, kSliderTileClass } from "./slider-defs"
import { ISliderSnapshot, SliderModel, isSliderModel } from "./slider-model"
import { SliderTitleBar } from "./slider-title-bar"
import { AnimationDirections, AnimationModes, kDefaultAnimationDirection, kDefaultAnimationMode } from "./slider-types"
import SliderIcon from '../../assets/icons/icon-slider.svg'
import { kDefaultSliderName, kDefaultSliderValue } from "./slider-utils"
import { t } from "../../utilities/translation/translate"
import { isAliveSafe } from "../../utilities/mst-utils"

export const kSliderIdPrefix = "SLID"

registerTileContentInfo({
  type: kSliderTileType,
  prefix: kSliderIdPrefix,
  modelClass: SliderModel,
  defaultContent: options => {
    // create and register the global value along with the slider
    const sharedModelManager = options?.env?.sharedModelManager
    const globalValueManager = getGlobalValueManager(sharedModelManager)
    const name = globalValueManager?.uniqueName() || kDefaultSliderName
    const globalValue = globalValueManager?.addValueSnapshot({ name, value: kDefaultSliderValue })
    const sliderTileSnap: SetRequired<ISliderSnapshot, "type"> = {
      type: kSliderTileType, globalValue: globalValue?.id ?? ""
    }
    return sliderTileSnap
  },
  getTitle: (tile: ITileLikeModel) => {
    const { title, content } = tile || {}
    const sliderModel = isAliveSafe(content) && isSliderModel(content) ? content : undefined
    const { name } = sliderModel || {}
    return title || name || t("DG.DocumentController.sliderTitle")
  }
})

registerTileComponentInfo({
  type: kSliderTileType,
  TitleBar: SliderTitleBar,
  Component: SliderComponent,
  InspectorPanel: SliderInspector,
  tileEltClass: kSliderTileClass,
  Icon: SliderIcon,
  shelf: {
    position: 4,
    labelKey: "DG.ToolButtonData.sliderButton.title",
    hintKey: "DG.ToolButtonData.sliderButton.toolTip"
  },
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
    guid: componentGuid,
    componentStorage: {
      name, title: v2Title = "", _links_, lowerBound, upperBound, animationDirection, animationMode,
      restrictToMultiplesOf, maxPerSecond, userTitle, userSetTitle
    }
  } = v2Component
  const globalId = _links_.model.id
  const v2Global = v2Document.globalValues.find(_global => _global.guid === globalId)
  if (!v2Global) return

  // create global value and add to manager
  const { guid, ...globalSnap } = v2Global
  const globalValue = globalValueManager.addValueSnapshot({ id: toV3GlobalId(guid), ...globalSnap })

  // create slider model
  const content: ISliderSnapshot = {
    type: kSliderTileType,
    globalValue: globalValue.id,
    multipleOf: restrictToMultiplesOf ?? undefined,
    animationDirection: AnimationDirections[animationDirection] || kDefaultAnimationDirection,
    animationMode: AnimationModes[animationMode] || kDefaultAnimationMode,
    _animationRate: maxPerSecond ?? undefined,
    axis: { type: "numeric", place: "bottom", min: lowerBound ?? 0, max: upperBound ?? 12 }
  }
  const title = v2Title && (userTitle || userSetTitle) ? v2Title : undefined
  const sliderTileSnap: ITileModelSnapshotIn = {
    id: toV3Id(kSliderIdPrefix, componentGuid), name, _title: title, content
  }
  const sliderTile = insertTile(sliderTileSnap)

  // link tile to global value manager
  if (sliderTile) {
    sharedModelManager.addTileSharedModel(sliderTile.content, globalValueManager)
  }

  return sliderTile
})
