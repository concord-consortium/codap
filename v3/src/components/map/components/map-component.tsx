import {useDndContext, useDroppable} from '@dnd-kit/core'
import {observer} from "mobx-react-lite"
import React, {useEffect, useMemo, useRef} from "react"
import {useResizeDetector} from "react-resize-detector"
import {ITileBaseProps} from '../../tiles/tile-base-props'
import {InstanceIdContext, useNextInstanceId} from "../../../hooks/use-instance-id-context"
import {AttributeDragOverlay} from "../../drag-drop/attribute-drag-overlay"
import {DotsElt} from "../../data-display/d3-types"
import {CodapMap} from "./codap-map"
import {isMapContentModel, MapContentModelContext} from "../models/map-content-model"
import {MapController} from "../models/map-controller"
import {MapLayoutContext} from "../models/map-layout"
import {useInitMapLayout} from "../hooks/use-init-map-layout"
import {useMapController} from "../hooks/use-map-controller"

export const MapComponent = observer(function MapComponent({tile}: ITileBaseProps) {
  const mapContentModel = isMapContentModel(tile?.content) ? tile?.content : undefined

  const instanceId = useNextInstanceId("map")
  const layout = useInitMapLayout(mapContentModel)
  const mapRef = useRef<HTMLDivElement | null>(null)
  const {width, height} = useResizeDetector<HTMLDivElement>({targetRef: mapRef})
  const enableAnimation = useRef(true)
  const dotsRef = useRef<DotsElt>(null)
  const mapController = useMemo(
    () => new MapController({layout, enableAnimation, instanceId}),
    [layout, instanceId]
  )

  useMapController({mapController, mapContentModel, dotsRef})

  useEffect(() => {
    (width != null) && (height != null) && layout.setParentExtent(width, height)
  }, [width, height, layout])

  useEffect(function cleanup() {
    /*
        return () => {
          layout.cleanup()
        }
    */
  }, [layout])

  // used to determine when a dragged attribute is over the map component
  const dropId = `${instanceId}-component-drop-overlay`
  const {setNodeRef} = useDroppable({id: dropId})
  setNodeRef(mapRef.current ?? null)

  const {active} = useDndContext()
  const overlayDragId = active && `${active.id}`.startsWith(instanceId)
    ? `${active.id}` : undefined

  if (!mapContentModel) return null

  return (
    <InstanceIdContext.Provider value={instanceId}>
      <MapLayoutContext.Provider value={layout}>
        <MapContentModelContext.Provider value={mapContentModel}>
          <CodapMap mapController={mapController}
                    mapRef={mapRef}
                    dotsRef={dotsRef}
          />
          <AttributeDragOverlay activeDragId={overlayDragId}/>
        </MapContentModelContext.Provider>
      </MapLayoutContext.Provider>
    </InstanceIdContext.Provider>
  )
})
