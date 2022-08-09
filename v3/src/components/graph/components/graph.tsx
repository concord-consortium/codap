import {format, scaleLinear, select} from "d3"
import {observer} from "mobx-react-lite"
import React, {useEffect, useRef, useState} from "react"
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
import {DataBroker} from "../../../data-model/data-broker"
import {useGetData} from "../hooks/graph-hooks"
import {useCurrent} from "../../../hooks/use-current"
import {getScreenCoord} from "../utilities/graph_utils"
import { prf } from "../../../utilities/profiler"

import "./graph.scss"

interface IProps {
  broker?: DataBroker;
}

const margin = ({top: 10, right: 30, bottom: 30, left: 60}),
  x = scaleLinear().domain([0, 10]),
  y = scaleLinear().domain([0, 10]),
  float = format('.1f'),
  dotsProps: plotProps = {
    xScale: x,
    yScale: y,
    transform: `translate(${margin.left}, 0)`
  },
  movableLineModel = MovableLineModel.create({intercept: 0, slope: 1}),
  movableValueModel = MovableValueModel.create({value: 0})

export const Graph = observer(({broker}: IProps) => {
  return prf.measure("Graph.render", () => {
    const
      worldDataRef = useRef(broker?.last),
      {width, height, ref: plotRef} = useResizeDetector({refreshMode: "debounce", refreshRate: 200}),
      plotWidth = 0.8 * (width || 300),
      plotWidthRef = useCurrent(plotWidth),
      plotHeight = 0.8 * (height || 500),
      plotHeightRef = useCurrent(plotHeight),
      [movableLine, setMovableLine] = useState({slope: 1, intercept: 0}),
      [movableValue, setMovableValue] = useState(2),
      [plotType, setPlotType] = useState<'scatterplot' | 'dotplot'>('scatterplot'),
      [counter, setCounter] = useState(0),
      [, setHighlightCounter] = useState(0),

      keyFunc = (d: string) => d,
      svgRef = useRef<SVGSVGElement>(null),
      plotAreaSVGRef = useRef<SVGSVGElement>(null),
      dotsRef = useRef<SVGSVGElement>(null),
      [marqueeRect, setMarqueeRect] = useState({x: 0, y: 0, width: 0, height: 0})

    x.range([0, plotWidthRef.current])
    y.range([plotHeightRef.current, 0])

    worldDataRef.current = broker?.last
    const {xName, yName, data: graphData} = useGetData({ broker, xAxis: x, yAxis: y, setCounter })

    // todo: This is a kludge. Find a better way. Without this, the y-axis doesn't update label and drag rects
    useEffect(() => {
      setTimeout(() => setCounter(count => ++count))
    }, [plotType])

    useEffect(function setupPlotArea() {
      select(plotAreaSVGRef.current)
        // .attr('transform', props.plotProps.transform)
        .attr('x', x.range()[0] + 60)
        .attr('y', 0)
        .attr('width', plotWidth)
      // .attr('height', plotHeightRef)
    }, [plotWidth])

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
    }, [graphData.cases, graphData.xAttributeID, graphData.yAttributeID])

    useEffect(function initMovables() {
      const xDomainDelta = x.domain()[1] - x.domain()[0],
        yDomainDelta = y.domain()[1] - y.domain()[0]
      setMovableValue(x.domain()[0] + xDomainDelta / 3)
      setMovableLine({intercept: y.domain()[0] + yDomainDelta / 3, slope: yDomainDelta / xDomainDelta})
    }, [])

    return (
      <div className='graph-plot' ref={plotRef} data-testid="graph">
        <svg className='graph-svg' ref={svgRef}>
          {plotType === 'scatterplot' ?
            <Axis svgRef={svgRef}
                  axisProps={
                    {
                      orientation: 'left',
                      scaleLinear: y,
                      transform: `translate(${margin.left - 1}, 0)`,
                      length: plotHeightRef.current,
                      label: yName,
                      counter,
                      setCounter
                    }
                  }
            />
            : ''
          }
          <Axis svgRef={svgRef}
                axisProps={
                  {
                    orientation: 'bottom',
                    scaleLinear: x,
                    transform: `translate(${margin.left}, ${plotHeightRef.current})`,
                    length: plotWidth,
                    label: xName,
                    counter,
                    setCounter
                  }
                }
          />
          <Background dots={dotsProps} worldDataRef={worldDataRef}
                      marquee={{rect: marqueeRect, setRect: setMarqueeRect}}
                      setHighlightCounter={setHighlightCounter}/>
          <svg ref={plotAreaSVGRef} className='graph-dot-area'>
            <svg ref={dotsRef}>
              {
                (plotType === 'scatterplot' ?
                  <ScatterDots
                    plotProps={dotsProps}
                    xMin={x.domain()[0]}
                    xMax={x.domain()[1]}
                    yMin={y.domain()[1]}
                    yMax={y.domain()[0]}
                    plotWidth={x.range()[1] - x.range()[0]}
                    plotHeight={y.range()[0] - y.range()[1]}
                    worldDataRef={worldDataRef}
                    graphData={graphData}
                    dotsRef={dotsRef}
                  />
                  :
                  <DotPlotDots
                    dots={dotsProps}
                    xMin={x.domain()[0]}
                    xMax={x.domain()[1]}
                    plotWidth={x.range()[1] - x.range()[0]}
                    plotHeight={y.range()[0] - y.range()[1]}
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
              line={movableLine}
              setLine={setMovableLine}
              xScale={x}
              yScale={y}/>
            :
            <MovableValue transform={`translate(${margin.left}, 0)`}
                          value={movableValue}
                          setValue={setMovableValue}
                          xScale={x}
                          yScale={y}/>
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
