import {observer} from "mobx-react-lite"
import {Checkbox} from "@chakra-ui/react"
import LayersIcon from "../../../../assets/icons/icon-layers.svg"
import { logMessageWithReplacement } from "../../../../lib/log-message"
import {t} from "../../../../utilities/translation/translate"
import {ITileModel} from "../../../../models/tiles/tile-model"
import {DisplayItemFormatControl} from "../../../data-display/inspector/display-item-format-control"
import {InspectorPalette} from "../../../inspector-panel"
import {isMapContentModel} from "../../models/map-content-model"
import {IMapLayerModel, isMapLayerModel} from "../../models/map-layer-model"
import { isMapPinLayerModel } from "../../models/map-pin-layer-model"
import { isMapPointLayerModel } from "../../models/map-point-layer-model"
import {MapBaseLayerControl} from "./map-base-layer-control"

import "./map-inspector.scss"

interface IProps {
  tile?: ITileModel
  panelRect?: DOMRect
  buttonRect?: DOMRect
  setShowPalette: (palette: string | undefined) => void
}

export const MapLayersPalette = observer(function MapLayersPalette(
  {tile, panelRect, buttonRect, setShowPalette}: IProps) {
  const mapModel = isMapContentModel(tile?.content) ? tile?.content : undefined
  if (!mapModel) return null

  const renderLayersFormattingControls = () => {

    const renderOneFormatControl = (layer: IMapLayerModel) => {
      if (isMapPinLayerModel(layer)) return null

      const mapPointLayerModel = isMapPointLayerModel(layer) ? layer : undefined
      return (
        <DisplayItemFormatControl
          dataConfiguration={layer.dataConfiguration}
          displayItemDescription={layer.displayItemDescription}
          mapPointLayerModel={mapPointLayerModel}
        >
        </DisplayItemFormatControl>)
    }

    return mapModel.layers.map(layer => {
      if (isMapLayerModel(layer)) {
        return (
          <div className="map-layer-controls" key={layer.id}>
            <Checkbox
              className="palette-checkbox"
              data-testid={`map-layers-checkbox-layer`}
              defaultChecked={layer.isVisible}
              onChange={() => {
                const op = layer.isVisible ? 'hide' : 'show'
                layer.applyModelChange(() => {
                  layer.setVisibility(!layer.isVisible)
                }, {
                  undoStringKey: `V3.Undo.map.${op}Layer`,
                  redoStringKey: `V3.Redo.map.${op}Layer`,
                  log: logMessageWithReplacement("Map layer changed: %@ %@", {op, type: layer.type}),
                })
              }}
            >
              {layer.dataConfiguration.dataset?.name /* todo:  */}
            </Checkbox>
            {renderOneFormatControl(layer)}
          </div>)
      }
    })
  }

  return (
    <InspectorPalette
      title={t("DG.Inspector.layers")}
      Icon={<LayersIcon/>}
      setShowPalette={setShowPalette}
      panelRect={panelRect}
      buttonRect={buttonRect}
    >
      <MapBaseLayerControl tile={tile}/>
      {renderLayersFormattingControls()}
    </InspectorPalette>
  )
})
