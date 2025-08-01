import { SetOptional, SetRequired } from "type-fest"
import SliderIcon from "../../assets/icons/icon-slider.svg"
import { registerComponentHandler } from "../../data-interactive/handlers/component-handler"
import { getGlobalValueManager } from "../../models/global/global-value-manager"
import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { ITileLikeModel, registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { toV2Id, toV3GlobalId, toV3Id } from "../../utilities/codap-utils"
import { DateUnit, unitsStringToMilliseconds } from "../../utilities/date-utils"
import { isFiniteNumber } from "../../utilities/math-utils"
import { isAliveSafe } from "../../utilities/mst-utils"
import { t } from "../../utilities/translation/translate"
import { registerV2TileExporter } from "../../v2/codap-v2-tile-exporters"
import { registerV2TileImporter } from "../../v2/codap-v2-tile-importers"
import {
  guidLink, ICodapV2BaseComponentStorage, ICodapV2SliderStorage, isV2SliderComponent
} from "../../v2/codap-v2-types"
import { SliderComponent } from "./slider-component"
import { SliderInspector } from "./slider-inspector"
import { kSliderTileType, kSliderTileClass, kV2SliderType } from "./slider-defs"
import { ISliderSnapshot, SliderModel, isSliderModel } from "./slider-model"
import { SliderTitleBar } from "./slider-title-bar"
import {
  AnimationDirection, AnimationDirections, AnimationMode, AnimationModes,
  kDefaultAnimationDirection, kDefaultAnimationMode, kDefaultSliderAxisMax, kDefaultSliderAxisMin
} from "./slider-types"
import { kDefaultSliderName, kDefaultSliderValue } from "./slider-utils"
import { sliderComponentHandler } from "./slider-component-handler"

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
    hintKey: "DG.ToolButtonData.sliderButton.toolTip",
    undoStringKey: "DG.Undo.sliderComponent.create",
    redoStringKey: "DG.Redo.sliderComponent.create"
  },
  defaultWidth: 300,
  isFixedHeight: true,
  // must be in sync with rendered size for auto placement code
  defaultHeight: 73
})

registerV2TileExporter(kSliderTileType, ({ tile }) => {
  const sliderModel = isSliderModel(tile.content) ? tile.content : undefined
  if (!sliderModel) return
  const {
    name,
    globalValue,
    domain: [lowerBound, upperBound],
    animationDirection,
    animationMode,
    _animationRate,
    multipleOf,
    dateMultipleOfUnit,
    scaleType
  } = sliderModel

  const domain = isFiniteNumber(lowerBound) && isFiniteNumber(upperBound) ? { lowerBound, upperBound } : undefined

  const getAnimationDirectionIndex = (direction?: AnimationDirection) => {
    return direction != null ? AnimationDirections.findIndex(_direction => _direction === direction) : 1
  }
  const getAnimationModeIndex = (mode?: AnimationMode) => {
    return mode != null ? AnimationModes.findIndex(_mode => _mode === mode) : 1
  }
  // v2 doesn't support date-time sliders; convert to seconds instead
  const restrictToMultiplesOf = scaleType === "date" && multipleOf != null
                                  ? multipleOf * unitsStringToMilliseconds(dateMultipleOfUnit) / 1000
                                  : multipleOf
  // v3 extensions: ignored by v2, but allows full round-trip for v3 save/restore
  const v3: ICodapV2SliderStorage["v3"] = { scaleType, multipleOf, dateMultipleOfUnit }

  const componentStorage: SetOptional<ICodapV2SliderStorage, keyof ICodapV2BaseComponentStorage> = {
    _links_: { model: guidLink("DG.GlobalValue", toV2Id(globalValue.id)) },
    name, // override tile `name` with slider model `name` (i.e. global value `name`)
    ...domain,
    animationDirection: getAnimationDirectionIndex(animationDirection),
    animationMode: getAnimationModeIndex(animationMode),
    maxPerSecond: _animationRate ?? null,
    restrictToMultiplesOf: restrictToMultiplesOf ?? null,
    v3
  }
  return { type: "DG.SliderView", componentStorage }
})

registerV2TileImporter("DG.SliderView", ({ v2Component, v2Document, getGlobalValues, insertTile, linkSharedModel }) => {
  if (!isV2SliderComponent(v2Component)) return

  const globalValueManager = getGlobalValues()
  if (!globalValueManager) return

  // parse the v2 content
  const {
    guid: componentGuid,
    componentStorage: {
      name, title, _links_, lowerBound, upperBound, animationDirection, animationMode,
      restrictToMultiplesOf, maxPerSecond, userSetTitle, cannotClose, v3
    }
  } = v2Component
  const globalId = _links_.model.id
  const v2Global = v2Document.globalValues.find(_global => _global.guid === globalId)
  if (!v2Global) return

  // create global value and add to manager
  const { guid, ...globalSnap } = v2Global
  const globalValue = globalValueManager.addValueSnapshot({ id: toV3GlobalId(guid), ...globalSnap })

  const getAnimationDirectionStr = (direction: number | undefined) => {
    if (direction == null) return kDefaultAnimationDirection
    return AnimationDirections[direction] || kDefaultAnimationDirection
  }

  const getAnimationModeStr = (mode: number | undefined) => {
    if (mode == null) return kDefaultAnimationMode
    return AnimationModes[mode] || kDefaultAnimationMode
  }

  const axisType = v3?.scaleType ?? "numeric"
  const axisMin = lowerBound ?? kDefaultSliderAxisMin
  const axisMax = upperBound ?? kDefaultSliderAxisMax

  // create slider model
  const content: ISliderSnapshot = {
    type: kSliderTileType,
    globalValue: globalValue.id,
    multipleOf: v3?.multipleOf ?? restrictToMultiplesOf ?? undefined,
    dateMultipleOfUnit: v3?.dateMultipleOfUnit as DateUnit ?? undefined,
    animationDirection: getAnimationDirectionStr(animationDirection),
    animationMode: getAnimationModeStr(animationMode),
    _animationRate: maxPerSecond ?? undefined,
    axis: { type: axisType, place: "bottom", min: axisMin, max: axisMax }
  }
  const sliderTileSnap: ITileModelSnapshotIn = {
    id: toV3Id(kSliderIdPrefix, componentGuid), name, _title: title, userSetTitle, content, cannotClose
  }
  const sliderTile = insertTile(sliderTileSnap)

  // link tile to global value manager
  if (sliderTile) {
    linkSharedModel(sliderTile.content, globalValueManager)
  }

  return sliderTile
})

registerComponentHandler(kV2SliderType, sliderComponentHandler)
