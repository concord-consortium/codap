import {observer} from "mobx-react-lite"
import React, {MutableRefObject, useEffect, useMemo, useRef} from "react"
import {select} from "d3"
import {IDotsRef} from "../../data-display/data-display-types"
import {GraphController} from "../models/graph-controller"
import {DroppableAddAttribute} from "./droppable-add-attribute"
import {Background} from "./background"
import {DroppablePlot} from "./droppable-plot"
import {AxisPlace, AxisPlaces} from "../../axis/axis-types"
import {GraphAxis} from "./graph-axis"
import {attrRoleToGraphPlace, graphPlaceToAttrRole, kGraphClass} from "../graphing-types"
import {ScatterDots} from "./scatterdots"
import {DotPlotDots} from "./dotplotdots"
import {CaseDots} from "./casedots"
import {ChartDots} from "./chartdots"
import {Marquee} from "./marquee"
import {useGraphContentModelContext} from "../hooks/use-graph-content-model-context"
import {DataConfigurationContext} from "../hooks/use-data-configuration-context"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {useGraphModel} from "../hooks/use-graph-model"
import {setNiceDomain, startAnimation} from "../utilities/graph-utils"
import {IAxisModel} from "../../axis/models/axis-model"
import {GraphPlace} from "../../axis-graph-shared"
import {isSetAttributeIDAction} from "../models/graph-content-model"
import {useGraphLayoutContext} from "../models/graph-layout"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {MarqueeState} from "../models/marquee-state"
import {Legend} from "./legend/legend"
import {AttributeType} from "../../../models/data/attribute"
import {IDataSet} from "../../../models/data/data-set"
import {useDataTips} from "../hooks/use-data-tips"
import {onAnyAction} from "../../../utilities/mst-utils"
import { Adornments } from "../adornments/adornments"

import "./graph.scss"

interface IProps {
  graphController: GraphController
  graphRef: MutableRefObject<HTMLDivElement | null>
  dotsRef: IDotsRef
}

