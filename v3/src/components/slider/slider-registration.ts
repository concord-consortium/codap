import { SetRequired } from "type-fest"
import { V2Slider } from "../../data-interactive/data-interactive-component-types"
import { registerComponentHandler } from "../../data-interactive/handlers/component-handler"
import { errorResult } from "../../data-interactive/handlers/di-results"
import { appState } from "../../models/app-state"
import { GlobalValueManager } from "../../models/global/global-value-manager"
import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { ITileLikeModel, registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { getGlobalValueManager } from "../../models/tiles/tile-environment"
import { ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { toV3GlobalId, toV3Id } from "../../utilities/codap-utils"
import { isAliveSafe } from "../../utilities/mst-utils"
import { t } from "../../utilities/translation/translate"
import { registerV2TileImporter } from "../../v2/codap-v2-tile-importers"
import { isV2SliderComponent } from "../../v2/codap-v2-types"
import { SliderComponent } from "./slider-component"
import { SliderInspector } from "./slider-inspector"
import { kSliderTileType, kSliderTileClass, kV2SliderType } from "./slider-defs"
import { ISliderSnapshot, SliderModel, isSliderModel } from "./slider-model"
import { SliderTitleBar } from "./slider-title-bar"
import { AnimationDirections, AnimationModes, kDefaultAnimationDirection, kDefaultAnimationMode } from "./slider-types"
import SliderIcon from '../../assets/icons/icon-slider.svg'
import { kDefaultSliderName, kDefaultSliderValue } from "./slider-utils"

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

  const getAnimationDirectionStr = (direction: number | undefined) => {
    if (direction == null) return kDefaultAnimationDirection
    return AnimationDirections[direction] || kDefaultAnimationDirection
  }

  const getAnimationModeStr = (mode: number | undefined) => {
    if (mode == null) return kDefaultAnimationMode
    return AnimationModes[mode] || kDefaultAnimationMode
  }

  // create slider model
  const content: ISliderSnapshot = {
    type: kSliderTileType,
    globalValue: globalValue.id,
    multipleOf: restrictToMultiplesOf ?? undefined,
    animationDirection: getAnimationDirectionStr(animationDirection),
    animationMode: getAnimationModeStr(animationMode),
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

registerComponentHandler(kV2SliderType, {
  create({ values }) {
    const {
      animationDirection: _animationDirection, animationMode: _animationMode, globalValueName,
      lowerBound, upperBound
    } = values as V2Slider

    let content: SetRequired<ISliderSnapshot, "type"> | undefined
    if (globalValueName) {
      const { document } = appState
      const globalManager = document.content?.getFirstSharedModelByType(GlobalValueManager)
      const global = globalManager?.getValueByName(globalValueName)
      if (!global) {
        return errorResult(t("V3.DI.Error.globalNotFound", { vars: [globalValueName] }))
      }

      // Multiple sliders for one global value are not allowed
      let existingTile = false
      document.content?.tileMap.forEach(sliderTile => {
        if (isSliderModel(sliderTile.content) && sliderTile.content.globalValue.id === global.id) {
          existingTile = true
        }
      })
      if (existingTile) {
        return errorResult(t("V3.DI.Error.noMultipleSliders", { vars: [globalValueName] }))
      }

      const animationDirection = _animationDirection != null
        ? AnimationDirections[Number(_animationDirection)] : undefined
      const animationMode = _animationMode != null ? AnimationModes[_animationMode] : undefined
      content = {
        type: kSliderTileType,
        animationDirection,
        animationMode,
        axis: { min: lowerBound, max: upperBound, place: "bottom" },
        globalValue: global.id
      } as SetRequired<ISliderSnapshot, "type">
    }

    return { content }
  },
  get(content) {
    if (isSliderModel(content)) {
      const animationDirection = AnimationDirections.findIndex(value => value === content.animationDirection)
      const animationMode = AnimationModes.findIndex(value => value === content.animationMode)
      return {
        type: kV2SliderType,
        animationDirection,
        animationMode,
        globalValueName: content.globalValue.name,
        lowerBound: content.axis.min,
        upperBound: content.axis.max,
        value: content.globalValue.value
      } as V2Slider
    }
  }
})
