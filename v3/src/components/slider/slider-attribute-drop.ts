import { logMessageWithReplacement } from "../../lib/log-message"
import { IDataSet } from "../../models/data/data-set"
import { isFeatureEnabled } from "../../models/feature-flags/feature-flag-manager"
import { ITileModel } from "../../models/tiles/tile-model"
import { ISliderModel, isSliderModel } from "./slider-model"

// Whether an attribute drag onto the slider should be accepted. Flag-gated by the type the drop yields:
// a selection slider stays one, anything else becomes a visibility slider.
export function isSliderAttributeDropAllowed(slider: ISliderModel, dataSet?: IDataSet, attrId?: string) {
  const flag = slider.sliderType === "selection" ? "selectionSlider" : "visibilitySlider"
  if (!isFeatureEnabled(flag) || !dataSet || !attrId) return false
  const attrType = dataSet.getAttribute(attrId)?.type
  return attrType === "numeric" || attrType === "date"
}

// Configures the slider from the attribute and retitles its tile, as a single undoable change.
// Lives on the tile because the title belongs to the tile, not the slider content.
export function configureSliderFromAttribute(tile: ITileModel, dataSet: IDataSet, attrId: string) {
  const slider = tile.content
  if (!isSliderModel(slider) || !slider.configurationExtent(dataSet, attrId)) return false
  const attrName = dataSet.getAttribute(attrId)?.name
  tile.applyModelChange(() => {
    slider.configureFromAttribute(dataSet, attrId)
    tile.setTitle(dataSet.childCollection.title)
  }, {
    undoStringKey: "V3.Undo.slider.configureFromAttribute",
    redoStringKey: "V3.Redo.slider.configureFromAttribute",
    log: logMessageWithReplacement("sliderConfigureFromAttribute: { attribute: %@ }",
          { attribute: attrName }, "slider")
  })
  return true
}
