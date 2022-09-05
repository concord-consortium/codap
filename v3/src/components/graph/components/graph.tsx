import {useToast} from "@chakra-ui/react"
import {select} from "d3"
import {observer} from "mobx-react-lite"
import React, {MutableRefObject, useCallback, useEffect, useRef, useState} from "react"
import {Axis} from "./axis"
import {Background} from "./background"
import {kGraphClass} from "../graphing-types"
import {ScatterDots} from "./scatterdots"
import {DotPlotDots} from "./dotplotdots"
import {Marquee} from "./marquee"
import {MovableLine} from "../adornments/movable-line"
import {MovableValue} from "../adornments/movable-value"
import {AxisPlace, INumericAxisModel} from "../models/axis-model"
import {useGraphLayoutContext} from "../models/graph-layout"
import {IGraphModel} from "../models/graph-model"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {pullOutNumericAttributesInNewDataset} from "../utilities/graph_utils"
import {useGraphModel} from "../hooks/use-graph-model"
import {useMovables} from "../hooks/use-movables"

import "./graph.scss"

interface IProps {
  model: IGraphModel
  graphRef: MutableRefObject<HTMLDivElement>
  enableAnimation: MutableRefObject<boolean>
}

export const Graph = observer(({model: graphModel, graphRef, enableAnimation}: IProps) => {
  const
    casesRef = useRef(graphModel.cases),
    xAxisModel = graphModel.getAxis("bottom") as INumericAxisModel,
    yAxisModel = graphModel.getAxis("left") as INumericAxisModel,
    {plotType, movableLine: movableLineModel, movableValue: movableValueModel} = graphModel,
    instanceId = useInstanceIdContext(),
    dataset = useDataSetContext(),
    layout = useGraphLayoutContext(),
    {margin} = layout,
    xScale = layout.axisScale("bottom"),
    transform = `translate(${margin.left}, 0)`,

    keyFunc = useCallback((d: string) => d, []),
    svgRef = useRef<SVGSVGElement>(null),
    plotAreaSVGRef = useRef<SVGSVGElement>(null),
    dotsRef = useRef<SVGSVGElement>(null),
    [marqueeRect, setMarqueeRect] = useState({x: 0, y: 0, width: 0, height: 0})

  useEffect(function makeUseOfDataset() {
    if (dataset) {
      pullOutNumericAttributesInNewDataset({dataset, layout, xAxis: xAxisModel, yAxis: yAxisModel, graphModel})
      casesRef.current = graphModel.cases
    }
  }, [dataset, layout, xAxisModel, yAxisModel, graphModel])

  const
    xAttrID = graphModel.getAttributeID('bottom'),
    yAttrID = graphModel.getAttributeID('left')

  casesRef.current = graphModel.cases

  useGraphModel({dotsRef, casesRef, graphModel, enableAnimation, keyFunc, instanceId})

  useEffect(function setupPlotArea() {
    select(plotAreaSVGRef.current)
      .attr('x', xScale.range()[0] + margin.left)
      .attr('y', 0)
      .attr('width', layout.plotWidth)
      .attr('height', layout.plotHeight)
  }, [layout.plotHeight, layout.plotWidth, margin.left, xScale])

  useMovables({graphModel, movableValueModel, movableLineModel})

  const toast = useToast()
  const handleDropAttribute = (place: AxisPlace, attrId: string) => {
    const attrName = dataset?.attrFromID(attrId)?.name
    toast({
      position: "top-right",
      title: "Attribute dropped",
      description: `The attribute ${attrName || attrId} was dropped on the ${place} axis!`,
      status: "success"
    })
    graphModel.setAttributeID(place, attrId)
  }

  return (
    <div className={kGraphClass} ref={graphRef} data-testid="graph">
      <svg className='graph-svg' ref={svgRef}>
        {plotType === 'scatterPlot' ?
          <Axis model={yAxisModel} attributeID={yAttrID}
                transform={`translate(${margin.left - 1}, 0)`}
                onDropAttribute={handleDropAttribute}
          />
          : null
        }
        <Axis model={xAxisModel} attributeID={xAttrID}
              transform={`translate(${margin.left}, ${layout.plotHeight})`}
              onDropAttribute={handleDropAttribute}
        />
        <Background transform={transform} marquee={{rect: marqueeRect, setRect: setMarqueeRect}}/>
        <svg ref={plotAreaSVGRef} className='graph-dot-area'>
          <svg ref={dotsRef}>
            {
              (plotType === 'scatterPlot' ?
                <ScatterDots
                  casesRef={casesRef}
                  xAttrID={xAttrID}
                  yAttrID={yAttrID}
                  dotsRef={dotsRef}
                  xAxisModel={xAxisModel}
                  yAxisModel={yAxisModel}
                  enableAnimation={enableAnimation}
                />
                :
                <DotPlotDots
                  casesRef={casesRef}
                  axisModel={xAxisModel}
                  xAttrID={xAttrID}
                  dotsRef={dotsRef}
                  enableAnimation={enableAnimation}
                />)
            }
          </svg>
          <Marquee marqueeRect={marqueeRect}/>
        </svg>
        {plotType === 'scatterPlot' ?
          <MovableLine
            transform={`translate(${margin.left}, 0)`}
            xAxis={xAxisModel}
            yAxis={yAxisModel}
            model={movableLineModel}/>
          :
          <MovableValue model={movableValueModel}
                        axis={xAxisModel}
                        transform={`translate(${margin.left}, 0)`}/>
        }
      </svg>
    </div>
  )
})

// (Graph as any).whyDidYouRender = {logOnDifferentValues: true, customName: 'Graph'}
