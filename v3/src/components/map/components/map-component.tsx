import {useDndContext, useDroppable} from '@dnd-kit/core'
import {observer} from "mobx-react-lite"
import React, {useEffect, useRef} from "react"
import {useResizeDetector} from "react-resize-detector"
import { getOverlayDragId } from '../../../hooks/use-drag-drop'
import {InstanceIdContext, useNextInstanceId} from "../../../hooks/use-instance-id-context"
import { selectAllCases } from '../../../models/data/data-set-utils'
import {DataDisplayLayoutContext} from "../../data-display/hooks/use-data-display-layout"
import {AttributeDragOverlay} from "../../drag-drop/attribute-drag-overlay"
import {ITileBaseProps} from '../../tiles/tile-base-props'
import {isMapContentModel} from "../models/map-content-model"
import {MapModelContext} from "../hooks/use-map-model-context"
import {useInitMapLayout} from "../hooks/use-init-map-layout"
import {CodapMap} from "./codap-map"

export const MapComponent = observer(function MapComponent({tile}: ITileBaseProps) {
  const mapModel = isMapContentModel(tile?.content) ? tile?.content : undefined

  const instanceId = useNextInstanceId("map")
  const layout = useInitMapLayout(mapModel)
  const mapRef = useRef<HTMLDivElement | null>(null)
  const {width, height} = useResizeDetector<HTMLDivElement>({targetRef: mapRef})

  useEffect(() => {
    if (mapModel) {
      mapModel.leafletMapState.setOnClickCallback((event: MouseEvent) => {
        if (!event.shiftKey && !event.metaKey && !mapModel._ignoreLeafletClicks) {
          mapModel.layers.forEach(layer => selectAllCases(layer.data, false))
        }
      })
      return () => mapModel.leafletMapState.setOnClickCallback()
    }
  }, [mapModel])

  useEffect(() => {
    (width != null) && (height != null) && layout.setTileExtent(width, height)
  }, [width, height, layout])

  // used to determine when a dragged attribute is over the map component
  const dropId = `${instanceId}-component-drop-overlay`
  const {setNodeRef} = useDroppable({id: dropId})
  setNodeRef(mapRef.current ?? null)

  const {active} = useDndContext()

  if (!mapModel) return null

  return (
    <InstanceIdContext.Provider value={instanceId}>
      <DataDisplayLayoutContext.Provider value={layout}>
        <MapModelContext.Provider value={mapModel}>
          <CodapMap mapRef={mapRef}/>
          <AttributeDragOverlay activeDragId={getOverlayDragId(active, instanceId)}/>
        </MapModelContext.Provider>
      </DataDisplayLayoutContext.Provider>
    </InstanceIdContext.Provider>
  )
})
