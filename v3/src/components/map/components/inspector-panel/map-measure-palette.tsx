import {observer} from "mobx-react-lite"
import {t} from "../../../../utilities/translation/translate"
import {ITileModel} from "../../../../models/tiles/tile-model"
import {InspectorPalette} from "../../../inspector-panel"
import {PaletteCheckbox} from "../../../palette-checkbox"
import DataIcon from "../../../../assets/icons/inspector-panel/data-icon.svg"
import {isMapContentModel} from "../../models/map-content-model"
import {isMapPointLayerModel} from "../../models/map-point-layer-model"
import { logStringifiedObjectMessage } from "../../../../lib/log-message"
import { isMapPinLayerModel } from "../../models/map-pin-layer-model"

interface IProps {
  id?: string
  tile?: ITileModel
  panelRect?: DOMRect
  buttonRect?: DOMRect
  setShowPalette: (palette: string | undefined) => void
}

export const MapMeasurePalette = observer(function MapMeasurePalette(
  {id, tile, panelRect, buttonRect, setShowPalette}: IProps) {
  const mapModel = isMapContentModel(tile?.content) ? tile?.content : undefined
  if (!mapModel) return null

  const renderLayersDisplayControls = () => {
    return mapModel.layers.map(layer => {
      const pointLayer = isMapPointLayerModel(layer) ? layer : undefined
      const pinLayer = isMapPinLayerModel(layer) ? layer : undefined
      if (pointLayer || pinLayer) {
        return (
          <div className="map-values-controls" key={layer.id}
               role="group" aria-labelledby={`map-values-label-${layer.id}`}>
            <div className="map-values-layer-label" id={`map-values-label-${layer.id}`}
                 data-testid={`map-values-layer-label-${layer.id}`}>
              {layer.dataConfiguration.dataset?.name}
            </div>
            {pointLayer && (
              <>
                <PaletteCheckbox data-testid={`map-values-grid-checkbox-${layer.id}`}
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
                <PaletteCheckbox data-testid={`map-values-points-checkbox-${layer.id}`}
                          isSelected={pointLayer.pointsAreVisible}
                          onChange={(checked) => {
                            const op = checked ? 'show' : 'hide'
                            pointLayer.applyModelChange(() => {
                              pointLayer.setPointsAreVisible(checked)
                            }, {
                              undoStringKey: `DG.Undo.map.${op}Points`,
                              redoStringKey: `DG.Redo.map.${op}Points`,
                              log: logStringifiedObjectMessage("mapAction: %@", {mapAction: `${op}Points`})
                            })
                          }}
                >
                  {t("DG.Inspector.mapPoints")}
                </PaletteCheckbox>
                <PaletteCheckbox data-testid={`map-values-lines-checkbox-${layer.id}`}
                          isSelected={pointLayer.connectingLinesAreVisible}
                          onChange={(checked) => {
                            const op = checked ? 'show' : 'hide'
                            layer.applyModelChange(() => {
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
              </>
            )}
            {pinLayer && (
              <PaletteCheckbox data-testid={`map-values-pins-checkbox-${layer.id}`}
                        isSelected={pinLayer.pinsAreVisible}
                        onChange={(checked) => {
                          const op = checked ? 'show' : 'hide'
                          layer.applyModelChange(() => {
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
            )}
          </div>
        )
      }
    })
  }

  return (
    <InspectorPalette id={id} title={t("V3.map.Inspector.Data")} Icon={<DataIcon/>}
                      setShowPalette={setShowPalette} panelRect={panelRect} buttonRect={buttonRect}
    >
      <div className="palette-form">
        {renderLayersDisplayControls()}
      </div>
    </InspectorPalette>
  )
})
