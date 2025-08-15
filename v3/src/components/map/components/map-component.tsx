import {useDroppable} from '@dnd-kit/core'
import {observer} from "mobx-react-lite"
import React, {useCallback, useRef} from "react"
import {OnResizeCallback, useResizeDetector} from "react-resize-detector"
import {InstanceIdContext, useNextInstanceId} from "../../../hooks/use-instance-id-context"
import {ITileBaseProps} from '../../tiles/tile-base-props'
import {DataDisplayLayoutContext} from "../../data-display/hooks/use-data-display-layout"
import {AttributeDragOverlay} from "../../drag-drop/attribute-drag-overlay"
import {isMapContentModel} from "../models/map-content-model"
import {MapModelContext} from "../hooks/use-map-model-context"
import {useInitMapLayout} from "../hooks/use-init-map-layout"
import {CodapMap} from "./codap-map"

export const MapComponent = observer(function MapComponent({tile}: ITileBaseProps) {
  const mapModel = isMapContentModel(tile?.content) ? tile?.content : undefined

  const instanceId = useNextInstanceId("map")
  const layout = useInitMapLayout(mapModel)
  const mapRef = useRef<HTMLDivElement | null>(null)

  // NOTE: on a tile that is animating into place, width and height will start at 0
  const onResize: OnResizeCallback = useCallback((payload) => {
    const {width, height} = payload
    ;(width != null) && (height != null) && layout.setTileExtent(width, height)
  }, [layout])

  // Even though this just uses a resize callback it will still trigger a re-render
  // when the size changes
  useResizeDetector<HTMLDivElement>({targetRef: mapRef, onResize})

  // used to determine when a dragged attribute is over the map component
  const dropId = `${instanceId}-component-drop-overlay`
  const {setNodeRef} = useDroppable({id: dropId})
  setNodeRef(mapRef.current ?? null)

  if (!mapModel) return null

  return (
    <InstanceIdContext.Provider value={instanceId}>
      <DataDisplayLayoutContext.Provider value={layout}>
        <MapModelContext.Provider value={mapModel}>
          <CodapMap mapRef={mapRef}/>
          <AttributeDragOverlay dragIdPrefix={instanceId}/>
        </MapModelContext.Provider>
      </DataDisplayLayoutContext.Provider>
    </InstanceIdContext.Provider>
  )
})
