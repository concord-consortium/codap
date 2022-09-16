import {useToast} from "@chakra-ui/react"
import {format, scaleBand, scaleLinear, select} from "d3"
import {observer} from "mobx-react-lite"
import {onAction} from "mobx-state-tree"
import React, {MutableRefObject, useCallback, useEffect, useRef, useState} from "react"
import {Axis} from "./axis"
import {Background} from "./background"
import {defaultRadius, kGraphClass, PlotType} from "../graphing-types"
import {ScatterDots} from "./scatterdots"
import {DotPlotDots} from "./dotplotdots"
import {CaseDots} from "./casedots"
import {ChartDots} from "./chartdots"
import {Marquee} from "./marquee"
import {AxisPlace, CategoricalAxisModel, IAxisModel, ICategoricalAxisModel, INumericAxisModel, NumericAxisModel
} from "../models/axis-model"
import {useGraphModel} from "../hooks/use-graph-model"
import {useGraphLayoutContext} from "../models/graph-layout"
import {IGraphModel} from "../models/graph-model"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {setNiceDomain} from "../utilities/graph_utils"

import "./graph.scss"

interface IProps {
  model: IGraphModel
  graphRef: MutableRefObject<HTMLDivElement>
  enableAnimation: MutableRefObject<boolean>
}

export const Graph = observer(({model: graphModel, graphRef, enableAnimation}: IProps) => {
  const casesRef = useRef(graphModel.cases),
    xAxisModel = graphModel.getAxis("bottom") as IAxisModel,
    yAxisModel = graphModel.getAxis("left") as IAxisModel,
    {plotType} = graphModel,
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

  const
    xAttrID = graphModel.getAttributeID('bottom'),
    yAttrID = graphModel.getAttributeID('left')

  useGraphModel({dotsRef, casesRef, graphModel, enableAnimation, keyFunc, instanceId})

  useEffect(function setupPlotArea() {
    if (xScale && xScale?.range().length > 0) {
      select(plotAreaSVGRef.current)
        .attr('x', xScale?.range()[0] + margin.left)
        .attr('y', 0)
        .attr('width', layout.plotWidth)
        .attr('height', layout.plotHeight)
    }
  }, [layout.plotHeight, layout.plotWidth, margin.left, xScale])

  useEffect(() => {
    graphModel.setCases(dataset ? dataset?.cases.map(aCase => aCase.__id__) : [])
  }, [dataset, graphModel])

  useEffect(function createCircles() {
    enableAnimation.current = true
    const float = format('.3~f')
    select(dotsRef.current)
      .selectAll('circle')
      .data(graphModel.cases, keyFunc)
      .join(
        // @ts-expect-error void => Selection
        (enter) => {
          enter.append('circle')
            .attr('class', 'graph-dot')
            .attr("r", defaultRadius)
            .property('id', (anID: string) => `${instanceId}_${anID}`)
            .selection()
            .append('title')
            .text((anID: string) => {
              const xVal = dataset?.getNumeric(anID, xAttrID) ?? 0,
                yVal = dataset?.getNumeric(anID, yAttrID) ?? 0
              return `(${float(xVal)}, ${float(yVal)}, id: ${anID})`
            })
        }
      )
  }, [dataset, instanceId, keyFunc, xScale, xAttrID, yAttrID, enableAnimation, graphModel.cases])

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
          otherPlace = place === 'bottom' ? 'left' : 'bottom',
          attrID = action.args?.[1],
          attribute = dataset?.attrFromID(attrID),
          type = attribute?.type ?? 'empty',
          axisModel = graphModel.getAxis(place),
          currentAxisType = axisModel?.type,
          otherAxisType = graphModel.getAxis(otherPlace)?.type,
          plotChoices = {
            empty: {empty: 'casePlot', numeric: 'dotPlot', categorical: 'dotChart'},
            numeric: {empty: 'dotPlot', numeric: 'scatterPlot', categorical: 'dotPlot'},
            categorical: {empty: 'dotChart', numeric: 'dotPlot', categorical: 'dotChart'}
          }
        if (type === 'numeric') {
          if (currentAxisType !== type) {
            const newAxisModel = NumericAxisModel.create({place, min: 0, max: 1})
            graphModel.setAxis(place, newAxisModel as INumericAxisModel)
            layout.setAxisScale(place, scaleLinear())
            setNiceDomain(attribute?.numValues || [], newAxisModel)
          } else {
            setNiceDomain(attribute?.numValues || [], axisModel as INumericAxisModel)
          }
        } else if (type === 'categorical') {
          const categories = Array.from(new Set(attribute?.strValues))
          if (currentAxisType !== type) {
            const newAxisModel = CategoricalAxisModel.create({place, categories})
            graphModel.setAxis(place, newAxisModel as ICategoricalAxisModel)
            layout.setAxisScale(place, scaleBand())
          }
          layout.axisScale(place)?.domain(categories)
        }
        // todo: Kirk, better way to do this?
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        graphModel.setPlotType(plotChoices[type][otherAxisType] as PlotType)
        enableAnimation.current = true
      }
    }, true)
    return () => disposer?.()
  }, [dataset, layout, xAxisModel, yAxisModel, enableAnimation, graphModel])

  const getPlotComponent = () => {
    let plotComponent: JSX.Element | null = null
    switch (plotType) {
      case 'emptyPlot':
        plotComponent = (
          <CaseDots
            dotsRef={dotsRef}
            enableAnimation={enableAnimation}
          />)
        break
      case 'dotChart':
        plotComponent = (
          <ChartDots
            xAttrID={xAttrID}
            dotsRef={dotsRef}
            enableAnimation={enableAnimation}
          />)
        break
      case 'scatterPlot':
        plotComponent = (
          <ScatterDots
            casesRef={casesRef}
            xAttrID={xAttrID}
            yAttrID={yAttrID}
            dotsRef={dotsRef}
            xAxisModel={xAxisModel as INumericAxisModel}
            yAxisModel={yAxisModel as INumericAxisModel}
            enableAnimation={enableAnimation}
          />
        )
        break
      case 'dotPlot':
        plotComponent = (
          <DotPlotDots
            casesRef={casesRef}
            axisModel={xAxisModel as INumericAxisModel}
            xAttrID={xAttrID}
            dotsRef={dotsRef}
            enableAnimation={enableAnimation}
          />
        )
        break
      default:
    }
    return plotComponent
  }

  return (
    <div className={kGraphClass} ref={graphRef} data-testid="graph">
      <svg className='graph-svg' ref={svgRef}>
        <Axis model={yAxisModel} attributeID={yAttrID}
              transform={`translate(${margin.left - 1}, 0)`}
              onDropAttribute={handleDropAttribute}
        />
        <Axis model={xAxisModel} attributeID={xAttrID}
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
