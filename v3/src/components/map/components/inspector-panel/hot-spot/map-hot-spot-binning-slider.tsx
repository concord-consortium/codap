import { observer } from "mobx-react-lite"
import { Label, Slider, SliderTrack } from "react-aria-components"
import { logStringifiedObjectMessage } from "../../../../../lib/log-message"
import { t } from "../../../../../utilities/translation/translate"
import { ValueTextSliderThumb } from "../../../../common/value-text-slider-thumb"
import { IMapPointLayerModel } from "../../../models/map-point-layer-model"
import {
  colorBinsToSliderValue, getEffectiveColorBins, HotSpotColorBins, kContinuousColorBins, kContinuousSliderValue,
  kMinColorBins, sliderValueToColorBins
} from "../../../utilities/hot-spot-utils"

/** Formats display text for color bins. */
export function formatColorBins(colorBins: HotSpotColorBins) {
  const effectiveColorBins = getEffectiveColorBins(colorBins)
  return effectiveColorBins === kContinuousColorBins
    ? t("V3.Inspector.map.hotSpotColorBinning.continuous")
    : t("V3.Inspector.map.hotSpotColorBinning.classes", { vars: [effectiveColorBins] })
}

interface IProps {
  mapPointLayerModel: IMapPointLayerModel
}

/**
 * Controls how many color classes the hot spot is drawn in: kMinColorBins through kMaxColorBins, or continuous at
 * the far right. The map updates as the slider moves, and the change is committed when it ends.
 */
export const MapHotSpotBinningSlider = observer(function MapHotSpotBinningSlider({ mapPointLayerModel }: IProps) {
  const { hotSpotModel } = mapPointLayerModel
  const { displayColorBins } = hotSpotModel
  const colorBinsText = formatColorBins(displayColorBins)

  const commitColorBins = (colorBins: HotSpotColorBins) => {
    // Do not commit when nothing has changed. Compare with the effective value so that an out-of-range
    // saved count isn't replaced by the limit it is already treated as.
    if (colorBins === hotSpotModel.effectiveColorBins) {
      hotSpotModel.setDynamicColorBins(undefined)
      return
    }

    hotSpotModel.applyModelChange(() => {
      hotSpotModel.setColorBins(colorBins)
    }, {
      undoStringKey: "V3.Undo.map.changeHotSpotColorBinning",
      redoStringKey: "V3.Redo.map.changeHotSpotColorBinning",
      log: logStringifiedObjectMessage("mapAction: %@", {
        mapAction: "changeHotSpotColorBinning", colorBins, dataset: mapPointLayerModel.dataConfiguration.dataset?.name
      })
    })
  }

  // Commit any in-progress change if focus leaves before the change ends
  const handleBlur = () => {
    const { dynamicColorBins } = hotSpotModel
    if (dynamicColorBins != null) commitColorBins(getEffectiveColorBins(dynamicColorBins))
  }

  return (
    <Slider
      minValue={kMinColorBins}
      maxValue={kContinuousSliderValue}
      step={1}
      value={colorBinsToSliderValue(displayColorBins)}
      onChange={(val: number) => hotSpotModel.setDynamicColorBins(sliderValueToColorBins(val))}
      onChangeEnd={(val: number) => commitColorBins(sliderValueToColorBins(val))}
      isDisabled={!hotSpotModel.isVisible}
      data-testid="map-hot-spot-color-binning-slider"
    >
      <div className="palette-row slider-row">
        <Label className="form-label">{t("V3.Inspector.map.hotSpotColorBinning")}</Label>
        <SliderTrack>
          <ValueTextSliderThumb valueText={colorBinsText} onBlur={handleBlur}/>
        </SliderTrack>
      </div>
      {/* The thumb's aria-valuetext announces this text, so hide it from screen readers */}
      <div className="slider-readout" aria-hidden="true">{colorBinsText}</div>
    </Slider>
  )
})
