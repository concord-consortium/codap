import React from "react"
import {observer} from "mobx-react-lite"
import {Box, Checkbox, Flex, HStack} from "@chakra-ui/react"
import {t} from "../../../../utilities/translation/translate"
import {ITileModel} from "../../../../models/tiles/tile-model"
import {InspectorPalette} from "../../../inspector-panel"
import LayersIcon from "../../../../assets/icons/icon-layers.svg"
import {BaseMapKey} from "../../map-types"
import {isMapContentModel} from "../../models/map-content-model"

import "./map-inspector.scss"

interface IProps {
  tile?: ITileModel
  panelRect?: DOMRect
  buttonRect?: DOMRect
  setShowPalette: (palette: string | undefined) => void
}

export const MapLayersPalette = observer(function MapLayersPalette(
  { tile, panelRect, buttonRect, setShowPalette }: IProps) {
  const mapModel = isMapContentModel(tile?.content) ? tile?.content : undefined
  if (!mapModel) return null

  const classNameForSegment = (layerName: string) => {
    return mapModel.baseMapLayerName === layerName ? 'map-base-button-selected' : 'map-base-button'
  }

  const toggleVisibility = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isVisible = e.target.checked,
      undoString = isVisible
        ? "V3.Undo.map.inspector.showMapLayer" : "V3.Undo.map.inspector.hideMapLayer",
      redoString = isVisible
        ? "V3.Redo.map.inspector.showMapLayer" : "V3.Redo.map.inspector.hideMapLayer"
    mapModel.applyUndoableAction(
      () => mapModel.setBaseMapLayerVisibility(e.target.checked), undoString, redoString)
  }

  const changeBaseMapLayer = (layerName: BaseMapKey) => {
    mapModel.applyUndoableAction(
      () => mapModel.setBaseMapLayerName(layerName),
      "V3.Undo.map.inspector.changeMapBaseLayer", "V3.Redo.map.inspector.changeMapBaseLayer"
    )
  }

  return (
    <InspectorPalette
      title={t("DG.Inspector.layers")}
      Icon={<LayersIcon/>}
      setShowPalette={setShowPalette}
      panelRect={panelRect}
      buttonRect={buttonRect}
    >
      <Flex className="palette-form map-base-control" direction="row">
        <Checkbox
          data-testid={`map-layers-checkbox-base`}
          defaultChecked={mapModel.baseMapLayerIsVisible}
          onChange={toggleVisibility}
          padding="2px"
        >
          {t('V3.map.inspector.base')}
        </Checkbox>
        <HStack spacing='5px' className='map-base-segmented'>
          <Box data-testid={`map-layers-base-oceans`} className={classNameForSegment('oceans')}
            onClick={()=>{ changeBaseMapLayer('oceans') }}>
            {t('V3.map.inspector.oceans')}
          </Box>
          <Box> | </Box>
          <Box data-testid={`map-layers-base-topo`} className={classNameForSegment('topo')}
                onClick={()=>{ changeBaseMapLayer('topo') }}>
            {t('V3.map.inspector.topo')}
          </Box>
          <Box> | </Box>
          <Box data-testid={`map-layers-base-streets`} className={classNameForSegment('streets')}
                onClick={()=>{ changeBaseMapLayer('streets') }}>
            {t('V3.map.inspector.streets')}
          </Box>
        </HStack>
      </Flex>
    </InspectorPalette>
  )
})
