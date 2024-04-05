import {clsx} from "clsx"
import {observer} from "mobx-react-lite"
import React, {MutableRefObject} from "react"
import {Button, Portal, Tooltip} from "@chakra-ui/react"
import {translate} from "../../../utilities/translation/translate"
import {IMapContentModel} from "../models/map-content-model"
import {isMapPointLayerModel} from "../models/map-point-layer-model"

interface IProps {
  mapModel: IMapContentModel
  mapRef: MutableRefObject<HTMLDivElement | null>
}


export const MapMarqueeSelectButton = observer(function MapMarqueeSelectButton({mapRef, mapModel}: IProps) {

  const atLeastOnePointsLayerIsVisible = mapModel.layers.some(
      layer => isMapPointLayerModel(layer) && layer.isVisible
    )

  const handleClick = () => {
    if (mapModel.marqueeMode === 'unclicked') {
      mapModel.setMarqueeMode('selected')
    } else {
      mapModel.setMarqueeMode('unclicked')
    }
  }

  if (atLeastOnePointsLayerIsVisible) {
    const className = clsx('map-marquee-select', {selected: mapModel.marqueeMode === 'selected'})
    return (
      <Portal containerRef={mapRef}>
        <Tooltip hasArrow openDelay={500} fontSize='xs' label={translate('DG.MapView.marqueeHint')}>
          <Button className={className} data-testid="map-marquee-select"
                  aria-label={translate('DG.MapView.marqueeHint')}
                  onClick={handleClick}/>
        </Tooltip>
      </Portal>
    )
  }
})
