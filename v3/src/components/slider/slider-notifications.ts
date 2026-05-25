import { ITileModel } from "../../models/tiles/tile-model"
import { updateTileNotification } from "../../models/tiles/tile-notifications"
import { kSliderTileType } from "./slider-defs"

// V2 emits `change slider value` on the component resource from two sites:
//   - apps/dg/components/slider/slider_controller.js (~:225) when the editable value is set
//   - apps/dg/components/slider/slider_view.js (~:330) on `mouseUp` after thumb drag
// V2's payload is bare ({ operation, type:'DG.SliderView' }) — no value, no name. V3 adds
// the new value as an additive `to` field (same discriminator pattern as `expand/collapse
// all` and PR #2592's background-image notifications), so V3-aware plugins don't have to
// make a separate API request just to read the resulting value. V2 plugins ignore the
// extra field. V2 also emits the global `global[<name>]` notification from the model
// observer; V3 already mirrors that via `valueChangeNotification` in slider-utils.ts.
// No-ops for non-slider tiles so it's safe to call from generic notify callbacks.
export function changeSliderValueNotification(sliderTile?: ITileModel, value?: number) {
  if (sliderTile?.content.type !== kSliderTileType) return
  return updateTileNotification("change slider value", value != null ? { to: value } : {}, sliderTile)
}
