import {useDroppable} from '@dnd-kit/core'
import {observer} from "mobx-react-lite"
import React, {useEffect, useMemo, useRef, useState} from "react"
import {useResizeDetector} from "react-resize-detector"
import {InstanceIdContext, useNextInstanceId} from "../../../hooks/use-instance-id-context"
import {kTitleBarHeight} from "../graphing-types"
import {AxisLayoutContext} from "../../axis/models/axis-layout-context"
import {GraphLayout, GraphLayoutContext} from "../models/graph-layout"
import {GraphModelContext, isGraphModel} from "../models/graph-model"
import {Graph} from "./graph"
import {ITileBaseProps} from '../../tiles/tile-base-props'

export const GraphComponent = observer(({ tile }: ITileBaseProps) => {
  const graphModel = tile?.content
  if (!isGraphModel(graphModel)) return null

  const instanceId = useNextInstanceId("graph")
  const layout = useMemo(() => new GraphLayout(), [])
  const {width, height, ref: graphRef} = useResizeDetector({refreshMode: "debounce", refreshRate: 10})
  const enableAnimation = useRef(true)
  const dotsRef = useRef<SVGSVGElement>(null)
  const [showInspector, setShowInspector] = useState(false)

  useEffect(() => {
    (width != null) && (height != null) && layout.setParentExtent(width, height - kTitleBarHeight)
  }, [width, height, layout])

  // used to determine when a dragged attribute is over the graph component
  const dropId = `${instanceId}-component-drop-overlay`
  const {setNodeRef} = useDroppable({id: dropId})
  setNodeRef(graphRef.current)

  return (
    <InstanceIdContext.Provider value={instanceId}>
      <GraphLayoutContext.Provider value={layout}>
        <AxisLayoutContext.Provider value={layout}>
          <GraphModelContext.Provider value={graphModel}>
            <Graph graphRef={graphRef}
                  enableAnimation={enableAnimation}
                  dotsRef={dotsRef}
                  showInspector={showInspector}
                  setShowInspector={setShowInspector}
            />
          </GraphModelContext.Provider>
        </AxisLayoutContext.Provider>
      </GraphLayoutContext.Provider>
    </InstanceIdContext.Provider>
  )
})
