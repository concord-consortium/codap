import { observer } from "mobx-react-lite"
import { logStringifiedObjectMessage } from "../../../../lib/log-message"
import { isFeatureEnabled } from "../../../../models/feature-flags/feature-flag-manager"
import { t } from "../../../../utilities/translation/translate"
import { PaletteCheckbox } from "../../../palette-checkbox"
import { IMapPointLayerModel } from "../../models/map-point-layer-model"

interface IProps {
  mapPointLayerModel?: IMapPointLayerModel
}

export const MapHotSpotControl = observer(function MapHotSpotControl({ mapPointLayerModel }: IProps) {
  if (!mapPointLayerModel || !isFeatureEnabled("mapHotSpot")) return null

  const { hotSpotModel } = mapPointLayerModel

  const handleChange = (checked: boolean) => {
    const op = checked ? "show" : "hide"
    hotSpotModel.applyModelChange(() => {
      hotSpotModel.setIsVisible(checked)
    }, {
      undoStringKey: `V3.Undo.map.${op}HotSpot`,
      redoStringKey: `V3.Redo.map.${op}HotSpot`,
      log: logStringifiedObjectMessage("mapAction: %@",
        { mapAction: `${op}HotSpot`, dataset: mapPointLayerModel.dataConfiguration.dataset?.name })
    })
  }

  return (
    <div className="map-hot-spot-controls">
      <PaletteCheckbox
        data-testid="map-layers-checkbox-hot-spot"
        isSelected={hotSpotModel.isVisible}
        onChange={handleChange}
      >
        {t("V3.Inspector.map.hotSpot")}
      </PaletteCheckbox>
    </div>
  )
})
