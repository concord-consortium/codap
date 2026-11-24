import { observer } from "mobx-react-lite"
import LayersIcon from "../../../../assets/icons/inspector-panel/layers-icon.svg"
import { logMessageWithReplacement, logStringifiedObjectMessage } from "../../../../lib/log-message"
import { t } from "../../../../utilities/translation/translate"
import { ITileModel } from "../../../../models/tiles/tile-model"
import { DisplayItemFormatControl } from "../../../data-display/inspector/display-item-format-control"
import { InspectorPalette } from "../../../inspector-panel"
import { PaletteCheckbox } from "../../../palette-checkbox"
import { isMapContentModel } from "../../models/map-content-model"
import { IMapLayerModel, isMapLayerModel } from "../../models/map-layer-model"
import { IMapPinLayerModel, isMapPinLayerModel } from "../../models/map-pin-layer-model"
import { IMapPointLayerModel, isMapPointLayerModel } from "../../models/map-point-layer-model"
import { MapHotSpotControl } from "./hot-spot/map-hot-spot-control"
import { MapBaseLayerControl } from "./map-base-layer-control"

import "./map-inspector.scss"

interface IProps {
  id?: string
  tile?: ITileModel
  panelRect?: DOMRect
  buttonRect?: DOMRect
  setShowPalette: (palette: string | undefined) => void
}

export const MapLayersPalette = observer(function MapLayersPalette(
  {id, tile, panelRect, buttonRect, setShowPalette}: IProps) {
  const mapModel = isMapContentModel(tile?.content) ? tile?.content : undefined
  if (!mapModel) return null

  const renderLayersFormattingControls = () => {

    const renderGridAndLinesSections = (pointLayer: IMapPointLayerModel) => (
      <>
        <div className="palette-form map-grid-controls">
          <PaletteCheckbox data-testid={`map-layers-checkbox-grid-${pointLayer.id}`}
            isSelected={pointLayer.gridModel.isVisible}
            onChange={(checked) => {
              const op = checked ? 'show' : 'hide'
              pointLayer.gridModel.applyModelChange(() => {
                pointLayer.gridModel.setIsVisible(checked)
              }, {
                undoStringKey: `DG.Undo.map.${op}Grid`,
                redoStringKey: `DG.Redo.map.${op}Grid`,
                log: logStringifiedObjectMessage("mapAction: %@", {mapAction: `${op}Grid`})
              })
            }}
          >
            {t("DG.Inspector.mapGrid")}
          </PaletteCheckbox>
        </div>
        <div className="palette-form map-lines-controls">
          <PaletteCheckbox data-testid={`map-layers-checkbox-lines-${pointLayer.id}`}
            isSelected={pointLayer.connectingLinesAreVisible}
            onChange={(checked) => {
              const op = checked ? 'show' : 'hide'
              pointLayer.applyModelChange(() => {
                pointLayer.setConnectingLinesAreVisible(checked)
              }, {
                undoStringKey: `DG.Undo.map.${op}Lines`,
                redoStringKey: `DG.Redo.map.${op}Lines`,
                log: logStringifiedObjectMessage("mapAction: %@", {mapAction: `${op}ConnectingLines`})
              })
            }}
          >
            {t("DG.Inspector.mapLines")}
          </PaletteCheckbox>
        </div>
      </>
    )

    const renderPinLayerControls = (pinLayer: IMapPinLayerModel) => (
      <div className="palette-form map-pins-controls">
        <PaletteCheckbox data-testid={`map-layers-checkbox-pins-${pinLayer.id}`}
          isSelected={pinLayer.pinsAreVisible}
          onChange={(checked) => {
            const op = checked ? 'show' : 'hide'
            pinLayer.applyModelChange(() => {
              pinLayer.setPinsAreVisible(checked)
            }, {
              undoStringKey: `V3.Undo.map.${op}Pins`,
              redoStringKey: `V3.Redo.map.${op}Pins`,
              log: logStringifiedObjectMessage("mapAction: %@", {mapAction: `${op}Pins`})
            })
          }}
        >
          {t("V3.map.inspector.pins")}
        </PaletteCheckbox>
      </div>
    )

    const renderOneFormatControl = (layer: IMapLayerModel) => {
      if (isMapPinLayerModel(layer)) return renderPinLayerControls(layer)

      const mapPointLayerModel = isMapPointLayerModel(layer) ? layer : undefined
      return (
        <>
          <DisplayItemFormatControl
            dataConfiguration={layer.dataConfiguration}
            displayItemDescription={layer.displayItemDescription}
            mapPointLayerModel={mapPointLayerModel}
            enablePointToggle={true}
          />
          <MapHotSpotControl mapPointLayerModel={mapPointLayerModel}/>
          {mapPointLayerModel && renderGridAndLinesSections(mapPointLayerModel)}
        </>
      )
    }

    return mapModel.layers.map(layer => {
      if (isMapLayerModel(layer)) {
        const layerLabelId = `map-layer-label-${layer.id}`
        return (
          <div className="map-layer-controls" key={layer.id} role="group" aria-labelledby={layerLabelId}>
            <PaletteCheckbox
              data-testid={`map-layers-checkbox-layer-${layer.id}`}
              isSelected={layer.isVisible}
              onChange={(checked) => {
                const op = checked ? 'show' : 'hide'
                layer.applyModelChange(() => {
                  layer.setVisibility(checked)
                }, {
                  undoStringKey: `V3.Undo.map.${op}Layer`,
                  redoStringKey: `V3.Redo.map.${op}Layer`,
                  log: logMessageWithReplacement("Map layer changed: %@ %@", {op, type: layer.type}),
                })
              }}
            >
              <span id={layerLabelId}>
                {layer.titleCollection?.title ?? t("DG.Inspector.defaultLayerName")}
              </span>
            </PaletteCheckbox>
            {renderOneFormatControl(layer)}
          </div>)
      }
    })
  }

  return (
    <InspectorPalette
      id={id}
      title={t("DG.Inspector.layers")}
      Icon={<LayersIcon/>}
      setShowPalette={setShowPalette}
      panelRect={panelRect}
      buttonRect={buttonRect}
      tileType="map"
    >
      <MapBaseLayerControl tile={tile}/>
      {renderLayersFormattingControls()}
    </InspectorPalette>
  )
})
