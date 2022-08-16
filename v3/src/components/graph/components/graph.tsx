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
import { INumericAxisModel } from "../models/axis-model"
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
      { movableLine: movableLineModel, movableValue: movableValueModel } = graphModel,
      instanceId = useInstanceIdContext(),
      dataset = useDataSetContext(),
      layout = useGraphLayoutContext(),
      { margin } = layout,
      x = layout.axisScale("bottom"),
      y = layout.axisScale("left"),
      [plotType, setPlotType] = useState<'scatterplot' | 'dotplot'>('scatterplot'),

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
        .attr('x', x.range()[0] + margin.left)
        .attr('y', 0)
        .attr('width', layout.plotWidth)
        .attr('height', layout.plotHeight)
    }, [layout.plotHeight, layout.plotWidth, margin.left, x])

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
              .attr('cx', (anID: string) => getScreenCoord(dataset, anID, xID, x))
              .attr('cy', (anID: string) => getScreenCoord(dataset, anID, yID, y))
              .selection()
              .append('title')
              .text((anID: string) => {
                const xVal = dataset?.getNumeric(anID, xID) ?? 0,
                  yVal = dataset?.getNumeric(anID, yID) ?? 0
                return `(${float(xVal)}, ${float(yVal)}, id: ${anID})`
              })
          }
        )
    }, [dataset, graphData, instanceId, x, y])

    useEffect(function initMovables() {
      const xDomainDelta = x.domain()[1] - x.domain()[0],
        yDomainDelta = y.domain()[1] - y.domain()[0]
      movableLineModel.setLine({intercept: y.domain()[0] + yDomainDelta / 3, slope: yDomainDelta / xDomainDelta})
      movableValueModel.setValue(x.domain()[0] + xDomainDelta / 3)
    }, [movableLineModel, movableValueModel, x, y])

    return (
      <div className='graph-plot' ref={graphRef} data-testid="graph">
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
          <Background dots={dotsProps} marquee={{rect: marqueeRect, setRect: setMarqueeRect}} />
          <svg ref={plotAreaSVGRef} className='graph-dot-area'>
            <svg ref={dotsRef}>
              {
                (plotType === 'scatterplot' ?
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
