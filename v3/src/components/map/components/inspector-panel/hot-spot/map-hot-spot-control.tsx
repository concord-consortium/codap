import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { Label, Slider, SliderThumb, SliderTrack } from "react-aria-components"
import { logStringifiedObjectMessage } from "../../../../../lib/log-message"
import { isFeatureEnabled } from "../../../../../models/feature-flags/feature-flag-manager"
import { t } from "../../../../../utilities/translation/translate"
import { ColorSetting } from "../../../../common/color-setting"
import { PaletteCheckbox } from "../../../../palette-checkbox"
import { IMapPointLayerModel } from "../../../models/map-point-layer-model"
import { HotSpotColorRamp } from "../../../utilities/hot-spot-color-ramps"
import { MapHotSpotBinningSlider } from "./map-hot-spot-binning-slider"
import { MapHotSpotColorRampSelect } from "./map-hot-spot-color-ramp-select"
import { MapHotSpotResolutionSlider } from "./map-hot-spot-resolution-slider"

// Announce the opacity to screen readers as a percentage (e.g. "75%") rather than a raw fraction
const kOpacityFormatOptions: Intl.NumberFormatOptions = { style: "percent" }

interface IProps {
  mapPointLayerModel?: IMapPointLayerModel
}

export const MapHotSpotControl = observer(function MapHotSpotControl({ mapPointLayerModel }: IProps) {
  if (!mapPointLayerModel || !isFeatureEnabled("mapHotSpot")) return null

  const { hotSpotModel } = mapPointLayerModel
  const { colorRamp, lowColor, highColor, isVisible } = hotSpotModel
  const datasetName = mapPointLayerModel.dataConfiguration.dataset?.name
  const disabled = !isVisible
  const customColorsDisabled = disabled || colorRamp !== "custom"

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

  const commitOpacity = (opacity: number) => {
    if (opacity === hotSpotModel.opacity) {
      // Nothing to commit, so just end the in-progress change.
      hotSpotModel.setDynamicOpacity(undefined)
      return
    }

    hotSpotModel.applyModelChange(() => {
      hotSpotModel.setOpacity(opacity)
    }, {
      undoStringKey: "V3.Undo.map.changeHotSpotOpacity",
      redoStringKey: "V3.Redo.map.changeHotSpotOpacity",
      log: logStringifiedObjectMessage("mapAction: %@",
        { mapAction: "changeHotSpotOpacity", opacity, dataset: datasetName })
    })
  }

  const handleColorRampChange = (newColorRamp: HotSpotColorRamp) => {
    hotSpotModel.applyModelChange(() => {
      hotSpotModel.setColorRamp(newColorRamp)
    }, {
      undoStringKey: "V3.Undo.map.changeHotSpotColorRamp",
      redoStringKey: "V3.Redo.map.changeHotSpotColorRamp",
      log: logStringifiedObjectMessage("mapAction: %@",
        { mapAction: "changeHotSpotColorRamp", colorRamp: newColorRamp, dataset: datasetName })
    })
  }

  const handleCustomColorChange = (end: "Low" | "High", color: string) => {
    hotSpotModel.applyModelChange(() => {
      if (end === "Low") {
        hotSpotModel.setLowColor(color)
      } else {
        hotSpotModel.setHighColor(color)
      }
    }, {
      undoStringKey: `V3.Undo.map.changeHotSpot${end}Color`,
      redoStringKey: `V3.Redo.map.changeHotSpot${end}Color`,
      log: logStringifiedObjectMessage("mapAction: %@",
        { mapAction: `changeHotSpot${end}Color`, color, dataset: datasetName })
    })
  }

  const renderCustomColorRow = (end: "Low" | "High", color: string) => {
    const label = t(`V3.Inspector.map.hotSpot${end}Color`)
    return (
      <div
        className={clsx("palette-row", "color-picker-row", { disabled: customColorsDisabled })}
        aria-disabled={customColorsDisabled || undefined}
      >
        <label className="form-label color-picker">{label}</label>
        <ColorSetting
          propertyLabel={label}
          testIdSuffix={`hot-spot-${end.toLowerCase()}`}
          disabled={customColorsDisabled}
          onColorChange={newColor => handleCustomColorChange(end, newColor)}
          swatchBackgroundColor={color}
        />
      </div>
    )
  }

  const handleOpacityBlur = () => {
    const { dynamicOpacity } = hotSpotModel
    if (dynamicOpacity != null) commitOpacity(dynamicOpacity)
  }

  return (
    <div className="map-hot-spot-controls palette-form">
      <PaletteCheckbox
        data-testid="map-layers-checkbox-hot-spot"
        isSelected={isVisible}
        onChange={handleIsVisibleChange}
      >
        {t("V3.Inspector.map.hotSpot")}
      </PaletteCheckbox>
      <MapHotSpotResolutionSlider mapPointLayerModel={mapPointLayerModel}/>
      <Slider
        minValue={0}
        maxValue={1}
        step={0.01}
        formatOptions={kOpacityFormatOptions}
        value={hotSpotModel.displayOpacity}
        onChange={(val: number) => hotSpotModel.setDynamicOpacity(val)}
        isDisabled={disabled}
        onChangeEnd={commitOpacity}
        data-testid="map-hot-spot-opacity-slider"
      >
        <div className="palette-row slider-row">
          <Label className="form-label">{t("V3.Inspector.map.hotSpotOpacity")}</Label>
          <SliderTrack>
            <SliderThumb onBlur={handleOpacityBlur}/>
          </SliderTrack>
        </div>
      </Slider>
      <MapHotSpotColorRampSelect
        colorRamp={colorRamp}
        lowColor={lowColor}
        highColor={highColor}
        isDisabled={disabled}
        onColorRampChange={handleColorRampChange}
      />
      {renderCustomColorRow("Low", lowColor)}
      {renderCustomColorRow("High", highColor)}
      <MapHotSpotBinningSlider mapPointLayerModel={mapPointLayerModel}/>
    </div>
  )
})
