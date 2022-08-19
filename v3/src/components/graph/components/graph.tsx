import { useToast } from "@chakra-ui/react"
import {format, select} from "d3"
import {observer} from "mobx-react-lite"
import React, {MutableRefObject, useEffect, useRef, useState} from "react"
import {Axis} from "./axis"
import {Background} from "./background"
import {plotProps, defaultRadius} from "../graphing-types"
import {ScatterDots} from "./scatterdots"
import {DotPlotDots} from "./dotplotdots"
import {Marquee} from "./marquee"
import {MovableLine} from "../adornments/movable-line"
import {MovableValue} from "../adornments/movable-value"
import { AxisPlace, INumericAxisModel } from "../models/axis-model"
import { useGraphLayoutContext } from "../models/graph-layout"
import { IGraphModel } from "../models/graph-model"
import {useGetData} from "../hooks/graph-hooks"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { useInstanceIdContext } from "../../../hooks/use-instance-id-context"
import {getScreenCoord} from "../utilities/graph_utils"
import { prf } from "../../../utilities/profiler"

import "./graph.scss"

interface IProps {
  model: IGraphModel
  graphRef: MutableRefObject<HTMLDivElement>
}

const float = format('.3~f')

export const Graph = observer(({ model: graphModel, graphRef }: IProps) => {
  return prf.measure("Graph.render", () => {
    const
      xAxisModel = graphModel.getAxis("bottom") as INumericAxisModel,
      yAxisModel = graphModel.getAxis("left") as INumericAxisModel,
      { plotType, movableLine: movableLineModel, movableValue: movableValueModel } = graphModel,
      instanceId = useInstanceIdContext(),
      dataset = useDataSetContext(),
      layout = useGraphLayoutContext(),
      { margin } = layout,
      xScale = layout.axisScale("bottom"),
      yScale = layout.axisScale("left"),

      dotsProps: plotProps = {
        transform: `translate(${margin.left}, 0)`
      },

      keyFunc = (d: string) => d,
      svgRef = useRef<SVGSVGElement>(null),
      plotAreaSVGRef = useRef<SVGSVGElement>(null),
      dotsRef = useRef<SVGSVGElement>(null),
      [marqueeRect, setMarqueeRect] = useState({x: 0, y: 0, width: 0, height: 0})

    const {xName, yName, data: graphData} = useGetData({xAxis: xAxisModel, yAxis: yAxisModel})

    useEffect(function setupPlotArea() {
      select(plotAreaSVGRef.current)
        // .attr('transform', props.plotProps.transform)
        .attr('x', xScale.range()[0] + margin.left)
        .attr('y', 0)
        .attr('width', layout.plotWidth)
        .attr('height', layout.plotHeight)
    }, [layout.plotHeight, layout.plotWidth, margin.left, xScale])

    useEffect(function createCircles() {
      const { xAttributeID: xID, yAttributeID: yID, cases } = graphData

      select(dotsRef.current).selectAll('circle').remove()

      select(dotsRef.current)
        .selectAll('circle')
        .data(cases, keyFunc)
        .join(
          // @ts-expect-error void => Selection
          (enter) => {
            enter.append('circle')
              .attr('class', 'graph-dot')
              .attr("r", defaultRadius)
              .property('id', (anID: string) => `${instanceId}_${anID}`)
              .attr('cx', (anID: string) => getScreenCoord(dataset, anID, xID, xScale))
              .attr('cy', (anID: string) => getScreenCoord(dataset, anID, yID, yScale))
              .selection()
              .append('title')
              .text((anID: string) => {
                const xVal = dataset?.getNumeric(anID, xID) ?? 0,
                  yVal = dataset?.getNumeric(anID, yID) ?? 0
                return `(${float(xVal)}, ${float(yVal)}, id: ${anID})`
              })
          }
        )
    }, [dataset, graphData, instanceId, xScale, yScale])

    useEffect(function initMovables() {
      const xDomainDelta = xScale.domain()[1] - xScale.domain()[0],
        yDomainDelta = yScale.domain()[1] - yScale.domain()[0]
      movableLineModel.setLine({intercept: yScale.domain()[0] + yDomainDelta / 3, slope: yDomainDelta / xDomainDelta})
      movableValueModel.setValue(xScale.domain()[0] + xDomainDelta / 3)
    }, [movableLineModel, movableValueModel, xScale, yScale, graphData.xAttributeID, graphData.yAttributeID])

    const toast = useToast()
    const handleDropAttribute = (place: AxisPlace, attrId: string) => {
      const attrName = dataset?.attrFromID(attrId)?.name
      toast({
        position: "top",
        title: "Attribute dropped",
        description: `The attribute ${attrName || attrId} was dropped on the ${place} axis!`,
        status: "success"
      })
    }

    return (
      <div className='graph-plot' ref={graphRef} data-testid="graph">
        <svg className='graph-svg' ref={svgRef}>
          {plotType === 'scatterPlot' ?
            <Axis model={yAxisModel} label={yName}
                  transform={`translate(${margin.left - 1}, 0)`}
                  onDropAttribute={handleDropAttribute}
            />
            : null
          }
          <Axis model={xAxisModel} label={xName}
                transform={`translate(${margin.left}, ${layout.plotHeight})`}
                onDropAttribute={handleDropAttribute}
          />
          <Background dots={dotsProps} marquee={{rect: marqueeRect, setRect: setMarqueeRect}} />
          <svg ref={plotAreaSVGRef} className='graph-dot-area'>
            <svg ref={dotsRef}>
              {
                (plotType === 'scatterPlot' ?
                  <ScatterDots
                    plotProps={dotsProps}
                    graphData={graphData}
                    dotsRef={dotsRef}
                    xAxis={xAxisModel}
                    yAxis={yAxisModel}
                  />
                  :
                  <DotPlotDots
                    dots={dotsProps}
                    axisModel = {xAxisModel}
                    graphData={graphData}
                    dotsRef={dotsRef}
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
              model={movableLineModel} />
            :
            <MovableValue model={movableValueModel}
                          axis={xAxisModel}
                          transform={`translate(${margin.left}, 0)`} />
          }
        </svg>
      </div>
    )
  })
})

// (Graph as any).whyDidYouRender = {logOnDifferentValues: true, customName: 'Graph'}
