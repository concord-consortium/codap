import {useDroppable} from '@dnd-kit/core'
import {observer} from "mobx-react-lite"
import {getSnapshot} from "mobx-state-tree"
import React, {useEffect, useMemo, useRef, useState} from "react"
import {useResizeDetector} from "react-resize-detector"
import {InstanceIdContext, useNextInstanceId} from "../../../hooks/use-instance-id-context"
import {kTitleBarHeight} from "../graphing-types"
import {AxisLayoutContext} from "../../axis/models/axis-layout-context"
import {EmptyAxisModel} from "../../axis/models/axis-model"
import {DataConfigurationModel} from "../models/data-configuration-model"
import {GraphLayout, GraphLayoutContext} from "../models/graph-layout"
import {GraphModel, GraphModelContext} from "../models/graph-model"
import {Graph} from "./graph"
import {ITileBaseProps} from '../../tiles/tile-base-props'
import {defaultBackgroundColor, defaultPointColor, defaultStrokeColor} from "../../../utilities/color-utils"

const defaultGraphModel = GraphModel.create({
  isTransparent: false,
  plotBackgroundColor: defaultBackgroundColor,
  plotBackgroundImageID: '',
  plotBackgroundLockInfo: undefined,
  pointColor: defaultPointColor,
  pointSizeMultiplier: 1,
  _pointStrokeColor: defaultStrokeColor,
  pointStrokeSameAsFill: false,
  showMeasuresForSelection: false,
  showParentToggles: false,
  axes: {
    bottom: EmptyAxisModel.create({place: 'bottom'}),
    left: EmptyAxisModel.create({place: 'left'})
  },
  plotType: "casePlot",
  config: getSnapshot(DataConfigurationModel.create())
})

interface IProps extends ITileBaseProps {
}

export const GraphComponent = observer((props: IProps) => {
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
          <GraphModelContext.Provider value={defaultGraphModel}>
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
