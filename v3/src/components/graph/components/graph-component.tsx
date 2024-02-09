import {useDndContext, useDroppable} from '@dnd-kit/core'
import {observer} from "mobx-react-lite"
import React, {useEffect, useMemo, useRef} from "react"
import {useResizeDetector} from "react-resize-detector"
import {ITileBaseProps} from '../../tiles/tile-base-props'
import {useDataSet} from '../../../hooks/use-data-set'
import {DataSetContext} from '../../../hooks/use-data-set-context'
import {GraphContentModelContext} from '../hooks/use-graph-content-model-context'
import {useGraphController} from "../hooks/use-graph-controller"
import {GraphLayoutContext} from '../hooks/use-graph-layout-context'
import {useInitGraphLayout} from '../hooks/use-init-graph-layout'
import {InstanceIdContext, useNextInstanceId} from "../../../hooks/use-instance-id-context"
import {AxisProviderContext} from '../../axis/hooks/use-axis-provider-context'
import {AxisLayoutContext} from "../../axis/models/axis-layout-context"
import {GraphController} from "../models/graph-controller"
import {isGraphContentModel} from "../models/graph-content-model"
import {Graph} from "./graph"
import {AttributeDragOverlay} from "../../drag-drop/attribute-drag-overlay"
import {PixiPoints} from "../utilities/pixi-points"
import "../register-adornment-types"

export const GraphComponent = observer(function GraphComponent({ tile }: ITileBaseProps) {
  const graphModel = isGraphContentModel(tile?.content) ? tile?.content : undefined

  const instanceId = useNextInstanceId("graph")
  const { data } = useDataSet(graphModel?.dataset)
  const layout = useInitGraphLayout(graphModel)
  // Removed debouncing, but we can bring it back if we find we need it
  const graphRef = useRef<HTMLDivElement | null>(null)
  const { width, height } = useResizeDetector<HTMLDivElement>({ targetRef: graphRef })
  const pixiPointsRef = useRef<PixiPoints>()
  // TODO PIXI: PJ: probably should be fixed and become a ref, as memoization is meant for performance optimization
  // and it's not guaranteed to be maintained across renders.
  const graphController = useMemo(
    () => new GraphController({ layout, instanceId }),
    [layout, instanceId]
  )

  useEffect(() => {
    pixiPointsRef.current = new PixiPoints()
    return () => pixiPointsRef.current?.dispose()
  }, [])

  useGraphController({ graphController, graphModel, pixiPointsRef })

  useEffect(() => {
    (width != null) && (height != null) && layout.setTileExtent(width, height)
  }, [width, height, layout])

  useEffect(function cleanup() {
    return () => {
      layout.cleanup()
    }
  }, [layout])

  // used to determine when a dragged attribute is over the graph component
  const dropId = `${instanceId}-component-drop-overlay`
  const { setNodeRef } = useDroppable({ id: dropId })
  setNodeRef(graphRef.current ?? null)

  const { active } = useDndContext()
  const overlayDragId = active && `${active.id}`.startsWith(instanceId)
    ? `${active.id}` : undefined

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
                  graphRef={graphRef}
                  pixiPointsRef={pixiPointsRef}
                />
              </AxisProviderContext.Provider>
              <AttributeDragOverlay activeDragId={overlayDragId} />
            </GraphContentModelContext.Provider>
          </AxisLayoutContext.Provider>
        </GraphLayoutContext.Provider>
      </InstanceIdContext.Provider>
    </DataSetContext.Provider>
  )
})
