import {useDndContext, useDroppable} from '@dnd-kit/core'
import {observer} from "mobx-react-lite"
import React, {useEffect, useRef} from "react"
import {useResizeDetector} from "react-resize-detector"
import {ITileBaseProps} from '../../tiles/tile-base-props'
import {InstanceIdContext, useNextInstanceId} from "../../../hooks/use-instance-id-context"
import {AttributeDragOverlay} from "../../drag-drop/attribute-drag-overlay"
import {CodapMap} from "./codap-map"
import {isMapContentModel} from "../models/map-content-model"
import {DataDisplayLayoutContext} from "../../data-display/hooks/use-data-display-layout"
import {MapModelContext} from "../hooks/use-map-model-context"
import {useInitMapLayout} from "../hooks/use-init-map-layout"

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
          mapModel.deselectAllCases()
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
  const overlayDragId = active && `${active.id}`.startsWith(instanceId)
    ? `${active.id}` : undefined

  if (!mapModel) return null

  return (
    <InstanceIdContext.Provider value={instanceId}>
      <DataDisplayLayoutContext.Provider value={layout}>
        <MapModelContext.Provider value={mapModel}>
          <CodapMap mapRef={mapRef}/>
          <AttributeDragOverlay activeDragId={overlayDragId}/>
        </MapModelContext.Provider>
      </DataDisplayLayoutContext.Provider>
    </InstanceIdContext.Provider>
  )
})
