import { observer } from "mobx-react-lite"
import { useLayoutEffect, useRef } from "react"
import { Label, Slider, SliderThumb, SliderTrack } from "react-aria-components"
import { logStringifiedObjectMessage } from "../../../../lib/log-message"
import { isFeatureEnabled } from "../../../../models/feature-flags/feature-flag-manager"
import { gLocale } from "../../../../utilities/translation/locale"
import { t } from "../../../../utilities/translation/translate"
import { PaletteCheckbox } from "../../../palette-checkbox"
import { IMapPointLayerModel } from "../../models/map-point-layer-model"
import { bandwidthToResolution, resolutionLimit, resolutionToBandwidth } from "../../utilities/hot-spot-utils"

// Announce the opacity to screen readers as a percentage (e.g. "75%") rather than a raw fraction
const kOpacityFormatOptions: Intl.NumberFormatOptions = { style: "percent" }

const kResolutionStep = 0.01

/** Formats a bandwidth for screen readers, e.g. "850 m" or "2.3 km" */
export function formatBandwidth(bandwidthMeters: number) {
  const [value, unit] = bandwidthMeters < 1000 ? [bandwidthMeters, "meter"] : [bandwidthMeters / 1000, "kilometer"]
  return gLocale.formatNumber(value, { style: "unit", unit, maximumSignificantDigits: 2 })
}

interface IProps {
  mapPointLayerModel?: IMapPointLayerModel
}

export const MapHotSpotControl = observer(function MapHotSpotControl({ mapPointLayerModel }: IProps) {
  if (!mapPointLayerModel || !isFeatureEnabled("mapHotSpot")) return null
  return <MapHotSpotControls mapPointLayerModel={mapPointLayerModel}/>
})

// Separate from MapHotSpotControl so that hooks aren't called conditionally
const MapHotSpotControls = observer(function MapHotSpotControls(
  { mapPointLayerModel }: { mapPointLayerModel: IMapPointLayerModel }
) {
  const { hotSpotModel } = mapPointLayerModel
  const datasetName = mapPointLayerModel.dataConfiguration.dataset?.name
  const resolutionInputRef = useRef<HTMLInputElement>(null)

  // The resolution slider is a log scale of bandwidth with the default bandwidth in the center
  const { defaultBandwidth, displayBandwidth } = hotSpotModel
  const resolution = bandwidthToResolution(displayBandwidth, defaultBandwidth)
  // Base the range on the committed bandwidth so that it doesn't change during a drag
  const limit = resolutionLimit(bandwidthToResolution(hotSpotModel.effectiveBandwidth, defaultBandwidth),
    kResolutionStep)
  const bandwidthText = formatBandwidth(displayBandwidth)

  // React Aria derives the thumb's aria-valuetext from the slider's position, which is meaningless to users, and
  // provides no way to override it, so replace it with the bandwidth after every render.
  useLayoutEffect(() => {
    resolutionInputRef.current?.setAttribute("aria-valuetext", bandwidthText)
  })

  const handleResolutionChangeEnd = (newResolution: number) => {
    const bandwidth = resolutionToBandwidth(newResolution, defaultBandwidth)
    hotSpotModel.applyModelChange(() => {
      hotSpotModel.setBandwidth(bandwidth)
    }, {
      undoStringKey: "V3.Undo.map.changeHotSpotResolution",
      redoStringKey: "V3.Redo.map.changeHotSpotResolution",
      log: logStringifiedObjectMessage("mapAction: %@",
        { mapAction: "changeHotSpotResolution", bandwidth, dataset: datasetName })
    })
  }

  const handleIsVisibleChange = (checked: boolean) => {
    const op = checked ? "show" : "hide"
    hotSpotModel.applyModelChange(() => {
      hotSpotModel.setIsVisible(checked)
    }, {
      undoStringKey: `V3.Undo.map.${op}HotSpot`,
      redoStringKey: `V3.Redo.map.${op}HotSpot`,
      log: logStringifiedObjectMessage("mapAction: %@", { mapAction: `${op}HotSpot`, dataset: datasetName })
    })
  }

  const handleOpacityChangeEnd = (opacity: number) => {
    hotSpotModel.applyModelChange(() => {
      hotSpotModel.setOpacity(opacity)
    }, {
      undoStringKey: "V3.Undo.map.changeHotSpotOpacity",
      redoStringKey: "V3.Redo.map.changeHotSpotOpacity",
      log: logStringifiedObjectMessage("mapAction: %@",
        { mapAction: "changeHotSpotOpacity", opacity, dataset: datasetName })
    })
  }

  return (
    <div className="map-hot-spot-controls palette-form">
      <PaletteCheckbox
        data-testid="map-layers-checkbox-hot-spot"
        isSelected={hotSpotModel.isVisible}
        onChange={handleIsVisibleChange}
      >
        {t("V3.Inspector.map.hotSpot")}
      </PaletteCheckbox>
      <Slider
        minValue={-limit}
        maxValue={limit}
        step={kResolutionStep}
        value={resolution}
        onChange={(val: number) => hotSpotModel.setDynamicBandwidth(resolutionToBandwidth(val, defaultBandwidth))}
        onChangeEnd={handleResolutionChangeEnd}
        isDisabled={!hotSpotModel.isVisible}
        data-testid="map-hot-spot-resolution-slider"
      >
        <div className="palette-row slider-row">
          <Label className="form-label">{t("V3.Inspector.map.hotSpotResolution")}</Label>
          <SliderTrack>
            <SliderThumb inputRef={resolutionInputRef}/>
          </SliderTrack>
        </div>
      </Slider>
      <Slider
        minValue={0}
        maxValue={1}
        step={0.01}
        formatOptions={kOpacityFormatOptions}
        value={hotSpotModel.displayOpacity}
        onChange={(val: number) => hotSpotModel.setDynamicOpacity(val)}
        onChangeEnd={handleOpacityChangeEnd}
        isDisabled={!hotSpotModel.isVisible}
        data-testid="map-hot-spot-opacity-slider"
      >
        <div className="palette-row slider-row">
          <Label className="form-label">{t("V3.Inspector.map.hotSpotOpacity")}</Label>
          <SliderTrack>
            <SliderThumb />
          </SliderTrack>
        </div>
      </Slider>
    </div>
  )
})
