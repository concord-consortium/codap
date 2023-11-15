import {observer} from "mobx-react-lite"
import {addDisposer, isAlive} from "mobx-state-tree"
import React, {MutableRefObject, useEffect, useMemo, useRef} from "react"
import {select} from "d3"
import {GraphAttrRole, IDotsRef, attrRoleToGraphPlace, graphPlaceToAttrRole}
  from "../../data-display/data-display-types"
import {AxisPlace, AxisPlaces} from "../../axis/axis-types"
import {GraphAxis} from "./graph-axis"
import {kGraphClass} from "../graphing-types"
import {GraphController} from "../models/graph-controller"
import {DroppableAddAttribute} from "./droppable-add-attribute"
import {Background} from "./background"
import {DroppablePlot} from "./droppable-plot"
import {ScatterDots} from "./scatterdots"
import {DotPlotDots} from "./dotplotdots"
import {CaseDots} from "./casedots"
import {ChartDots} from "./chartdots"
import {Marquee} from "./marquee"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {useGraphContentModelContext} from "../hooks/use-graph-content-model-context"
import {GraphDataConfigurationContext} from "../hooks/use-graph-data-configuration-context"
import {useGraphLayoutContext} from "../hooks/use-graph-layout-context"
import {useGraphModel} from "../hooks/use-graph-model"
import {setNiceDomain} from "../utilities/graph-utils"
import {IAxisModel} from "../../axis/models/axis-model"
import {GraphPlace} from "../../axis-graph-shared"
import {isSetAttributeIDAction} from "../models/graph-content-model"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {MarqueeState} from "../models/marquee-state"
import {Legend} from "../../data-display/components/legend/legend"
import {AttributeType} from "../../../models/data/attribute"
import {IDataSet} from "../../../models/data/data-set"
import {isRemoveAttributeAction} from "../../../models/data/data-set-actions"
import {isUndoingOrRedoing} from "../../../models/history/tree-types"
import {useDataTips} from "../../data-display/hooks/use-data-tips"
import {mstReaction} from "../../../utilities/mst-reaction"
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
    {startAnimation, getAnimationEnabled, plotType} = graphModel,
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

  useEffect(function handleFilteredCasesLengthChange() {
    return mstReaction(
      () => graphModel.dataConfiguration.filteredCases.length,
      length => {
        // filtered cases become empty when DataSet is deleted, for instance
        if ((length === 0) && !isUndoingOrRedoing()) {
          graphController.clearGraph()
        }
        else {
          graphController.callMatchCirclesToData()
        }
      }, { name: "Graph.useEffect.handleFilteredCasesLengthChange" }, graphModel
    )
  }, [graphController, graphModel])

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

  useEffect(function handleAttributeConfigurationChange() {
    // Handles attribute configuration changes from undo/redo, for instance, among others.
    // `initializeGraph()` has mechanisms to prevent running redundantly.
    return mstReaction(
      () => graphModel.dataConfiguration.attributeDescriptionsStr,
      () => graphController.initializeGraph(),
      { name: "Graph.handleAttributeConfigurationChange" }, graphModel)
  }, [graphController, graphModel])

  useEffect(function handleDeleteAttribute() {
    return dataset && addDisposer(dataset, onAnyAction(dataset, action => {
      if (isRemoveAttributeAction(action)) {
        const [attrId] = action.args
        graphModel.dataConfiguration.rolesForAttribute(attrId).forEach(role => {
          if (role === "yPlus") {
            graphModel.dataConfiguration.removeYAttributeWithID(attrId)
          }
          else {
            graphModel.setAttributeID(role as GraphAttrRole, "", "")
          }
        })
      }
    }))
  }, [dataset, graphModel])

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
        startAnimation()
        graphPlace && graphController?.handleAttributeAssignment(graphPlace, dataSetId, attrID)
      }
    })
    return () => disposer?.()
  }, [graphController, layout, graphModel, startAnimation])

  const handleTreatAttrAs = (place: GraphPlace, attrId: string, treatAs: AttributeType) => {
    dataset && graphModel.applyUndoableAction(() => {
      graphModel.dataConfiguration.setAttributeType(graphPlaceToAttrRole[place], treatAs)
      dataset && graphController?.handleAttributeAssignment(place, dataset.id, attrId)
    }, "DG.Undo.axisAttributeChange", "DG.Redo.axisAttributeChange")
  }

  useDataTips({dotsRef, dataset, getAnimationEnabled, displayModel: graphModel})

  const renderPlotComponent = () => {
    const props = { xAttrID, yAttrID, dotsRef },
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
                        getAnimationEnabled={graphModel.getAnimationEnabled}
                        stopAnimation={graphModel.stopAnimation}
                        onDropAttribute={handleChangeAttribute}
                        onRemoveAttribute={handleRemoveAttribute}
                        onTreatAttributeAs={handleTreatAttrAs}
      />
    })
  }

  const renderDroppableAddAttributes = () => {
    const droppables: React.ReactElement[] = []
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

  useGraphModel({dotsRef, graphModel, instanceId})

  if (!isAlive(graphModel)) return null

  return (
    <GraphDataConfigurationContext.Provider value={graphModel.dataConfiguration}>
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
            dataConfiguration={graphModel.dataConfiguration}
            legendAttrID={graphModel.getAttributeID('legend')}
            divElt={graphRef.current}
            onDropAttribute={handleChangeAttribute}
            onRemoveAttribute={handleRemoveAttribute}
            onTreatAttributeAs={handleTreatAttrAs}
          />
        </svg>
        {renderDroppableAddAttributes()}
        <Adornments />
      </div>
    </GraphDataConfigurationContext.Provider>
  )
})
