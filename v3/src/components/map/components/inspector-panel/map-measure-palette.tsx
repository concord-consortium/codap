import {Box, Checkbox, Flex} from "@chakra-ui/react"
import {t} from "../../../../utilities/translation/translate"
import {ITileModel} from "../../../../models/tiles/tile-model"
import {InspectorPalette} from "../../../inspector-panel"
import ValuesIcon from "../../../../assets/icons/icon-values.svg"
import {isMapContentModel} from "../../models/map-content-model"
import {isMapPointLayerModel} from "../../models/map-point-layer-model"
import { logStringifiedObjectMessage } from "../../../../lib/log-message"
import { isMapPinLayerModel } from "../../models/map-pin-layer-model"

interface IProps {
  tile?: ITileModel
  panelRect?: DOMRect
  buttonRect?: DOMRect
  setShowPalette: (palette: string | undefined) => void
}

export const MapMeasurePalette = ({tile, panelRect, buttonRect, setShowPalette}: IProps) => {
  const mapModel = isMapContentModel(tile?.content) ? tile?.content : undefined
  if (!mapModel) return null

  const renderLayersDisplayControls = () => {
    return mapModel.layers.map(layer => {
      const pointLayer = isMapPointLayerModel(layer) ? layer : undefined
      const pinLayer = isMapPinLayerModel(layer) ? layer : undefined
      if (pointLayer || pinLayer) {
        return (
          <Flex className="map-values-controls" key={layer.id} direction='column'>
            <Box className='map-values-layer-label' data-testid={`map-values-layer-label`}>
              {layer.dataConfiguration.dataset?.name}
            </Box>
            {pointLayer && (
              <>
                <Checkbox className="palette-checkbox" data-testid={`map-values-grid-checkbox`}
                          defaultChecked={pointLayer.gridModel.isVisible}
                          onChange={() => {
                            const op = pointLayer.gridModel.isVisible ? 'hide' : 'show'
                            pointLayer.gridModel.applyModelChange(() => {
                              pointLayer.gridModel.setIsVisible(!pointLayer.gridModel.isVisible)
                            }, {
                              undoStringKey: `DG.Undo.map.${op}Grid`,
                              redoStringKey: `DG.Redo.map.${op}Grid`,
                              log: logStringifiedObjectMessage("mapAction: %@", {mapAction: `${op}Grid`})
                            })
                          }}
                >
                  {t("DG.Inspector.mapGrid")}
                </Checkbox>
                <Checkbox className="palette-checkbox" data-testid={`map-values-points-checkbox`}
                          defaultChecked={pointLayer.pointsAreVisible}
                          onChange={() => {
                            const op = pointLayer.pointsAreVisible ? 'hide' : 'show'
                            pointLayer.applyModelChange(() => {
                              pointLayer.setPointsAreVisible(!pointLayer.pointsAreVisible)
                            }, {
                              undoStringKey: `DG.Undo.map.${op}Points`,
                              redoStringKey: `DG.Redo.map.${op}Points`,
                              log: logStringifiedObjectMessage("mapAction: %@", {mapAction: `${op}Points`})
                            })
                          }}
                >
                  {t("DG.Inspector.mapPoints")}
                </Checkbox>
                <Checkbox className="palette-checkbox" data-testid={`map-values-lines-checkbox`}
                          defaultChecked={pointLayer.connectingLinesAreVisible}
                          onChange={() => {
                            const op = pointLayer.connectingLinesAreVisible ? 'hide' : 'show'
                            layer.applyModelChange(() => {
                              pointLayer.setConnectingLinesAreVisible(!pointLayer.connectingLinesAreVisible)
                            }, {
                              undoStringKey: `DG.Undo.map.${op}Lines`,
                              redoStringKey: `DG.Redo.map.${op}Lines`,
                              log: logStringifiedObjectMessage("mapAction: %@", {mapAction: `${op}ConnectingLines`})
                            })
                          }}
                >
                  {t("DG.Inspector.mapLines")}
                </Checkbox>
              </>
            )}
            {pinLayer && (
              <Checkbox className="palette-checkbox" data-testid={`map-values-pins-checkbox`}
                        defaultChecked={pinLayer.pinsAreVisible}
                        onChange={() => {
                          const op = pinLayer.pinsAreVisible ? 'hide' : 'show'
                          layer.applyModelChange(() => {
                            pinLayer.setPinsAreVisible(!pinLayer.pinsAreVisible)
                          }, {
                            undoStringKey: `V3.Undo.map.${op}Pins`,
                            redoStringKey: `V3.Redo.map.${op}Pins`,
                            log: logStringifiedObjectMessage("mapAction: %@", {mapAction: `${op}Pins`})
                          })
                        }}
              >
                {t("V3.map.inspector.pins")}
              </Checkbox>
            )}
          </Flex>
        )
      }
    })
  }

  return (
    <InspectorPalette title={t("DG.Inspector.values")} Icon={<ValuesIcon/>} setShowPalette={setShowPalette}
                      panelRect={panelRect} buttonRect={buttonRect}
    >
      <Flex className="palette-form" direction="column">
        {renderLayersDisplayControls()}
      </Flex>
    </InspectorPalette>
  )
}
