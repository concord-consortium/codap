import { useDroppable } from '@dnd-kit/core'
import { observer } from "mobx-react-lite"
import React, { useCallback, useEffect, useRef } from "react"
import { useResizeDetector } from "react-resize-detector"
import { useMemo } from 'use-memo-one'
import { DEBUG_PIXI_POINTS } from '../../../lib/debug'
import { registerTileCollisionDetection } from "../../../lib/dnd-kit/dnd-detect-collision"
import { useDataSet } from '../../../hooks/use-data-set'
import { DataSetContext } from '../../../hooks/use-data-set-context'
import { InstanceIdContext, useNextInstanceId } from "../../../hooks/use-instance-id-context"
import { AxisProviderContext } from '../../axis/hooks/use-axis-provider-context'
import { AxisLayoutContext } from "../../axis/models/axis-layout-context"
import { kTitleBarHeight } from "../../constants"
import { usePixiPointsArray } from '../../data-display/hooks/use-pixi-points-array'
import { DataDisplayRenderState } from '../../data-display/models/data-display-render-state'
import { AttributeDragOverlay } from "../../drag-drop/attribute-drag-overlay"
import { ITileBaseProps } from '../../tiles/tile-base-props'
import { GraphContentModelContext } from '../hooks/use-graph-content-model-context'
import { useGraphController } from "../hooks/use-graph-controller"
import { GraphLayoutContext } from '../hooks/use-graph-layout-context'
import { useInitGraphLayout } from '../hooks/use-init-graph-layout'
import { GraphController } from "../models/graph-controller"
import { isGraphContentModel } from "../models/graph-content-model"
import { Graph } from "./graph"
import { graphCollisionDetection, kGraphIdBase } from './graph-drag-drop'

import "../register-adornment-types"

registerTileCollisionDetection(kGraphIdBase, graphCollisionDetection)

export const GraphComponent = observer(function GraphComponent({tile}: ITileBaseProps) {
  const graphModel = isGraphContentModel(tile?.content) ? tile?.content : undefined
  const instanceId = useNextInstanceId("graph")
  const {data} = useDataSet(graphModel?.dataset)
  const layout = useInitGraphLayout(graphModel)
  const graphRef = useRef<HTMLDivElement | null>(null)
  const {width, height} = useResizeDetector<HTMLDivElement>({targetRef: graphRef})
  const {pixiPointsArray} = usePixiPointsArray({ addInitialPixiPoints: true })
  const graphController = useMemo(
    () => new GraphController({layout, instanceId}),
    [layout, instanceId]
  )

  if (((window as any).Cypress || DEBUG_PIXI_POINTS) && tile?.id) {
    const pixiPointsMap: any = (window as any).pixiPointsMap  || ({} as Record<string, any>)
    ;(window as any).pixiPointsMap = pixiPointsMap
    pixiPointsMap[tile.id] = pixiPointsArray
  }

  useGraphController({graphController, graphModel, pixiPointsArray})

  const setGraphRef = useCallback((ref: HTMLDivElement | null) => {
    graphRef.current = ref
    const elementParent = ref?.parentElement
    const dataUri = graphModel?.renderState?.dataUri
    if (elementParent) {
      const renderState = new DataDisplayRenderState(pixiPointsArray, elementParent, dataUri)
      graphModel?.setRenderState(renderState)
    }
  }, [graphModel, pixiPointsArray])

  useEffect(() => {
    (width != null) && width >= 0 && (height != null) &&
      height >= kTitleBarHeight && layout.setTileExtent(width, height)
  }, [width, height, layout])

  useEffect(function cleanup() {
    return () => {
      layout.cleanup()
    }
  }, [layout])

  // used to determine when a dragged attribute is over the graph component
  const dropId = `${instanceId}-component-drop-overlay`
  const {setNodeRef} = useDroppable({id: dropId})
  setNodeRef(graphRef.current ?? null)

  if (!graphModel) return null

  return (
    <DataSetContext.Provider value={data}>
      <InstanceIdContext.Provider value={instanceId}>
        <GraphLayoutContext.Provider value={layout}>
          <AxisLayoutContext.Provider value={layout}>
            <GraphContentModelContext.Provider value={graphModel}>
              <AxisProviderContext.Provider value={graphModel}>
                <Graph
                  graphController={graphController}
                  setGraphRef={setGraphRef}
                  pixiPointsArray={pixiPointsArray}
                />
              </AxisProviderContext.Provider>
              <AttributeDragOverlay dragIdPrefix={instanceId}/>
            </GraphContentModelContext.Provider>
          </AxisLayoutContext.Provider>
        </GraphLayoutContext.Provider>
      </InstanceIdContext.Provider>
    </DataSetContext.Provider>
  )
})
