import {observer} from "mobx-react-lite"
import React, {MutableRefObject} from "react"
import {Button, Portal} from "@chakra-ui/react"
import {IMapContentModel} from "../models/map-content-model"
import {isMapPointLayerModel} from "../models/map-point-layer-model"

interface IProps {
  mapModel: IMapContentModel
  mapRef: MutableRefObject<HTMLDivElement | null>
}


export const MapMarqueeSelectButton = observer(function MapMarqueeSelectButton({mapRef, mapModel}: IProps) {

  const atLeastOnePointsLayerIsVisible = () => {
    return mapModel.layers.some(
      layer => isMapPointLayerModel(layer) && layer.isVisible
    )
  }

  const handleClick = () => {
    if (mapModel.marqueeMode === 'unclicked') {
      mapModel.setMarqueeMode('selected')
    }
    else {
      mapModel.setMarqueeMode('unclicked')
    }
  }

  if (atLeastOnePointsLayerIsVisible()) {
    const className = mapModel.marqueeMode === 'selected' ? 'map-marquee-select selected' : 'map-marquee-select'
    return (
      <Portal containerRef={mapRef}>
        <Button className={className} data-testid="map-marquee-select" aria-label='Marquee Select'
                onClick={handleClick}/>
      </Portal>
    )
  }
})
