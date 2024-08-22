import React from "react"
import {clsx} from "clsx"
import {observer} from "mobx-react-lite"
import {Box, Checkbox, Flex} from "@chakra-ui/react"
import {t} from "../../../../utilities/translation/translate"
import {ITileModel} from "../../../../models/tiles/tile-model"
import {BaseMapKey} from "../../map-types"
import {isMapContentModel} from "../../models/map-content-model"
import { logMessageWithReplacement, logStringifiedObjectMessage } from "../../../../lib/log-message"

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

  const toggleVisibility = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isVisible = e.target.checked,
      undoString = isVisible
        ? "V3.Undo.map.inspector.showMapLayer" : "V3.Undo.map.inspector.hideMapLayer",
      redoString = isVisible
        ? "V3.Redo.map.inspector.showMapLayer" : "V3.Redo.map.inspector.hideMapLayer"
    mapModel.applyModelChange(
      () => mapModel.setBaseMapLayerVisibility(e.target.checked), {
        undoStringKey: undoString,
        redoStringKey: redoString,
        log: logMessageWithReplacement("Map base layer visibility changed: %@", {visibility: isVisible}),
      }
    )
  }

  const changeBaseMapLayer = (layerName: BaseMapKey) => {
    mapModel.applyModelChange(
      () => mapModel.setBaseMapLayerName(layerName),
      {
        undoStringKey: "V3.Undo.map.inspector.changeMapBaseLayer",
        redoStringKey: "V3.Redo.map.inspector.changeMapBaseLayer",
        log: logStringifiedObjectMessage("Map base layer changed: ", {value: layerName}),
      }
    )
  }

  return (
    <Flex className="palette-form map-base-control" direction="row">
      <Checkbox
        className="palette-checkbox"
        data-testid={`map-layers-checkbox-base`}
        defaultChecked={mapModel.baseMapLayerIsVisible}
        onChange={toggleVisibility}
        padding="2px"
      >
        {t('V3.map.inspector.base')}
      </Checkbox>
      <Flex className='map-base-segmented'>
        <Box data-testid={`map-layers-base-oceans`} className={classNameForSegment('oceans')}
          onClick={()=>{ changeBaseMapLayer('oceans') }}>
          {t('V3.map.inspector.oceans')}
        </Box>
        <Box data-testid={`map-layers-base-topo`} className={classNameForSegment('topo')}
              onClick={()=>{ changeBaseMapLayer('topo') }}>
          {t('V3.map.inspector.topo')}
        </Box>
        <Box data-testid={`map-layers-base-streets`} className={classNameForSegment('streets')}
              onClick={()=>{ changeBaseMapLayer('streets') }}>
          {t('V3.map.inspector.streets')}
        </Box>
      </Flex>
    </Flex>
  )
})
