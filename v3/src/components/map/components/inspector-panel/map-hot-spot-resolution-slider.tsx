import { observer } from "mobx-react-lite"
import { useLayoutEffect, useRef } from "react"
import { Label, Slider, SliderThumb, SliderTrack } from "react-aria-components"
import { logStringifiedObjectMessage } from "../../../../lib/log-message"
import { gLocale } from "../../../../utilities/translation/locale"
import { t } from "../../../../utilities/translation/translate"
import { IMapPointLayerModel } from "../../models/map-point-layer-model"
import { bandwidthToResolution, resolutionLimit, resolutionToBandwidth } from "../../utilities/hot-spot-utils"

const kResolutionStep = 0.01

/** Formats a bandwidth for screen readers, e.g. "850 m" or "2.3 km" */
export function formatBandwidth(bandwidthMeters: number) {
  const [value, unit] = bandwidthMeters < 1000 ? [bandwidthMeters, "meter"] : [bandwidthMeters / 1000, "kilometer"]
  return gLocale.formatNumber(value, { style: "unit", unit, maximumSignificantDigits: 2 })
}

interface IProps {
  mapPointLayerModel: IMapPointLayerModel
}

/**
 * Controls the hot spot bandwidth on an inverted log scale with the default bandwidth in the center: moving the
 * slider right increases the resolution by decreasing the bandwidth.
 */
export const MapHotSpotResolutionSlider = observer(function MapHotSpotResolutionSlider(
  { mapPointLayerModel }: IProps
) {
  const { hotSpotModel } = mapPointLayerModel
  const inputRef = useRef<HTMLInputElement>(null)

  const { defaultBandwidth, displayBandwidth } = hotSpotModel
  const resolution = bandwidthToResolution(displayBandwidth, defaultBandwidth)
  // Base the range on the committed bandwidth so that it doesn't change during a drag
  const limit = resolutionLimit(bandwidthToResolution(hotSpotModel.effectiveBandwidth, defaultBandwidth),
    kResolutionStep)
  const bandwidthText = formatBandwidth(displayBandwidth)

  // React Aria derives the thumb's aria-valuetext from the slider's position, which is meaningless to users, and
  // provides no way to override it, so replace it with the bandwidth after every render.
  useLayoutEffect(() => {
    inputRef.current?.setAttribute("aria-valuetext", bandwidthText)
  })

  const handleChangeEnd = (newResolution: number) => {
    const bandwidth = resolutionToBandwidth(newResolution, defaultBandwidth)
    if (bandwidth === hotSpotModel.effectiveBandwidth) {
      // Nothing to commit, so just end the in-progress change.
      hotSpotModel.setDynamicBandwidth(undefined)
      return
    }

    hotSpotModel.applyModelChange(() => {
      hotSpotModel.setBandwidth(bandwidth)
    }, {
      undoStringKey: "V3.Undo.map.changeHotSpotResolution",
      redoStringKey: "V3.Redo.map.changeHotSpotResolution",
      log: logStringifiedObjectMessage("mapAction: %@", {
        mapAction: "changeHotSpotResolution", bandwidth, dataset: mapPointLayerModel.dataConfiguration.dataset?.name
      })
    })
  }

  return (
    <Slider
      minValue={-limit}
      maxValue={limit}
      step={kResolutionStep}
      value={resolution}
      onChange={(val: number) => hotSpotModel.setDynamicBandwidth(resolutionToBandwidth(val, defaultBandwidth))}
      onChangeEnd={handleChangeEnd}
      isDisabled={!hotSpotModel.isVisible}
      data-testid="map-hot-spot-resolution-slider"
    >
      <div className="palette-row slider-row">
        <Label className="form-label">{t("V3.Inspector.map.hotSpotResolution")}</Label>
        <SliderTrack>
          <SliderThumb inputRef={inputRef}/>
        </SliderTrack>
      </div>
    </Slider>
  )
})
