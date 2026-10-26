import { logMessageWithReplacement } from "../../lib/log-message"
import { IDataSet } from "../../models/data/data-set"
import { ITileModel } from "../../models/tiles/tile-model"
import { ISliderModel, isSliderModel } from "./slider-model"
import { isSliderTypeAvailable } from "./slider-utils"

// Whether the attribute can configure the slider: only a numeric/date attribute with values can. Flag-gated by the
// type that configuring yields: a selection slider stays one, anything else becomes a visibility slider. Scans the
// attribute's values, so callers rendering during a drag memoize it.
export function isSliderAttributeUsable(slider: ISliderModel, dataSet?: IDataSet, attrId?: string) {
  const configuredType = slider.sliderType === "selection" ? "selection" : "visibility"
  if (!isSliderTypeAvailable(configuredType) || !dataSet || !attrId) return false
  return !!slider.configurationExtent(dataSet, attrId)
}

// whether the slider is already bound to the attribute, which configuring it from again leaves alone
function isBoundTo(slider: ISliderModel, dataSet: IDataSet, attrId: string) {
  return slider.dataSetId === dataSet.id && slider.attributeId === attrId
}

// Whether an attribute drag onto the slider should be accepted: one that can configure it, other than the attribute
// it's already bound to, which wouldn't change it.
export function isSliderAttributeDropAllowed(slider: ISliderModel, dataSet?: IDataSet, attrId?: string) {
  if (!dataSet || !attrId || isBoundTo(slider, dataSet, attrId)) return false
  return isSliderAttributeUsable(slider, dataSet, attrId)
}

// Configures the slider from the attribute as a single undoable change. Configuring it from the attribute it's
// already bound to does nothing, rather than resetting its axis and range.
export function configureSliderFromAttribute(tile: ITileModel, dataSet: IDataSet, attrId: string) {
  const slider = tile.content
  if (!isSliderModel(slider) || isBoundTo(slider, dataSet, attrId) || !slider.configurationExtent(dataSet, attrId)) {
    return false
  }
  const attrName = dataSet.getAttribute(attrId)?.name
  tile.applyModelChange(() => {
    slider.configureFromAttribute(dataSet, attrId)
  }, {
    undoStringKey: "V3.Undo.slider.configureFromAttribute",
    redoStringKey: "V3.Redo.slider.configureFromAttribute",
    log: logMessageWithReplacement("sliderConfigureFromAttribute: { attribute: %@ }",
          { attribute: attrName }, "slider")
  })
  return true
}
