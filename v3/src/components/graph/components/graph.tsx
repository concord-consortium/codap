import {comparer} from "mobx"
import {observer} from "mobx-react-lite"
import {isAlive} from "mobx-state-tree"
import React, {MutableRefObject, useCallback, useEffect, useMemo, useRef} from "react"
import {select} from "d3"
import {clsx} from "clsx"
import { logStringifiedObjectMessage } from "../../../lib/log-message"
import {mstReaction} from "../../../utilities/mst-reaction"
import {onAnyAction} from "../../../utilities/mst-utils"
import {IPixiPointsArrayRef} from "../../data-display/pixi/pixi-points"
import {GraphAttrRole, graphPlaceToAttrRole, kPortalClass} from "../../data-display/data-display-types"
import {AxisPlace, AxisPlaces} from "../../axis/axis-types"
import {GraphAxis} from "./graph-axis"
import {kGraphClass} from "../graphing-types"
import {GraphController} from "../models/graph-controller"
import {DroppableAddAttribute} from "./droppable-add-attribute"
import {Background} from "../../data-display/components/background"
import {DroppablePlot} from "./droppable-plot"
import {ScatterDots} from "./scatterdots"
import {CaseDots} from "./casedots"
import {DotChart} from "./dot-chart"
import {DotPlotDots} from "./dotplotdots"
import {Marquee} from "../../data-display/components/marquee"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {isSetAttributeIDAction} from "../../data-display/models/display-model-actions"
import {useGraphContentModelContext} from "../hooks/use-graph-content-model-context"
import {GraphDataConfigurationContext} from "../hooks/use-graph-data-configuration-context"
import {useGraphLayoutContext} from "../hooks/use-graph-layout-context"
import {useGraphModel} from "../hooks/use-graph-model"
import {setNiceDomain} from "../utilities/graph-utils"
import {IAxisModel} from "../../axis/models/axis-model"
import {GraphPlace} from "../../axis-graph-shared"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {MarqueeState} from "../../data-display/models/marquee-state"
import {DataTip} from "../../data-display/components/data-tip"
import {MultiLegend} from "../../data-display/components/legend/multi-legend"
import {AttributeType} from "../../../models/data/attribute"
import {IDataSet} from "../../../models/data/data-set"
import {isUndoingOrRedoing} from "../../../models/history/tree-types"
import {useDataDisplayAnimation} from "../../data-display/hooks/use-data-display-animation"
import {Adornments} from "../adornments/adornments"
import { t } from "../../../utilities/translation/translate"
import { ParentToggles } from "./parent-toggles"

import "./graph.scss"

interface IProps {
  graphController: GraphController
  graphRef: MutableRefObject<HTMLDivElement | null>
  pixiPointsArrayRef: IPixiPointsArrayRef
}

