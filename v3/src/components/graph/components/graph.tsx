import {useToast} from "@chakra-ui/react"
import {select} from "d3"
import {observer} from "mobx-react-lite"
import {onAction} from "mobx-state-tree"
import React, {MutableRefObject, useEffect, useRef, useState} from "react"
import {Axis} from "./axis"
import {Background} from "./background"
import {kGraphClass} from "../graphing-types"
import {ScatterDots} from "./scatterdots"
import {DotPlotDots} from "./dotplotdots"
import {CaseDots} from "./casedots"
import {ChartDots} from "./chartdots"
import {Marquee} from "./marquee"
import {AxisPlace, IAxisModel, INumericAxisModel} from "../models/axis-model"
import {useGraphModel} from "../hooks/use-graph-model"
import {useGraphLayoutContext} from "../models/graph-layout"
import {IGraphModel} from "../models/graph-model"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {filterCases} from "../utilities/graph_utils"

import "./graph.scss"
import {GraphController} from "../models/graph-controller"

interface IProps {
  graphController: GraphController
  model: IGraphModel
  graphRef: MutableRefObject<HTMLDivElement>
  enableAnimation: MutableRefObject<boolean>
  dotsRef: React.RefObject<SVGSVGElement>
}

export const Graph = observer((
  {graphController, model: graphModel, graphRef, enableAnimation, dotsRef}: IProps) => {
  const xAxisModel = graphModel.getAxis("bottom") as IAxisModel,
    yAxisModel = graphModel.getAxis("left") as IAxisModel,
    {plotType} = graphModel,
    instanceId = useInstanceIdContext(),
    dataset = useDataSetContext(),
    casesRef = useRef<string[]>([]),
    layout = useGraphLayoutContext(),
    {margin} = layout,
    xScale = layout.axisScale("bottom"),
    transform = `translate(${margin.left}, 0)`,
    svgRef = useRef<SVGSVGElement>(null),
    plotAreaSVGRef = useRef<SVGSVGElement>(null),
    [marqueeRect, setMarqueeRect] = useState({x: 0, y: 0, width: 0, height: 0}),
    xAttrID = graphModel.getAttributeID('bottom'),
    yAttrID = graphModel.getAttributeID('left')

  casesRef.current = filterCases(dataset, [xAttrID, yAttrID])

  useGraphModel({dotsRef, casesRef, graphModel, enableAnimation, instanceId})

  useEffect(function setupPlotArea() {
    if (xScale && xScale?.range().length > 0) {
      select(plotAreaSVGRef.current)
        .attr('x', xScale?.range()[0] + margin.left)
        .attr('y', 0)
        .attr('width', layout.plotWidth)
        .attr('height', layout.plotHeight)
    }
  }, [layout.plotHeight, layout.plotWidth, margin.left, xScale])

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
  useEffect(function handleNewAttributeID() {
    const disposer = graphModel && onAction(graphModel, action => {
      if (action.name === 'setAttributeID') {
        const place: AxisPlace = action.args?.[0],
          attrID = action.args?.[1]
        enableAnimation.current = true
        graphController.handleAttributeAssignment(place, attrID)
        casesRef.current = graphModel.cases
      }
    }, true)
    return () => disposer?.()
  }, [graphController, dataset, layout, xAxisModel, yAxisModel, enableAnimation, graphModel])

  // We only need to make the following connection once
  useEffect(function passDotsRefToController() {
    graphController.setDotsRef(dotsRef)
  })

  const getPlotComponent = () => {
    const plotProps = {
      casesRef, xAttrID, yAttrID, dotsRef, enableAnimation,
      xAxisModel: xAxisModel as INumericAxisModel,
      yAxisModel: yAxisModel as INumericAxisModel
    }
    let plotComponent: JSX.Element | null = null
    switch (plotType) {
      case 'casePlot':
        plotComponent = (<CaseDots {...plotProps} />)
        break
      case 'dotChart':
        plotComponent = (<ChartDots {...plotProps} />)
        break
      case 'scatterPlot':
        plotComponent = (<ScatterDots {...plotProps} />)
        break
      case 'dotPlot':
        plotComponent = (<DotPlotDots {...plotProps} />)
        break
      default:
    }
    return plotComponent
  }

  return (
    <div className={kGraphClass} ref={graphRef} data-testid="graph">
      <svg className='graph-svg' ref={svgRef}>
        <Axis axisModel={yAxisModel} attributeID={yAttrID}
              transform={`translate(${margin.left - 1}, 0)`}
              onDropAttribute={handleDropAttribute}
        />
        <Axis axisModel={xAxisModel} attributeID={xAttrID}
              transform={`translate(${margin.left}, ${layout.plotHeight})`}
              onDropAttribute={handleDropAttribute}
        />
        <Background
          transform={transform}
          marquee={{rect: marqueeRect, setRect: setMarqueeRect}}/>
        <svg ref={plotAreaSVGRef} className='graph-dot-area'>
          <svg ref={dotsRef}>
            {getPlotComponent()}
          </svg>
          <Marquee marqueeRect={marqueeRect}/>
        </svg>
      </svg>
    </div>
  )
})

// (Graph as any).whyDidYouRender = {logOnDifferentValues: true, customName: 'Graph'}
