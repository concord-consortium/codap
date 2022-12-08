import {select} from "d3"
import {observer} from "mobx-react-lite"
import {onAction} from "mobx-state-tree"
import React, {MutableRefObject, useEffect, useRef} from "react"
import {Axis} from "../../axis/components/axis"
import {Background} from "./background"
import {DroppablePlot} from "./droppable-plot"
import {
  attrRoleToGraphPlace, GraphPlace, graphPlaceToAttrPlace, kGraphClass, kGraphClassSelector
} from "../graphing-types"
import {ScatterDots} from "./scatterdots"
import {DotPlotDots} from "./dotplotdots"
import {CaseDots} from "./casedots"
import {ChartDots} from "./chartdots"
import {Marquee} from "./marquee"
import {DataConfigurationContext} from "../hooks/use-data-configuration-context"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {useGraphController} from "../hooks/use-graph-controller"
import {useGraphModel} from "../hooks/use-graph-model"
import {useGraphLayoutContext} from "../models/graph-layout"
import {IGraphModel, isSetAttributeIDAction} from "../models/graph-model"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {MarqueeState} from "../models/marquee-state"
import {Legend} from "./legend/legend"
import {AttributeType} from "../../../models/data/attribute"
import {GraphInspector} from "./graph-inspector"
import {useDataTips} from "../hooks/use-data-tips"
import t from "../../../utilities/translation/translate"

import "./graph.scss"

interface IProps {
  model: IGraphModel
  graphRef: MutableRefObject<HTMLDivElement>
  enableAnimation: MutableRefObject<boolean>
  dotsRef: React.RefObject<SVGSVGElement>
  showInspector: boolean
  setShowInspector: (show: boolean) => void
}

const marqueeState = new MarqueeState()

export const Graph = observer((
  {model: graphModel, graphRef, enableAnimation, dotsRef, showInspector, setShowInspector}: IProps) => {
  const {plotType} = graphModel,
    instanceId = useInstanceIdContext(),
    dataset = useDataSetContext(),
    layout = useGraphLayoutContext(),
    bottomAxisHeight = layout.getAxisBounds('bottom')?.height ?? 0,
    xScale = layout.getAxisScale("bottom"),
    svgRef = useRef<SVGSVGElement>(null),
    backgroundSvgRef = useRef<SVGGElement>(null),
    plotAreaSVGRef = useRef<SVGSVGElement>(null),
    xAttrID = graphModel.getAttributeID('x'),
    yAttrID = graphModel.getAttributeID('y')

  useGraphModel({dotsRef, graphModel, enableAnimation, instanceId})

  const graphController = useGraphController({graphModel, enableAnimation, dotsRef})

  useEffect(function setupPlotArea() {
    if (xScale && xScale?.range().length > 0) {
      select(plotAreaSVGRef.current)
        .attr('x', xScale?.range()[0])
        .attr('y', 0)
        .attr('width', layout.plotWidth)
        .attr('height', layout.plotHeight)
    }
  }, [layout.plotHeight, layout.plotWidth, xScale, bottomAxisHeight])

  const handleChangeAttribute = (place: GraphPlace, attrId: string) => {
    const computedPlace = place === 'plot' && graphModel.config.noAttributesAssigned ? 'bottom' : place
    const attrPlace = graphPlaceToAttrPlace(computedPlace)
    graphModel.setAttributeID(attrPlace, attrId)
  }

  // respond to assignment of new attribute ID
  useEffect(function handleNewAttributeID() {
    const disposer = graphModel && onAction(graphModel, action => {
      if (isSetAttributeIDAction(action)) {
        const [role, attrID] = action.args,
          graphPlace = attrRoleToGraphPlace[role]
        enableAnimation.current = true
        graphPlace && graphController?.handleAttributeAssignment(graphPlace, attrID)
      }
    }, true)
    return () => disposer?.()
  }, [graphController, dataset, layout, enableAnimation, graphModel])

  const handleTreatAttrAs = (place: GraphPlace, attrId: string, treatAs: AttributeType) => {
    graphModel.config.setAttributeType(graphPlaceToAttrPlace(place), treatAs)
    graphController?.handleAttributeAssignment(place, attrId)
  }

  // We only need to make the following connection once
  useEffect(function passDotsRefToController() {
    graphController?.setDotsRef(dotsRef)
  }, [dotsRef, graphController])

  useDataTips(dotsRef, dataset, graphModel)

  const getPlotComponent = () => {
    const props = {
        graphModel,
        plotProps: {
          xAttrID, yAttrID, dotsRef, enableAnimation
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

  function axisLabel(attrId: string) {
    return dataset?.attrFromID(attrId)?.name ?? t('DG.AxisView.emptyGraphCue')
  }

  return (
    <DataConfigurationContext.Provider value={graphModel.config}>
      <div className={kGraphClass} ref={graphRef} data-testid="graph" onClick={()=>setShowInspector(!showInspector)}>
        <svg className='graph-svg' ref={svgRef}>
          <Background
            marqueeState={marqueeState}
            ref={backgroundSvgRef}
          />

          <Axis parentSelector={kGraphClassSelector}
                getAxisModel={() => graphModel.getAxis('left')}
                label={axisLabel(yAttrID)}
                enableAnimation={enableAnimation}
                showGridLines={graphModel.plotType === 'scatterPlot'}
                onDropAttribute={handleChangeAttribute}
                onTreatAttributeAs={handleTreatAttrAs}
          />
          <Axis parentSelector={kGraphClassSelector}
                getAxisModel={() => graphModel.getAxis('bottom')}
                label={axisLabel(xAttrID)}
                enableAnimation={enableAnimation}
                showGridLines={graphModel.plotType === 'scatterPlot'}
                onDropAttribute={handleChangeAttribute}
                onTreatAttributeAs={handleTreatAttrAs}
          />

          <svg ref={plotAreaSVGRef} className='graph-dot-area'>
            <svg ref={dotsRef}>
              {getPlotComponent()}
            </svg>
            <Marquee marqueeState={marqueeState}/>
          </svg>

          <DroppablePlot
            graphElt={graphRef.current}
            plotElt={backgroundSvgRef.current}
            onDropAttribute={handleChangeAttribute}
          />

          <Legend
            graphModel={graphModel}
            legendAttrID={graphModel.getAttributeID('legend')}
            graphElt={graphRef.current}
            onDropAttribute={handleChangeAttribute}
          />
        </svg>
      </div>
      <GraphInspector graphModel={graphModel}
                      show={showInspector}
      />
    </DataConfigurationContext.Provider>
  )
})
