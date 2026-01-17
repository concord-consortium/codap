import { observer } from "mobx-react-lite"
import React, { useEffect, useRef } from "react"
import { useMemo } from "use-memo-one"
import { Background } from "../../data-display/components/background"
import { Marquee } from "../../data-display/components/marquee"
import { MarqueeState } from "../../data-display/models/marquee-state"
import { PixiPointsCompatibleArray } from "../../data-display/renderer"
import { IMapContentModel } from "../models/map-content-model"
import { mstReaction } from "../../../utilities/mst-reaction"

interface IProps {
  mapModel: IMapContentModel
  pixiPointsArray: PixiPointsCompatibleArray
}

export const MapBackground = observer(function MapBackground({ mapModel, pixiPointsArray }: IProps) {
  const backgroundSvgRef = useRef<SVGGElement>(null)
  const marqueeState = useMemo<MarqueeState>(() => new MarqueeState(), [])

  useEffect(() => {
    return mstReaction(
      () => mapModel.marqueeMode,
      marqueeMode => {
        if (marqueeMode === 'selected') {
          // disable leaflet event handlers when marquee-selecting
          mapModel.leafletMapState.disableDefaultEventHandlers()
          mapModel.ignoreLeafletClicks(true)
        }
        else {
          // enable leaflet event handlers when not marquee-selecting
          mapModel.leafletMapState.enableDefaultEventHandlers()
          mapModel.ignoreLeafletClicks(false)
        }
      }, { name: "MapBackground.marqueeMode" }, mapModel)
  }, [mapModel])

  if (mapModel.marqueeMode !== 'selected') return null

  return (
    <div className="map-background-div">
      <svg className="map-background-container">
        <Background
          ref={backgroundSvgRef}
          marqueeState={marqueeState}
          pixiPointsArray={pixiPointsArray}
        />
        <Marquee marqueeState={marqueeState}/>
      </svg>
    </div>
  )
})
