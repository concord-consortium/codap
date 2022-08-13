import {format, select} from "d3"
import {observer} from "mobx-react-lite"
import React, {useContext, useEffect, useRef, useState} from "react"
import {useResizeDetector} from "react-resize-detector"
import {Axis} from "./axis"
import {Background} from "./background"
import {plotProps, defaultRadius} from "../graphing-types"
import {ScatterDots} from "./scatterdots"
import {DotPlotDots} from "./dotplotdots"
import {Marquee} from "./marquee"
import { MovableLineModel, MovableValueModel} from "../adornments/adornment-models"
import {MovableLine} from "../adornments/movable-line"
import {MovableValue} from "../adornments/movable-value"
import {NumericAxisModel} from "../models/axis-model"
import { GraphLayoutContext } from "../models/graph-layout"
import {DataBroker} from "../../../data-model/data-broker"
import {useGetData} from "../hooks/graph-hooks"
import {getScreenCoord} from "../utilities/graph_utils"
import { prf } from "../../../utilities/profiler"

import "./graph.scss"

interface IProps {
  broker?: DataBroker;
}

const float = format('.3~f'),
  movableLineModel = MovableLineModel.create({intercept: 0, slope: 1}),
  movableValueModel = MovableValueModel.create({value: 0}),
  xAxisModel = NumericAxisModel.create({place: 'bottom', min: 0, max: 10}),
  yAxisModel = NumericAxisModel.create({place: 'left', min: 0, max: 10})

export const Graph = observer(({broker}: IProps) => {
  return prf.measure("Graph.render", () => {
    const
      layout = useContext(GraphLayoutContext),
      { margin } = layout,
      x = layout.axisScale("bottom"),
      y = layout.axisScale("left"),
      [plotType, setPlotType] = useState<'scatterplot' | 'dotplot'>('scatterplot'),

      worldDataRef = useRef(broker?.last),
      {width, height, ref: plotRef} = useResizeDetector({refreshMode: "debounce", refreshRate: 200}),
      dotsProps: plotProps = {
        transform: `translate(${margin.left}, 0)`
      },

      keyFunc = (d: string) => d,
      svgRef = useRef<SVGSVGElement>(null),
      plotAreaSVGRef = useRef<SVGSVGElement>(null),
      dotsRef = useRef<SVGSVGElement>(null),
      [marqueeRect, setMarqueeRect] = useState({x: 0, y: 0, width: 0, height: 0})

    useEffect(() => {
      (width != null) && (height != null) && layout.setGraphExtent(width, height)
    }, [width, height, layout])

    worldDataRef.current = broker?.last
    const {xName, yName, data: graphData} = useGetData({broker, xAxis: xAxisModel, yAxis: yAxisModel})

    useEffect(function setupPlotArea() {
      select(plotAreaSVGRef.current)
        // .attr('transform', props.plotProps.transform)
        .attr('x', x.range()[0] + margin.left)
        .attr('y', 0)
        .attr('width', layout.plotWidth)
        .attr('height', layout.plotHeight)
    }, [layout.plotHeight, layout.plotWidth, margin.left, x])

    useEffect(function createCircles() {
      const xID = graphData.xAttributeID,
        yID = graphData.yAttributeID

      select(dotsRef.current).selectAll('circle').remove()

      select(dotsRef.current)
        .selectAll('circle')
        .data(graphData.cases, keyFunc)
        .join(
          // @ts-expect-error void => Selection
          (enter) => {
            enter.append('circle')
              .attr('class', 'graph-dot')
              .attr("r", defaultRadius)
              .property('id', (anID: string) => anID)
              .attr('cx', (anID: string) => getScreenCoord(worldDataRef.current, anID, xID, x))
              .attr('cy', (anID: string) => getScreenCoord(worldDataRef.current, anID, yID, y))
              .selection()
              .append('title')
              .text((anID: string) => {
                const xVal = worldDataRef.current?.getNumeric(anID, xID) ?? 0,
                  yVal = worldDataRef.current?.getNumeric(anID, yID) ?? 0
                return `(${float(xVal)}, ${float(yVal)}, id: ${anID})`
              })
          }
        )
    }, [graphData.cases, graphData.xAttributeID, graphData.yAttributeID, x, y])

    useEffect(function initMovables() {
      const xDomainDelta = x.domain()[1] - x.domain()[0],
        yDomainDelta = y.domain()[1] - y.domain()[0]
      movableLineModel.setLine({intercept: y.domain()[0] + yDomainDelta / 3, slope: yDomainDelta / xDomainDelta})
      movableValueModel.setValue(x.domain()[0] + xDomainDelta / 3)
    }, [x, y])

    return (
      <div className='graph-plot' ref={plotRef} data-testid="graph">
        <svg className='graph-svg' ref={svgRef}>
          {plotType === 'scatterplot' ?
            <Axis svgRef={svgRef}
                  axisProps={
                    {
                      model: yAxisModel,
                      transform: `translate(${margin.left - 1}, 0)`,
                      label: yName
                    }
                  }
            />
            : ''
          }
          <Axis svgRef={svgRef}
                axisProps={
                  {
                    model: xAxisModel,
                    transform: `translate(${margin.left}, ${layout.plotHeight})`,
                    label: xName
                  }
                }
          />
          <Background dots={dotsProps} worldDataRef={worldDataRef}
                      marquee={{rect: marqueeRect, setRect: setMarqueeRect}} />
          <svg ref={plotAreaSVGRef} className='graph-dot-area'>
            <svg ref={dotsRef}>
              {
                (plotType === 'scatterplot' ?
                  <ScatterDots
                    plotProps={dotsProps}
                    worldDataRef={worldDataRef}
                    graphData={graphData}
                    dotsRef={dotsRef}
                    xAxis={xAxisModel}
                    yAxis={yAxisModel}
                  />
                  :
                  <DotPlotDots
                    dots={dotsProps}
                    axisModel = {xAxisModel}
                    worldDataRef={worldDataRef}
                    graphData={graphData}
                    dotsRef={dotsRef}
                  />)
              }
            </svg>
            <Marquee marqueeRect={marqueeRect}/>
          </svg>
          {plotType === 'scatterplot' ?
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
        <button
          className='graph-plot-choice'
          onClick={() => {
            setPlotType((prevType) => prevType === 'scatterplot' ? 'dotplot' : 'scatterplot')
          }}
        >
          {plotType === 'scatterplot' ? 'Dot' : 'Scatter'} Plot
        </button>
      </div>
    )
  })
})

// (Graph as any).whyDidYouRender = {logOnDifferentValues: true, customName: 'Graph'}
