import {useDroppable} from '@dnd-kit/core'
import {observer} from "mobx-react-lite"
import React, {useEffect, useRef} from "react"
import {useResizeDetector} from "react-resize-detector"
import {useMemo} from "use-memo-one"
import {DataBroker} from "../../../data-model/data-broker"
import {DataSetContext} from "../../../hooks/use-data-set-context"
import {InstanceIdContext, useNextInstanceId} from "../../../hooks/use-instance-id-context"
import {EmptyAxisModel} from "../models/axis-model"
import {GraphLayout, GraphLayoutContext} from "../models/graph-layout"
import {GraphModel} from "../models/graph-model"
import {GraphController} from "../models/graph-controller"
import {Graph} from "./graph"

const defaultGraphModel = GraphModel.create({
  axes: {
    bottom: EmptyAxisModel.create({place: 'bottom'}),
    left: EmptyAxisModel.create({place: 'left'})
  },
  plotType: "casePlot",
})

interface IProps {
  broker?: DataBroker;
}

export const GraphComponent = observer(({broker}: IProps) => {
  const instanceId = useNextInstanceId("graph")
  const layout = useMemo(() => new GraphLayout(), [])
  const {width, height, ref: graphRef} = useResizeDetector({refreshMode: "debounce", refreshRate: 200})
  const enableAnimation = useRef(true)
  const dataset = broker?.selectedDataSet || broker?.last
  const casesRef = useRef<string[]>([])
  const dotsRef = useRef<SVGSVGElement>(null)

  const
    graphController = useMemo(
      () => new GraphController({
        graphModel: defaultGraphModel,
        dataset, layout, casesRef, enableAnimation, instanceId, dotsRef
      }),
      [dataset, layout, casesRef, instanceId])

  useEffect(() => {
    (width != null) && (height != null) && layout.setGraphExtent(width, height)
  }, [width, height, layout])

  // used to determine when a dragged attribute is over the graph component
  const {setNodeRef} = useDroppable({id: `${instanceId}-component-drop`, data: {accepts: ["attribute"]}})
  setNodeRef(graphRef.current)

  return (
    <DataSetContext.Provider value={dataset}>
      <InstanceIdContext.Provider value={instanceId}>
        <GraphLayoutContext.Provider value={layout}>
          <Graph model={defaultGraphModel}
                 graphController={graphController}
                 graphRef={graphRef}
                 enableAnimation={enableAnimation}
                 dotsRef={dotsRef}
          />
        </GraphLayoutContext.Provider>
      </InstanceIdContext.Provider>
    </DataSetContext.Provider>
  )
})
