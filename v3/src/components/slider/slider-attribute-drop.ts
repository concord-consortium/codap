import { logMessageWithReplacement } from "../../lib/log-message"
import { IDataSet } from "../../models/data/data-set"
import { isFeatureEnabled } from "../../models/feature-flags/feature-flag-manager"
import { ITileModel } from "../../models/tiles/tile-model"
import { ISliderModel, isSliderModel } from "./slider-model"

// Whether an attribute drag onto the slider should be accepted: only a numeric/date attribute with values
// can configure it. Flag-gated by the type the drop yields: a selection slider stays one, anything else
// becomes a visibility slider. Scans the attribute's values, so callers rendering during a drag memoize it.
export function isSliderAttributeDropAllowed(slider: ISliderModel, dataSet?: IDataSet, attrId?: string) {
  const flag = slider.sliderType === "selection" ? "selectionSlider" : "visibilitySlider"
  if (!isFeatureEnabled(flag) || !dataSet || !attrId) return false
  return !!slider.configurationExtent(dataSet, attrId)
}

// Configures the slider from the attribute as a single undoable change. The tile's title follows the binding
// (see the slider's getTitle), so it isn't set here.
export function configureSliderFromAttribute(tile: ITileModel, dataSet: IDataSet, attrId: string) {
  const slider = tile.content
  if (!isSliderModel(slider) || !slider.configurationExtent(dataSet, attrId)) return false
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
