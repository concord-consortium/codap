import { observer } from "mobx-react-lite"
import { useEffect, useRef } from "react"
import { useMemo } from "use-memo-one"
import { Background } from "../../data-display/components/background"
import { Marquee } from "../../data-display/components/marquee"
import { MarqueeState } from "../../data-display/models/marquee-state"
import { PointRendererArray } from "../../data-display/renderer"
import { IMapContentModel } from "../models/map-content-model"
import { mstReaction } from "../../../utilities/mst-reaction"

interface IProps {
  mapModel: IMapContentModel
  rendererArray: PointRendererArray
}

export const MapBackground = observer(function MapBackground({ mapModel, rendererArray }: IProps) {
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
          rendererArray={rendererArray}
        />
        <Marquee marqueeState={marqueeState}/>
      </svg>
    </div>
  )
})