export const Graph = observer(function Graph({graphController, graphRef, pixiPointsArrayRef}: IProps) {
  const graphModel = useGraphContentModelContext(),
    {plotType} = graphModel,
    pixiPoints = pixiPointsArrayRef.current?.[0],
    {startAnimation} = useDataDisplayAnimation(),
    instanceId = useInstanceIdContext(),
    marqueeState = useMemo<MarqueeState>(() => new MarqueeState(), []),
    dataset = useDataSetContext(),
    layout = useGraphLayoutContext(),
    xScale = layout.getAxisScale("bottom"),
    svgRef = useRef<SVGSVGElement>(null),
    belowPointsGroupRef = useRef<SVGGElement>(null),
    abovePointsGroupRef = useRef<SVGGElement>(null),
    backgroundSvgRef = useRef<SVGGElement>(null),
    pixiContainerRef = useRef<SVGForeignObjectElement>(null),
    prevAttrCollectionsMapRef = useRef<Record<string, string>>({}),
    xAttrID = graphModel.getAttributeID('x'),
    yAttrID = graphModel.getAttributeID('y')

  if (pixiPoints && pixiContainerRef.current && pixiContainerRef.current.children.length === 0) {
    pixiContainerRef.current.appendChild(pixiPoints.canvas)
    pixiPoints.setupBackgroundEventDistribution({
      elementToHide: pixiContainerRef.current
    })
  }

  useEffect(function handleFilteredCasesChange() {
    return mstReaction(
      () => graphModel.dataConfiguration.filteredCases.map(({ id }) => id),
      filteredCasesIds => {
        // filtered cases become empty when DataSet is deleted, for instance
        if ((filteredCasesIds.length === 0) && !isUndoingOrRedoing()) {
          graphController.clearGraph()
        } else {
          graphController.callMatchCirclesToData()
        }
      }, {name: "Graph.handleFilteredCasesChange", equals: comparer.structural}, graphModel
    )
  }, [graphController, graphModel])

  useEffect(function setupPlotArea() {
    if (xScale && xScale?.length > 0) {
      const plotBounds = layout.getComputedBounds('plot')
      const x = plotBounds?.left || 0
      const y = plotBounds?.top || 0
      const translate = `translate(${x}, ${y})`
      // Note that this division into plotArea1 and plotArea2 SVG group elements, along with the separate handling of
      // the Pixi container, is due to a Safari-specific bug. Apparently, Safari renders the position of foreign element
      // content incorrectly if it or its parent is translated. The only workaround, as of January 2024, is to use
      // the X and Y attributes of the foreignElement tag itself. See:
      // - https://www.pivotaltracker.com/story/show/186784214
      // - https://bugs.webkit.org/show_bug.cgi?id=219978
      // - https://github.com/bkrem/react-d3-tree/issues/284
      select(belowPointsGroupRef.current).attr("transform", translate)
      select(abovePointsGroupRef.current).attr("transform", translate)
      select(pixiContainerRef.current)
        .attr("x", x).attr("y", y) // translate won't work in Safari!
        .attr("width", `${Math.max(0, layout.plotWidth)}px`)
        .attr("height", `${Math.max(0, layout.plotHeight)}px`)

      pixiPoints?.resize(layout.plotWidth, layout.plotHeight)
    }
  }, [dataset, layout, layout.plotHeight, layout.plotWidth, pixiPoints, xScale])

  useEffect(function handleAttributeConfigurationChange() {
    // Handles attribute configuration changes from undo/redo, for instance, among others.
    // `initializeGraph()` has mechanisms to prevent running redundantly.
    return mstReaction(
      () => graphModel.dataConfiguration.attributeDescriptionsStr,
      () => graphController.syncAxisScalesWithModel(),
      {name: "Graph.handleAttributeConfigurationChange"}, graphModel)
  }, [graphController, graphModel])

  // Respond to collection addition/removal. Note that this can fire in addition to the collection
  // map changes reaction below, but that fires too early, so this gives the graph another chance.
  useEffect(() => {
    return dataset && mstReaction(
      () => dataset.syncCollectionLinksCount,
      () => {
        graphModel.dataConfiguration._updateFilteredCasesCollectionID()
        graphModel.dataConfiguration._invalidateCases()
        graphController.callMatchCirclesToData()
      }, { name: "Graph.mstReaction [syncCollectionLinksCount]" }, dataset)
  }, [dataset, graphController, graphModel.dataConfiguration])

  useEffect(function handleAttributeCollectionMapChange() {

    const constructAttrCollections = () => {
      const graphAttrs = graphModel.dataConfiguration.attributes
      const attrCollections: Record<string, string> = {}
      graphAttrs.forEach(attrId => {
        const collection = dataset?.getCollectionForAttribute(attrId)?.id
        collection && (attrCollections[attrId] = collection)
      })
      return attrCollections
    }

    prevAttrCollectionsMapRef.current = constructAttrCollections()

    return dataset && mstReaction(
      () => {
        return constructAttrCollections()
      },
      attrCollections => {
        Object.entries(prevAttrCollectionsMapRef.current).forEach(([attrId, collectionId]) => {
          if (!attrCollections[attrId]) { // attribute was removed
            graphModel.dataConfiguration.rolesForAttribute(attrId).forEach(role => {
              if (role === "yPlus") {
                graphModel.dataConfiguration.removeYAttributeWithID(attrId)
              } else {
                graphModel.setAttributeID(role as GraphAttrRole, "", "")
              }
            })
          }
          else if (attrCollections[attrId] !== collectionId) { // attribute was moved to a different collection
            // todo: Make sure this works once PT Story https://www.pivotaltracker.com/story/show/188117637 is fixed
            graphModel.dataConfiguration._updateFilteredCasesCollectionID()
            graphModel.dataConfiguration._invalidateCases()
            graphController.callMatchCirclesToData()
          }
        })
        prevAttrCollectionsMapRef.current = attrCollections
      }, {name: "handleAttrConfigurationChange", equals: comparer.structural}, dataset
    )
  }, [dataset, graphController, graphModel])

  const handleChangeAttribute = useCallback((place: GraphPlace, dataSet: IDataSet, attrId: string,
           attrIdToRemove = "") => {
    const computedPlace = place === 'plot' && graphModel.dataConfiguration.noAttributesAssigned ? 'bottom' : place
    const attrRole = graphPlaceToAttrRole[computedPlace]
    const attrName = dataset?.getAttribute(attrId || attrIdToRemove)?.name

    graphModel.applyModelChange(
      () => graphModel.setAttributeID(attrRole, dataSet.id, attrId),
      {
        undoStringKey: "DG.Undo.axisAttributeChange",
        redoStringKey: "DG.Redo.axisAttributeChange",
        log: logStringifiedObjectMessage(
              attrIdToRemove ? "attributeRemoved: %@" : "attributeAssigned: %@",
              { attribute: attrName, axis: place })
      }
    )
  }, [dataset, graphModel])

  /**
   * Only in the case that place === 'y' and there is more than one attribute assigned to the y-axis
   * do we have to do anything special. Otherwise, we can just call handleChangeAttribute.
   */
  const handleRemoveAttribute = useCallback((place: GraphPlace, idOfAttributeToRemove: string) => {
    if (place === 'left' && (graphModel.dataConfiguration.yAttributeDescriptions.length ?? 0) > 1) {
      graphModel.dataConfiguration.removeYAttributeWithID(idOfAttributeToRemove)
      const yAxisModel = graphModel.getAxis('left') as IAxisModel
      const yValues = graphModel.dataConfiguration.numericValuesForAttrRole('y') ?? []
      setNiceDomain(yValues, yAxisModel, graphModel.axisDomainOptions)
    } else {
      dataset && handleChangeAttribute(place, dataset, '', idOfAttributeToRemove)
    }
  }, [dataset, graphModel, handleChangeAttribute])

  const handleTreatAttrAs = useCallback((place: GraphPlace, _attrId: string, treatAs: AttributeType) => {
    const attrName = dataset?.getAttribute(_attrId)?.name
    dataset && graphModel.applyModelChange(() => {
      graphModel.dataConfiguration.setAttributeType(graphPlaceToAttrRole[place], treatAs)
      graphController?.handleAttributeAssignment()
    }, {
      undoStringKey: "V3.Undo.attributeTreatAs",
      redoStringKey: "V3.Redo.attributeTreatAs",
      log: logStringifiedObjectMessage(
            "plotAxisAttributeChangeType: %@",
            {axis: place, attribute: attrName, numeric: treatAs === 'numeric'})
    })
  }, [dataset, graphController, graphModel])

  // respond to assignment of new attribute ID
  useEffect(function handleNewAttributeID() {
    const disposer = graphModel && onAnyAction(graphModel, action => {
      if (isSetAttributeIDAction(action)) {
        startAnimation()
        graphController?.handleAttributeAssignment()
      }
    })
    return () => disposer?.()
  }, [graphController, layout, graphModel, startAnimation])

  const renderPlotComponent = () => {
    const props = {xAttrID, yAttrID, pixiPoints, abovePointsGroupRef},
      typeToPlotComponentMap = {
        casePlot: <CaseDots {...props}/>,
        dotChart: <DotChart {...props}/>,
        dotPlot: <DotPlotDots {...props}/>,
        scatterPlot: <ScatterDots {...props}/>
      }
    return typeToPlotComponentMap[plotType]
  }

  const renderDisplayOnlySelectedWarning = () => {
    const { displayOnlySelectedCases, filteredCases } = graphModel.dataConfiguration
    if (displayOnlySelectedCases && filteredCases[0].caseIds.length === 0) {
      const TEXT_ELEMENT_COUNT = 6
      const TEXT_LINE_HEIGHT = 16
      const TEXT_Y_OFFSET = 32
      return (
        <>
          {Array.from({ length: TEXT_ELEMENT_COUNT }).map((_, i) => (
            <text
              key={i}
              x={layout.plotWidth / 2}
              y={layout.plotHeight / 2 + i * TEXT_LINE_HEIGHT - TEXT_Y_OFFSET}
              data-testid="display-only-selected-warning"
              dominantBaseline="middle"
              textAnchor="middle"
            >
              {t(`DG.PlotBackgroundView.msg${i}`)}
            </text>
          ))}
        </>
      )
    }
  }

  const renderGraphAxes = () => {
    const places = AxisPlaces.filter((place: AxisPlace) => {
      return !!graphModel.getAxis(place)
    })
    return places.map((place: AxisPlace) => {
      return <GraphAxis key={place}
                        place={place}
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

  useGraphModel({pixiPoints, graphModel, instanceId})

  const getTipAttrs = useCallback((plotNum: number) => {
    const dataConfig = graphModel.dataConfiguration
    const roleAttrIDPairs = dataConfig.uniqueTipAttributes ?? []
    const yAttrIDs = dataConfig.yAttributeIDs
    return roleAttrIDPairs.filter(aPair => plotNum > 0 || aPair.role !== 'rightNumeric')
      .map(aPair => plotNum === 0 ? aPair.attributeID : aPair.role === 'y'
        ? (yAttrIDs?.[plotNum] ?? '') : aPair.attributeID)
  }, [graphModel.dataConfiguration])

  if (!isAlive(graphModel)) return null

  return (
    <GraphDataConfigurationContext.Provider value={graphModel.dataConfiguration}>
      <div className={clsx(kGraphClass, kPortalClass)} ref={graphRef} data-testid="graph">
        {graphModel.showParentToggles && <ParentToggles/>}
        <svg className='graph-svg' ref={svgRef}>
          <Background
            ref={backgroundSvgRef}
            marqueeState={marqueeState}
            pixiPointsArrayRef={pixiPointsArrayRef}
          />

          {renderGraphAxes()}
          {/*
            Note that this division into plotArea1 and plotArea2 SVG group elements, along with the separate handling of
            the Pixi container, is due to a Safari-specific bug. Apparently, Safari renders the position of foreign
            element content incorrectly if it or its parent is translated. The only workaround, as of January 2024, is
            to use the X and Y attributes of the foreignElement tag itself. See:
            - https://www.pivotaltracker.com/story/show/186784214
            - https://bugs.webkit.org/show_bug.cgi?id=219978
            - https://github.com/bkrem/react-d3-tree/issues/284
          */}
          <g className="below-points-group" ref={belowPointsGroupRef}>
            {/* Components rendered below the dots/points should be added to this group. */}
            {renderDisplayOnlySelectedWarning()}
            {renderPlotComponent()}
          </g>
          <foreignObject ref={pixiContainerRef} />
          <g className="above-points-group" ref={abovePointsGroupRef}>
            {/* Components rendered on top of the dots/points should be added to this group. */}
            <Marquee marqueeState={marqueeState}/>
          </g>

          <DroppablePlot
            graphElt={graphRef.current}
            plotElt={backgroundSvgRef.current}
            onDropAttribute={handleChangeAttribute}
          />
        </svg>
        <MultiLegend
          divElt={graphRef.current}
          onDropAttribute={handleChangeAttribute}
        />
        {renderDroppableAddAttributes()}
        <Adornments/>
        <DataTip
          dataConfiguration={graphModel.dataConfiguration}
          dataset={dataset}
          getTipAttrs={getTipAttrs}
          pixiPoints={pixiPoints}
          getTipText={graphModel.getTipText}
        />
      </div>
    </GraphDataConfigurationContext.Provider>
  )
})
// Graph.whyDidYouRender = true
