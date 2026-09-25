import { logMessageWithReplacement } from "../../lib/log-message"
import { IApplyModelChangeOptions } from "../../models/history/history-service"
import { ITileModel } from "../../models/tiles/tile-model"
import { ISliderModel } from "./slider-model"
import { changeSliderValueNotification } from "./slider-notifications"
import { valueChangeNotification } from "./slider-utils"

// Options for committing a range change, from either an edge drag or a middle drag. The notifications and the
// log read the model when they run, after the change, so they report the committed (clamped, snapped) range.
export function rangeChangeOptions(slider: ISliderModel, tile?: ITileModel): IApplyModelChangeOptions {
  return {
    // V2 emits `change slider value` on the component when a thumb drag ends; see changeSliderValueNotification
    notify: [
      () => valueChangeNotification(slider.value, slider.name),
      () => changeSliderValueNotification(tile, slider.rangeLow)
    ],
    undoStringKey: "V3.Undo.slider.changeRange",
    redoStringKey: "V3.Redo.slider.changeRange",
    log: () => logMessageWithReplacement("sliderRangeChange: { name: %@ = [%@, %@] }",
                { name: slider.name, low: slider.rangeLow, high: slider.rangeHigh }, "slider")
  }
}
