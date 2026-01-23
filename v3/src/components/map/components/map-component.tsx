import {useDroppable} from '@dnd-kit/core'
import {observer} from "mobx-react-lite"
import React, { useCallback, useRef } from "react"
import {InstanceIdContext, useNextInstanceId} from "../../../hooks/use-instance-id-context"
import {ITileBaseProps} from '../../tiles/tile-base-props'
import {DataDisplayLayoutContext} from "../../data-display/hooks/use-data-display-layout"
import {AttributeDragOverlay} from "../../drag-drop/attribute-drag-overlay"
import { DataDisplayRenderState } from "../../data-display/models/data-display-render-state"
import { PointRendererArrayContext, usePointRendererArray } from "../../data-display/renderer"
import {isMapContentModel} from "../models/map-content-model"
import {MapModelContext} from "../hooks/use-map-model-context"
import {useInitMapLayout} from "../hooks/use-init-map-layout"
import {CodapMap} from "./codap-map"

export const MapComponent = observer(function MapComponent({tile, isMinimized}: ITileBaseProps) {
  const mapModel = isMapContentModel(tile?.content) ? tile?.content : undefined

  const instanceId = useNextInstanceId("map")
  const layout = useInitMapLayout(mapModel)
  const mapRef = useRef<HTMLDivElement | null>(null)
  const { rendererArray, contextValue, primaryRendererType } = usePointRendererArray({
    baseId: tile?.id ?? instanceId,
    isMinimized,
    containerRef: mapRef
  })

  // used to determine when a dragged attribute is over the map component
  const dropId = `${instanceId}-component-drop-overlay`
  const {setNodeRef} = useDroppable({id: dropId})
  setNodeRef(mapRef.current ?? null)

  const setMapRef = useCallback((ref: HTMLDivElement | null) => {
    mapRef.current = ref
    const elementParent = ref?.parentElement
    const dataUri = mapModel?.renderState?.dataUri
    if (elementParent) {
      const renderState = new DataDisplayRenderState(rendererArray, elementParent, dataUri)
      mapModel?.setRenderState(renderState)
    }
  }, [mapModel, rendererArray])

  if (!mapModel) return null

  return (
    <InstanceIdContext.Provider value={instanceId}>
      <DataDisplayLayoutContext.Provider value={layout}>
        <MapModelContext.Provider value={mapModel}>
          <PointRendererArrayContext.Provider value={contextValue}>
            <CodapMap setMapRef={setMapRef} rendererArray={rendererArray} rendererType={primaryRendererType}/>
            <AttributeDragOverlay dragIdPrefix={instanceId}/>
          </PointRendererArrayContext.Provider>
        </MapModelContext.Provider>
      </DataDisplayLayoutContext.Provider>
    </InstanceIdContext.Provider>
  )
})
