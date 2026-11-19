import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import {
  Button, Key, Label, ListBox, ListBoxItem, Popover, Select, SelectValue, Slider, SliderThumb, SliderTrack
} from "react-aria-components"
import { logStringifiedObjectMessage } from "../../../../lib/log-message"
import { isFeatureEnabled } from "../../../../models/feature-flags/feature-flag-manager"
import { t } from "../../../../utilities/translation/translate"
import { ColorSetting } from "../../../common/color-setting"
import { PaletteCheckbox } from "../../../palette-checkbox"
import { IMapPointLayerModel } from "../../models/map-point-layer-model"
import {
  getHotSpotRampGradient, HotSpotColorRamp, HotSpotColorRamps, isHotSpotColorRamp
} from "../../utilities/hot-spot-color-ramps"

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

  const handleColorRampChange = (key: Key | null) => {
    if (!isHotSpotColorRamp(key) || key === colorRamp) return

    hotSpotModel.applyModelChange(() => {
      hotSpotModel.setColorRamp(key)
    }, {
      undoStringKey: "V3.Undo.map.changeHotSpotColorRamp",
      redoStringKey: "V3.Redo.map.changeHotSpotColorRamp",
      log: logStringifiedObjectMessage("mapAction: %@",
        { mapAction: "changeHotSpotColorRamp", colorRamp: key, dataset: datasetName })
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

  const renderRamp = (ramp: HotSpotColorRamp) => (
    <>
      <span
        className="hot-spot-ramp-strip"
        // The strip is decorative: the option's text is its accessible name.
        aria-hidden="true"
        style={{ background: getHotSpotRampGradient(ramp, lowColor, highColor) }}
      />
      {t(`V3.Inspector.map.hotSpotColorRamp.${ramp}`)}
    </>
  )

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

  return (
    <div className="map-hot-spot-controls palette-form">
      <PaletteCheckbox
        data-testid="map-layers-checkbox-hot-spot"
        isSelected={isVisible}
        onChange={handleIsVisibleChange}
      >
        {t("V3.Inspector.map.hotSpot")}
      </PaletteCheckbox>
      <Slider
        minValue={0}
        maxValue={1}
        step={0.01}
        formatOptions={kOpacityFormatOptions}
        value={hotSpotModel.displayOpacity}
        onChange={(val: number) => hotSpotModel.setDynamicOpacity(val)}
        onChangeEnd={handleOpacityChangeEnd}
        isDisabled={disabled}
        data-testid="map-hot-spot-opacity-slider"
      >
        <div className="palette-row slider-row">
          <Label className="form-label">{t("V3.Inspector.map.hotSpotOpacity")}</Label>
          <SliderTrack>
            <SliderThumb />
          </SliderTrack>
        </div>
      </Slider>
      <Select
        className={clsx("react-aria-Select palette-row color-ramp-row", { disabled })}
        selectedKey={colorRamp}
        onSelectionChange={handleColorRampChange}
        isDisabled={disabled}
        data-testid="map-hot-spot-color-ramp-select"
      >
        <Label className="form-label">{t("V3.Inspector.map.hotSpotColorRamp")}</Label>
        <Button data-testid="map-hot-spot-color-ramp-button">
          <SelectValue />
          <span aria-hidden="true" className="select-arrow">▾</span>
        </Button>
        <Popover
          className="react-aria-Popover hot-spot-color-ramp-popover"
          data-testid="map-hot-spot-color-ramp-popover"
        >
          <ListBox>
            {HotSpotColorRamps.map(ramp =>
              <ListBoxItem key={ramp} id={ramp} textValue={t(`V3.Inspector.map.hotSpotColorRamp.${ramp}`)}>
                {renderRamp(ramp)}
              </ListBoxItem>
            )}
          </ListBox>
        </Popover>
      </Select>
      {renderCustomColorRow("Low", lowColor)}
      {renderCustomColorRow("High", highColor)}
    </div>
  )
})
