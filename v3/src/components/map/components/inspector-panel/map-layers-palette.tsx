import React from "react"
import {observer} from "mobx-react-lite"
import {Checkbox} from "@chakra-ui/react"
import {t} from "../../../../utilities/translation/translate"
import {ITileModel} from "../../../../models/tiles/tile-model"
import {InspectorPalette} from "../../../inspector-panel"
import LayersIcon from "../../../../assets/icons/icon-layers.svg"
import {isMapContentModel} from "../../models/map-content-model"
import {MapBaseLayerControl} from "./map-base-layer-control"
import {DisplayItemFormatControl} from "../../../data-display/inspector/display-item-format-control"
import {IMapLayerModel, isMapLayerModel} from "../../models/map-layer-model"

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
      return (
        <DisplayItemFormatControl
          dataConfiguration={layer.dataConfiguration}
          displayItemDescription={layer.displayItemDescription}
        >
        </DisplayItemFormatControl>)
    }

    return mapModel.layers.map(layer => {
      if (isMapLayerModel(layer)) {
        return (
          <div className="map-layer-controls" key={layer.id}>
            <Checkbox
              className='map-layers-checkbox'
              data-testid={`map-layers-checkbox-layer`}
              defaultChecked={layer.isVisible}
              onChange={() => {
                const op = layer.isVisible ? 'hide' : 'show'
                layer.applyModelChange(() => {
                  layer.setVisibility(!layer.isVisible)
                }, {
                  undoStringKey: `V3.Undo.map.${op}Layer`,
                  redoStringKey: `V3.Redo.map.${op}Layer`
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
