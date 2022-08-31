import {useToast} from "@chakra-ui/react"
import {format, select} from "d3"
import {observer} from "mobx-react-lite"
import {onAction} from "mobx-state-tree"
import React, {MutableRefObject, useEffect, useRef, useState} from "react"
import {Axis} from "./axis"
import {Background} from "./background"
import {defaultRadius, kGraphClass, plotProps} from "../graphing-types"
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
import {getScreenCoord, pullOutNumericAttributesInNewDataset, setNiceDomain} from "../utilities/graph_utils"
import {prf} from "../../../utilities/profiler"

import "./graph.scss"

interface IProps {
  model: IGraphModel
  graphRef: MutableRefObject<HTMLDivElement>
  animationIsOn: MutableRefObject<boolean>
}

const float = format('.3~f')

export const Graph = observer(({model: graphModel, graphRef, animationIsOn}: IProps) => {
  return prf.measure("Graph.render", () => {
    const
      xAxisModel = graphModel.getAxis("bottom") as INumericAxisModel,
      yAxisModel = graphModel.getAxis("left") as INumericAxisModel,
      {plotType, movableLine: movableLineModel, movableValue: movableValueModel} = graphModel,
      instanceId = useInstanceIdContext(),
      dataset = useDataSetContext(),
      layout = useGraphLayoutContext(),
      {margin} = layout,
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

    useEffect(function makeUseOfDataset() {
      if (dataset) {
        pullOutNumericAttributesInNewDataset({dataset, layout, xAxis: xAxisModel, yAxis: yAxisModel, graphModel})
      }
    }, [dataset, layout, xAxisModel, yAxisModel])

    const
      xAttrID = graphModel.getAttributeID('bottom'),
      yAttrID = graphModel.getAttributeID('left'),
      cases = graphModel.cases

    useEffect(function setupPlotArea() {
      select(plotAreaSVGRef.current)
        // .attr('transform', props.plotProps.transform)
        .attr('x', xScale.range()[0] + margin.left)
        .attr('y', 0)
        .attr('width', layout.plotWidth)
        .attr('height', layout.plotHeight)
    }, [layout.plotHeight, layout.plotWidth, margin.left, xScale])

    useEffect(function createCircles() {

      animationIsOn.current = true
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
              .attr('cx', (anID: string) => getScreenCoord(dataset, anID, xAttrID, xScale))
              .attr('cy', (anID: string) => getScreenCoord(dataset, anID, yAttrID, yScale))
              .selection()
              .append('title')
              .text((anID: string) => {
                const xVal = dataset?.getNumeric(anID, xAttrID) ?? 0,
                  yVal = dataset?.getNumeric(anID, yAttrID) ?? 0
                return `(${float(xVal)}, ${float(yVal)}, id: ${anID})`
              })
          }
        )
    }, [dataset, instanceId, xScale, yScale, cases, xAttrID, yAttrID])

    useEffect(function initMovables() {
      const xDomainDelta = xScale.domain()[1] - xScale.domain()[0],
        yDomainDelta = yScale.domain()[1] - yScale.domain()[0]
      movableLineModel.setLine({intercept: yScale.domain()[0] + yDomainDelta / 3, slope: yDomainDelta / xDomainDelta})
      movableValueModel.setValue(xScale.domain()[0] + xDomainDelta / 3)
    }, [movableLineModel, movableValueModel, xScale, yScale, xAttrID, yAttrID])

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
    // respond to assignment of new attribute ID
    useEffect(() => {
      const disposer = graphModel && onAction(graphModel, action => {
        if (action.name === 'setAttributeID') {
          const place = action.args?.[0],
            attrID = action.args?.[1],
            values = dataset?.attrFromID(attrID).numValues,
            axisModel = place === 'bottom' ? xAxisModel : yAxisModel
          setNiceDomain(values || [], layout.axisScale(place), axisModel)
          animationIsOn.current = true
        }
      }, true)
      return () => disposer?.()
    }, [dataset, layout, xAxisModel, yAxisModel])

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
          <Background dots={dotsProps} marquee={{rect: marqueeRect, setRect: setMarqueeRect}}/>
          <svg ref={plotAreaSVGRef} className='graph-dot-area'>
            <svg ref={dotsRef}>
              {
                (plotType === 'scatterPlot' ?
                  <ScatterDots
                    plotProps={dotsProps}
                    xAttrID={xAttrID}
                    yAttrID={yAttrID}
                    dotsRef={dotsRef}
                    xAxisModel={xAxisModel}
                    yAxisModel={yAxisModel}
                    animationIsOn={animationIsOn}
                  />
                  :
                  <DotPlotDots
                    axisModel={xAxisModel}
                    xAttrID={xAttrID}
                    dotsRef={dotsRef}
                    enableAnimation={animationIsOn}
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
})

// (Graph as any).whyDidYouRender = {logOnDifferentValues: true, customName: 'Graph'}
