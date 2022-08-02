import {format, scaleLinear, select} from "d3"
import {observer} from "mobx-react-lite"
import React, {useEffect, useRef, useState} from "react"
import {useResizeDetector} from "react-resize-detector"
import {Axis} from "./axis"
import {Background} from "./background"
import {plotProps, InternalizedData} from "./graphing-types"
import {ScatterDots} from "./scatterdots"
import {DotPlotDots} from "./dotplotdots"
import {Marquee} from "./marquee"
import {MovableLine} from "./movable-line"
import {MovableValue} from "./movable-value"
import {DataBroker} from "../../data-model/data-broker"
import {useGetData} from "./graph-hooks/graph-hooks"
import {useCurrent} from "../../hooks/use-current"
import {getScreenCoord} from "./graph-utils/graph_utils"

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
  }

export const Graph = observer(({broker}: IProps) => {
  const
    graphDataRef = useRef<InternalizedData>({
      xAttributeID: '',
      yAttributeID: '',
      cases: []
    }),
    worldDataRef = useRef(broker?.last),
    xAttributeNameRef = useRef(''),
    yAttributeNameRef = useRef(''),
    {width, height, ref: plotRef} = useResizeDetector({refreshMode: "debounce", refreshRate: 200}),
    plotWidth = 0.8 * (width || 300),
    plotWidthRef = useCurrent(plotWidth),
    plotHeight = 0.8 * (height || 500),
    plotHeightRef = useCurrent(plotHeight),
    defaultRadius = 5,

    [plotType, setPlotType] = useState<'scatterplot' | 'dotplot'>('scatterplot'),
    [counter, setCounter] = useState(0),
    [, setHighlightCounter] = useState(0),

    keyFunc = (d: string) => d,
    svgRef = useRef<SVGSVGElement>(null),
    plotAreaSVGRef = useRef<SVGSVGElement>(null),
    dotsRef = useRef<SVGSVGElement>(null),
    [marqueeRect, setMarqueeRect] = useState({x: 0, y: 0, width: 0, height: 0}),
    [movableLine, setMovableLine] = useState(
      // {slope:Number.POSITIVE_INFINITY, intercept: 40})
      {slope: 2 / 3, intercept: 10}),
    [movableValue, setMovableValue] = useState(x.domain()[0] + (x.domain()[1] - x.domain()[0]) / 3)

  x.range([0, plotWidthRef.current])
  y.range([plotHeightRef.current, 0])

  if (broker) {
    worldDataRef.current = broker.last
    useGetData({
      broker, dataRef: graphDataRef,
      xNameRef: xAttributeNameRef, yNameRef: yAttributeNameRef, xAxis: x, yAxis: y, setCounter
    })
  }

  useEffect(function setupPlotArea() {
    select(plotAreaSVGRef.current)
      // .attr('transform', props.plotProps.transform)
      .attr('x', x.range()[0] + 60)
      .attr('y', 0)
      .attr('width', plotWidth)
    // .attr('height', plotHeightRef)
  }, [plotWidth])

  useEffect(function createCircles() {
    const xID = graphDataRef.current.xAttributeID,
      yID = graphDataRef.current.yAttributeID

    select(dotsRef.current).selectAll('circle').remove()

    select(dotsRef.current)
      .selectAll('circle')
      .data(graphDataRef.current.cases, keyFunc)
      .join(
        // @ts-expect-error void => Selection
        (enter) => {
          enter.append('circle')
            .attr('class', 'dot')
            .attr("r", defaultRadius)
            .property('id', (anID: string) => anID)
            .attr('cx', (anID: string) => {
              return getScreenCoord(worldDataRef.current, anID, xID, x)
            })
            .attr('cy', (anID: string) => {
                return getScreenCoord(worldDataRef.current, anID, yID, y)
              }
            )
            .selection()
            .append('title')
            .text((anID: string) => {
              const xVal = worldDataRef.current?.getNumeric(anID, xID) ?? 0,
                yVal = worldDataRef.current?.getNumeric(anID, yID) ?? 0
              return `(${float(xVal)}, ${float(yVal)}, id: ${anID})`
            })
        }
      )
  }, [broker?.last])

  return (
    <div className='plot' ref={plotRef} data-testid="graph">
      <svg className='graph-svg' ref={svgRef}>
        {plotType === 'scatterplot' ?
          <Axis svgRef={svgRef}
                axisProps={
                  {
                    orientation: 'left',
                    scaleLinear: y,
                    transform: `translate(${margin.left - 1}, 0)`,
                    length: plotHeightRef.current,
                    label: yAttributeNameRef.current,
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
                  label: xAttributeNameRef.current,
                  counter,
                  setCounter
                }
              }
        />
        <Background dots={dotsProps} worldDataRef={worldDataRef} dataRef={graphDataRef}
                    marquee={{rect: marqueeRect, setRect: setMarqueeRect}}
                    setHighlightCounter={setHighlightCounter}/>
        <svg ref={plotAreaSVGRef} className='dotArea'>
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
                  dataRef={graphDataRef}
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
                  graphDataRef={graphDataRef}
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
        className='plot-choice'
        onClick={() => {
          setPlotType((prevType) => prevType === 'scatterplot' ? 'dotplot' : 'scatterplot')
        }}
      >
        {plotType === 'scatterplot' ? 'Dot' : 'Scatter'} Plot
      </button>
    </div>
  )
})

// (Graph as any).whyDidYouRender = {logOnDifferentValues: true, customName: 'Graph'}
