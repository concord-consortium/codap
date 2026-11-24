import { SetRequired } from "type-fest"
import SliderIcon from "../../assets/icons/icon-slider.svg"
import { getGlobalValueManager } from "../../models/global/global-value-manager"
import { getTileComponentInfo, registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { kSliderTileType as kOldSliderTileType } from "../slider/slider-defs"
import { ITileLikeModel, registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { isAliveSafe } from "../../utilities/mst-utils"
import { t } from "../../utilities/translation/translate"
import { SliderComponent } from "./slider-component"
import { kSliderTileType, kSliderTileClass } from "./slider-defs"
import { SliderInspector } from "./slider-inspector"
import { ISliderSnapshot, SliderModel, isSliderModel } from "./slider-model"
import { SliderTitleBar } from "./slider-title-bar"
import { kSliderTypeLabels } from "./slider-types"
import { kDefaultSliderName, kDefaultSliderValue } from "./slider-utils"

// PROTOTYPE: registers the "new design" slider as its own tile type, and gives it the toolbar's Slider
// button in place of the original slider (see the end of this file). No v2 import/export or plugin
// handler -- those are keyed to the original slider and would replace it.
export const kSliderIdPrefix = "SLDN"
export const kSliderDefaultWidth = 430

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
    // PROTOTYPE: an empty visibility/selection slider is titled "Visibility Slider" / "Selection Slider"
    // (spec figure 3) unless it has a title of its own; choosing an attribute sets the collection's name
    if (!title && sliderModel?.isRangeSlider && !sliderModel.hasAttribute) {
      return `${kSliderTypeLabels[sliderModel.sliderType]} Slider`
    }
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
  // the original slider's toolbar button, now creating this tile type
  shelf: {
    position: 4,
    labelKey: "DG.ToolButtonData.sliderButton.title",
    hintKey: "DG.ToolButtonData.sliderButton.toolTip",
    undoStringKey: "DG.Undo.sliderComponent.create",
    redoStringKey: "DG.Redo.sliderComponent.create"
  },
  // PROTOTYPE: 430px (Mike) -- wide enough for the widest range readout, "selected value(s) = 12/28/2005 – 12/31/2005"
  // as entry fields, with about 12px to spare (measured: the last field ends 418.2px in)
  defaultWidth: kSliderDefaultWidth,
  isFixedHeight: true,
  // must be in sync with rendered size for auto placement code
  // PROTOTYPE: +46 to match the taller tile in slider.scss
  defaultHeight: 119
})

// PROTOTYPE: take the toolbar button away from the original slider so the toolbar's Slider button
// creates this one. The original type stays registered, so existing "current (old) design" tiles still
// load; it just can't be added from the toolbar. Done here so the original slider's files stay untouched.
const oldSliderInfo = getTileComponentInfo(kOldSliderTileType)
if (oldSliderInfo) delete oldSliderInfo.shelf
