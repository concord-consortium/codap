import {useToast} from "@chakra-ui/react"
import {select} from "d3"
import {tip as d3tip} from "d3-v6-tip"
import {observer} from "mobx-react-lite"
import {onAction} from "mobx-state-tree"
import React, {MutableRefObject, useEffect, useRef} from "react"
import {Axis} from "./axis"
import {Background} from "./background"
import {kGraphClass, transitionDuration} from "../graphing-types"
import {ScatterDots} from "./scatterdots"
import {DotPlotDots} from "./dotplotdots"
import {CaseDots} from "./casedots"
import {ChartDots} from "./chartdots"
import {Marquee} from "./marquee"
import {DataConfigurationContext} from "../hooks/use-data-configuration-context"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {useGraphModel} from "../hooks/use-graph-model"
import {AxisPlace, IAxisModel, attrPlaceToAxisPlace} from "../models/axis-model"
import {useGraphLayoutContext} from "../models/graph-layout"
import {IGraphModel, isSetAttributeIDAction} from "../models/graph-model"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {getPointTipText} from "../utilities/graph-utils"
import {GraphController} from "../models/graph-controller"
import {MarqueeState} from "../models/marquee-state"

import "./graph.scss"

interface IProps {
  graphController: GraphController
  model: IGraphModel
  graphRef: MutableRefObject<HTMLDivElement>
  enableAnimation: MutableRefObject<boolean>
  dotsRef: React.RefObject<SVGSVGElement>
}

const marqueeState = new MarqueeState(),
  dataTip = d3tip().attr('class', 'graph-d3-tip')/*.attr('opacity', 0.8)*/
    .attr('data-testid', 'graph-point-data-tip')
    .html((d: string) => {
      return "<p>" + d + "</p>"
    })

export const Graph = observer((
    {graphController, model: graphModel, graphRef, enableAnimation, dotsRef}: IProps) => {
    const xAxisModel = graphModel.getAxis("bottom") as IAxisModel,
      yAxisModel = graphModel.getAxis("left") as IAxisModel,
      {plotType} = graphModel,
      instanceId = useInstanceIdContext(),
      dataset = useDataSetContext(),
      dataConfig = graphModel.config,
      casesRef = useRef<string[]>([]),
      layout = useGraphLayoutContext(),
      {margin} = layout,
      xScale = layout.axisScale("bottom"),
      transform = `translate(${margin.left}, 0)`,
      svgRef = useRef<SVGSVGElement>(null),
      plotAreaSVGRef = useRef<SVGSVGElement>(null),
      xAttrID = graphModel.getAttributeID('x'),
      yAttrID = graphModel.getAttributeID('y'),
      pointRadius = graphModel.getPointRadius(),
      hoverPointRadius = graphModel.getPointRadius('hover-drag')

    casesRef.current = dataConfig?.cases ?? []

    useGraphModel({dotsRef, graphModel, enableAnimation, instanceId})

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
    // TODO: will need to be more sophisticated
    const attrPlace = place === "left" ? "y" : "x"
      const attrName = dataset?.attrFromID(attrId)?.name
      toast({
        position: "top-right",
        title: "Attribute dropped",
        description: `The attribute ${attrName || attrId} was dropped on the ${place} axis!`,
        status: "success"
      })
      graphModel.setAttributeID(attrPlace, attrId)
    }
    // respond to assignment of new attribute ID
    useEffect(function handleNewAttributeID() {
      const disposer = graphModel && onAction(graphModel, action => {
        if (isSetAttributeIDAction(action)) {
          const [place, attrID] = action.args,
            axisPlace = attrPlaceToAxisPlace[place]
          enableAnimation.current = true
          axisPlace && graphController.handleAttributeAssignment(axisPlace, attrID)
        }
      }, true)
      return () => disposer?.()
    }, [graphController, dataset, layout, xAxisModel, yAxisModel, enableAnimation, graphModel])

    // We only need to make the following connection once
    useEffect(function passDotsRefToController() {
      graphController.setDotsRef(dotsRef)
    }, [dotsRef, graphController])

    // MouseOver events, if over an element, brings up hover text
    function showDataTip(event: MouseEvent) {
      const
        target = select(event.target as SVGSVGElement)
      if (target.node()?.nodeName === 'circle' && dataset) {
        target.transition().duration(transitionDuration).attr('r', hoverPointRadius)
        const [, caseID] = target.property('id').split("_"),
          attrIDs = graphModel.config.uniqueTipAttributes,
          tipText = getPointTipText(dataset, caseID, attrIDs)
        tipText !== '' && dataTip.show(tipText, event.target)
      }
    }

    function hideDataTip(event: MouseEvent) {
      dataTip.hide()
      select(event.target as SVGSVGElement)
        .transition().duration(transitionDuration).attr('r', pointRadius)
    }

    useEffect(function setupDataTip() {
      select(dotsRef.current)
        .on('mouseover', showDataTip)
        .on('mouseout', hideDataTip)
        .call(dataTip)
    })

    const getPlotComponent = () => {
      const props = {
        graphModel,
      plotProps:{
        casesRef, xAttrID, yAttrID, dotsRef, enableAnimation,
          xAxisModel,
          yAxisModel
      }
    },
        typeToPlotComponentMap = {
          casePlot: <CaseDots {...props}/>,
          dotChart: <ChartDots {...props}/>,
          dotPlot: <DotPlotDots {...props}/>,
          scatterPlot: <ScatterDots {...props}/>
        }
      return typeToPlotComponentMap[plotType]
    }

    return (
      <DataConfigurationContext.Provider value={graphModel.config}>
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
              marqueeState={marqueeState}/>
            <svg ref={plotAreaSVGRef} className='graph-dot-area'>
              <svg ref={dotsRef}>
                {getPlotComponent()}
              </svg>
              <Marquee marqueeState={marqueeState}/>
            </svg>
          </svg>
        </div>
      </DataConfigurationContext.Provider>
    )
})
