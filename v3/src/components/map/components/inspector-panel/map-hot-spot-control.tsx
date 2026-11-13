import { observer } from "mobx-react-lite"
import { Label, Slider, SliderThumb, SliderTrack } from "react-aria-components"
import { logStringifiedObjectMessage } from "../../../../lib/log-message"
import { isFeatureEnabled } from "../../../../models/feature-flags/feature-flag-manager"
import { t } from "../../../../utilities/translation/translate"
import { PaletteCheckbox } from "../../../palette-checkbox"
import { IMapPointLayerModel } from "../../models/map-point-layer-model"

// Announce the opacity to screen readers as a percentage (e.g. "75%") rather than a raw fraction
const kOpacityFormatOptions: Intl.NumberFormatOptions = { style: "percent" }

interface IProps {
  mapPointLayerModel?: IMapPointLayerModel
}

export const MapHotSpotControl = observer(function MapHotSpotControl({ mapPointLayerModel }: IProps) {
  if (!mapPointLayerModel || !isFeatureEnabled("mapHotSpot")) return null

  const { hotSpotModel } = mapPointLayerModel
  const datasetName = mapPointLayerModel.dataConfiguration.dataset?.name

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