export const Graph = observer(function Graph({graphController, graphRef, dotsRef}: IProps) {
  const graphModel = useGraphContentModelContext(),
    {enableAnimation} = graphController,
    {plotType} = graphModel,
    instanceId = useInstanceIdContext(),
    marqueeState = useMemo<MarqueeState>(() => new MarqueeState(), []),
    dataset = useDataSetContext(),
    layout = useGraphLayoutContext(),
    xScale = layout.getAxisScale("bottom"),
    svgRef = useRef<SVGSVGElement>(null),
    plotAreaSVGRef = useRef<SVGSVGElement>(null),
    backgroundSvgRef = useRef<SVGGElement>(null),
    xAttrID = graphModel.getAttributeID('x'),
    yAttrID = graphModel.getAttributeID('y')

  useEffect(function setupPlotArea() {
    if (xScale && xScale?.length > 0) {
      const plotBounds = layout.getComputedBounds('plot')
      select(plotAreaSVGRef.current)
        .attr('x', plotBounds?.left || 0)
        .attr('y', plotBounds?.top || 0)
        .attr('width', layout.plotWidth)
        .attr('height', layout.plotHeight)
    }
  }, [dataset, plotAreaSVGRef, layout, layout.plotHeight, layout.plotWidth, xScale])

  const handleChangeAttribute = (place: GraphPlace, dataSet: IDataSet, attrId: string) => {
    const computedPlace = place === 'plot' && graphModel.dataConfiguration.noAttributesAssigned ? 'bottom' : place
    const attrRole = graphPlaceToAttrRole[computedPlace]
    graphModel.applyUndoableAction(
      () => graphModel.setAttributeID(attrRole, dataSet.id, attrId),
      "DG.Undo.axisAttributeChange", "DG.Redo.axisAttributeChange")
  }

  /**
   * Only in the case that place === 'y' and there is more than one attribute assigned to the y-axis
   * do we have to do anything special. Otherwise, we can just call handleChangeAttribute.
   */
  const handleRemoveAttribute = (place: GraphPlace, idOfAttributeToRemove: string) => {
    if (place === 'left' && (graphModel.dataConfiguration.yAttributeDescriptions.length ?? 0) > 1) {
      graphModel.dataConfiguration.removeYAttributeWithID(idOfAttributeToRemove)
      const yAxisModel = graphModel.getAxis('left') as IAxisModel
      setNiceDomain((graphModel.dataConfiguration.numericValuesForAttrRole('y') ?? []), yAxisModel)
    } else {
      dataset && handleChangeAttribute(place, dataset, '')
    }
  }

  // respond to assignment of new attribute ID
  useEffect(function handleNewAttributeID() {
    const disposer = graphModel && onAnyAction(graphModel, action => {
      if (isSetAttributeIDAction(action)) {
        const [role, dataSetId, attrID] = action.args,
          graphPlace = attrRoleToGraphPlace[role]
        startAnimation(enableAnimation)
        graphPlace && graphController?.handleAttributeAssignment(graphPlace, dataSetId, attrID)
      }
    })
    return () => disposer?.()
  }, [graphController, dataset, layout, enableAnimation, graphModel])

  const handleTreatAttrAs = (place: GraphPlace, attrId: string, treatAs: AttributeType) => {
    graphModel.dataConfiguration.setAttributeType(graphPlaceToAttrRole[place], treatAs)
    dataset && graphController?.handleAttributeAssignment(place, dataset.id, attrId)
  }

  useDataTips({dotsRef, dataset, graphModel, enableAnimation})

  const renderPlotComponent = () => {
    const props = {
        xAttrID, yAttrID, dotsRef, enableAnimation
      },
      typeToPlotComponentMap = {
        casePlot: <CaseDots {...props}/>,
        dotChart: <ChartDots {...props}/>,
        dotPlot: <DotPlotDots {...props}/>,
        scatterPlot: <ScatterDots {...props}/>
      }
    return typeToPlotComponentMap[plotType]
  }

  const renderGraphAxes = () => {
    const places = AxisPlaces.filter((place: AxisPlace) => {
      return !!graphModel.getAxis(place)
    })
    return places.map((place: AxisPlace) => {
      return <GraphAxis key={place}
                        place={place}
                        enableAnimation={enableAnimation}
                        onDropAttribute={handleChangeAttribute}
                        onRemoveAttribute={handleRemoveAttribute}
                        onTreatAttributeAs={handleTreatAttrAs}
      />
    })
  }

  const renderDroppableAddAttributes = () => {
    const droppables: JSX.Element[] = []
    if (plotType !== 'casePlot') {
      const plotPlaces: GraphPlace[] = plotType === 'scatterPlot' ? ['yPlus', 'rightNumeric'] : []
      const places: GraphPlace[] = ['top', 'rightCat', ...plotPlaces]
      places.forEach((place: GraphPlace) => {
        // Since an axis is already a droppable, we only need to render a droppable if there is no axis
        if (!graphModel.getAxis(place as AxisPlace)) {
          droppables.push(
            <DroppableAddAttribute
              key={place}
              place={place}
              plotType={plotType}
              onDrop={handleChangeAttribute.bind(null, place)}
            />
          )
        }
      })
    }
    return droppables
  }

  useGraphModel({dotsRef, graphModel, enableAnimation, instanceId})

  return (
    <DataConfigurationContext.Provider value={graphModel.dataConfiguration}>
      <div className={kGraphClass} ref={graphRef} data-testid="graph">
        <svg className='graph-svg' ref={svgRef}>
          <Background
            marqueeState={marqueeState}
            ref={backgroundSvgRef}
          />

          {renderGraphAxes()}

          <svg ref={plotAreaSVGRef}>
            <svg ref={dotsRef} className={`graph-dot-area ${instanceId}`}>
              {renderPlotComponent()}
            </svg>
            <Marquee marqueeState={marqueeState}/>
          </svg>

          <DroppablePlot
            graphElt={graphRef.current}
            plotElt={backgroundSvgRef.current}
            onDropAttribute={handleChangeAttribute}
          />

          <Legend
            legendAttrID={graphModel.getAttributeID('legend')}
            graphElt={graphRef.current}
            onDropAttribute={handleChangeAttribute}
            onRemoveAttribute={handleRemoveAttribute}
            onTreatAttributeAs={handleTreatAttrAs}
          />
        </svg>
        {renderDroppableAddAttributes()}
        <Adornments />
      </div>
    </DataConfigurationContext.Provider>
  )
})
