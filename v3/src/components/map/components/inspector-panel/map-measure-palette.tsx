import React from "react"
import {Box, Checkbox, Flex} from "@chakra-ui/react"
import {t} from "../../../../utilities/translation/translate"
import {ITileModel} from "../../../../models/tiles/tile-model"
import {InspectorPalette} from "../../../inspector-panel"
import ValuesIcon from "../../../../assets/icons/icon-values.svg"
import {isMapContentModel} from "../../models/map-content-model"
import {isMapPointLayerModel} from "../../models/map-point-layer-model"

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
      if (isMapPointLayerModel(layer)) {
        return (
          <Flex className="map-values-controls" key={layer.id} direction='column'>
            <Box className='map-values-layer-label' data-testid={`map-values-layer-label`}>
              {layer.dataConfiguration.dataset?.name}
            </Box>
            <Checkbox className="palette-checkbox" data-testid={`map-values-grid-checkbox`}
                      defaultChecked={layer.gridModel.isVisible}
                      onChange={() => {
                        const op = layer.gridModel.isVisible ? 'hide' : 'show'
                        layer.gridModel.applyModelChange(() => {
                          layer.gridModel.setIsVisible(!layer.gridModel.isVisible)
                        }, {
                          undoStringKey: `DG.Undo.map.${op}Grid`,
                          redoStringKey: `DG.Redo.map.${op}Grid`
                        })
                      }}
            >
              {t("DG.Inspector.mapGrid")}
            </Checkbox>
            <Checkbox className="palette-checkbox" data-testid={`map-values-points-checkbox`}
                      defaultChecked={layer.pointsAreVisible}
                      onChange={() => {
                        const op = layer.pointsAreVisible ? 'hide' : 'show'
                        layer.applyModelChange(() => {
                          layer.setPointsAreVisible(!layer.pointsAreVisible)
                        }, {
                          undoStringKey: `DG.Undo.map.${op}Points`,
                          redoStringKey: `DG.Redo.map.${op}Points`
                        })
                      }}
            >
              {t("DG.Inspector.mapPoints")}
            </Checkbox>
            <Checkbox className="palette-checkbox" data-testid={`map-values-lines-checkbox`}
                      defaultChecked={layer.connectingLinesAreVisible}
                      onChange={() => {
                        const op = layer.connectingLinesAreVisible ? 'hide' : 'show'
                        layer.applyModelChange(() => {
                          layer.setConnectingLinesAreVisible(!layer.connectingLinesAreVisible)
                        }, {
                          undoStringKey: `DG.Undo.map.${op}Lines`,
                          redoStringKey: `DG.Redo.map.${op}Lines`
                        })
                      }}
            >
              {t("DG.Inspector.mapLines")}
            </Checkbox>
          </Flex>)
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
