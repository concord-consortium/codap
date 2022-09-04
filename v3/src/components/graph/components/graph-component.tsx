import {Button} from '@chakra-ui/react'
import { useDroppable } from '@dnd-kit/core'
import {observer} from "mobx-react-lite"
import React, {useEffect, useRef} from "react"
import {useResizeDetector} from "react-resize-detector"
import {useMemo} from "use-memo-one"
import {DataBroker} from "../../../data-model/data-broker"
import {DataSetContext} from "../../../hooks/use-data-set-context"
import {InstanceIdContext, useNextInstanceId} from "../../../hooks/use-instance-id-context"
import {MovableLineModel, MovableValueModel} from "../adornments/adornment-models"
import {NumericAxisModel} from "../models/axis-model"
import {GraphLayout, GraphLayoutContext} from "../models/graph-layout"
import {GraphModel} from "../models/graph-model"
import {Graph} from "./graph"

const defaultGraphModel = GraphModel.create({
  axes: {
    bottom: NumericAxisModel.create({place: 'bottom', min: 0, max: 10}),
    left: NumericAxisModel.create({place: 'left', min: 0, max: 10})
  },
  plotType: "scatterPlot",
  movableValue: MovableValueModel.create({value: 0}),
  movableLine: MovableLineModel.create({intercept: 0, slope: 1})
})

interface IProps {
  broker?: DataBroker;
}

export const GraphComponent = observer(({broker}: IProps) => {
  const instanceId = useNextInstanceId("graph")
  const layout = useMemo(() => new GraphLayout(), [])
  const {width, height, ref: graphRef} = useResizeDetector({refreshMode: "debounce", refreshRate: 200})
  const animationIsOn = useRef(true)
  const data = broker?.selectedDataSet || broker?.last

  useEffect(() => {
    (width != null) && (height != null) && layout.setGraphExtent(width, height)
  }, [width, height, layout])

  // used to determine when a dragged attribute is over the graph component
  const { setNodeRef } = useDroppable({ id: `${instanceId}-component-drop`, data: { accepts: ["attribute"] } })
  setNodeRef(graphRef.current)

  return (
    <DataSetContext.Provider value={data}>
      <InstanceIdContext.Provider value={instanceId}>
        <GraphLayoutContext.Provider value={layout}>
          <Graph model={defaultGraphModel} graphRef={graphRef} animationIsOn={animationIsOn}/>
          <Button
            className='graph-plot-choice'
            size="xs"
            onClick={() => {
              const currPlotType = defaultGraphModel.plotType
              animationIsOn.current = true
              defaultGraphModel.setPlotType(currPlotType === 'scatterPlot' ? 'dotPlot' : 'scatterPlot')
            }}
          >
            {defaultGraphModel.plotType === 'scatterPlot' ? 'Dot' : 'Scatter'} Plot
          </Button>
        </GraphLayoutContext.Provider>
      </InstanceIdContext.Provider>
    </DataSetContext.Provider>
  )
})
