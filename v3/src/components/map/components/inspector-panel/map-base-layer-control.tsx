import {clsx} from "clsx"
import {observer} from "mobx-react-lite"
import {t} from "../../../../utilities/translation/translate"
import {ITileModel} from "../../../../models/tiles/tile-model"
import {BaseMapKey} from "../../map-types"
import {isMapContentModel} from "../../models/map-content-model"
import { logMessageWithReplacement, logStringifiedObjectMessage } from "../../../../lib/log-message"
import {PaletteCheckbox} from "../../../palette-checkbox"

import "./map-inspector.scss"

interface IProps {
  tile?: ITileModel
}

export const MapBaseLayerControl = observer(function MapBaseLayerControl(
  {tile}: IProps) {
  const mapModel = isMapContentModel(tile?.content) ? tile?.content : undefined
  if (!mapModel) return null

  const classNameForSegment = (layerName: string) => {
    return clsx("map-base-button", layerName, { selected: layerName === mapModel.baseMapLayerName })
  }

  const toggleVisibility = (checked: boolean) => {
    const undoString = checked
        ? "V3.Undo.map.inspector.showMapLayer" : "V3.Undo.map.inspector.hideMapLayer"
    const redoString = checked
        ? "V3.Redo.map.inspector.showMapLayer" : "V3.Redo.map.inspector.hideMapLayer"
    mapModel.applyModelChange(
      () => mapModel.setBaseMapLayerVisibility(checked), {
        undoStringKey: undoString,
        redoStringKey: redoString,
        log: logMessageWithReplacement("Map base layer visibility changed: %@", {visibility: checked}),
      }
    )
  }

  const changeBaseMapLayer = (layerName: BaseMapKey) => {
    mapModel.applyModelChange(
      () => mapModel.setBaseMapLayerName(layerName),
      {
        undoStringKey: "V3.Undo.map.inspector.changeMapBaseLayer",
        redoStringKey: "V3.Redo.map.inspector.changeMapBaseLayer",
        log: logStringifiedObjectMessage("Map base layer changed: %@", {value: layerName}),
      }
    )
  }

  return (
    <div className="palette-form map-base-control">
      <PaletteCheckbox
        data-testid={`map-layers-checkbox-base`}
        isSelected={mapModel.baseMapLayerIsVisible}
        onChange={toggleVisibility}
      >
        {t('V3.map.inspector.base')}
      </PaletteCheckbox>
      <div className="map-base-segmented">
        <button type="button" data-testid={`map-layers-base-oceans`}
          className={classNameForSegment('oceans')}
          aria-pressed={mapModel.baseMapLayerName === 'oceans'}
          onClick={()=>{ changeBaseMapLayer('oceans') }}>
          {t('V3.map.inspector.oceans')}
        </button>
        <button type="button" data-testid={`map-layers-base-topo`}
          className={classNameForSegment('topo')}
          aria-pressed={mapModel.baseMapLayerName === 'topo'}
          onClick={()=>{ changeBaseMapLayer('topo') }}>
          {t('V3.map.inspector.topo')}
        </button>
        <button type="button" data-testid={`map-layers-base-streets`}
          className={classNameForSegment('streets')}
          aria-pressed={mapModel.baseMapLayerName === 'streets'}
          onClick={()=>{ changeBaseMapLayer('streets') }}>
          {t('V3.map.inspector.streets')}
        </button>
      </div>
    </div>
  )
})
