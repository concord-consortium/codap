import {clsx} from "clsx"
import {select} from "d3"
import {comparer} from "mobx"
import {observer} from "mobx-react-lite"
import {IDisposer, isAlive} from "mobx-state-tree"
import React, {useCallback, useEffect, useMemo, useRef} from "react"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import { logStringifiedObjectMessage } from "../../../lib/log-message"
import { AttributeType, isCategoricalAttributeType } from "../../../models/data/attribute-types"
import {IDataSet} from "../../../models/data/data-set"
import {isUndoingOrRedoing} from "../../../models/history/tree-types"
import { getTileModel } from "../../../models/tiles/tile-model"
import { updateTileNotification } from "../../../models/tiles/tile-notifications"
import {mstAutorun} from "../../../utilities/mst-autorun"
import {mstReaction} from "../../../utilities/mst-reaction"
import {onAnyAction} from "../../../utilities/mst-utils"
import { t } from "../../../utilities/translation/translate"
import { setNiceDomain } from "../../axis/axis-domain-utils"
import {GraphPlace} from "../../axis-graph-shared"
import { AxisPlace, AxisPlaces, isAxisPlace } from "../../axis/axis-types"
import { IBaseNumericAxisModel } from "../../axis/models/base-numeric-axis-model"
import { If } from "../../common/if"
import { PointRendererArray } from "../../data-display/renderer"
import {Background} from "../../data-display/components/background"
import {DataTip} from "../../data-display/components/data-tip"
import {MultiLegend} from "../../data-display/components/legend/multi-legend"
import {Marquee} from "../../data-display/components/marquee"
import { NoWebGLContextPlaceholder } from "../../data-display/components/no-webgl-context-placeholder"
import {GraphAttrRole, graphPlaceToAttrRole, kPortalClass} from "../../data-display/data-display-types"
import {useDataDisplayAnimation} from "../../data-display/hooks/use-data-display-animation"
import {isSetAttributeIDAction} from "../../data-display/models/display-model-actions"
import {MarqueeState} from "../../data-display/models/marquee-state"
import { setNumberOfCategoriesLimit } from "../../axis/axis-utils"
import {Adornments} from "../adornments/components/adornments"
import {IPlotProps, kGraphClass, PlotType} from "../graphing-types"
import {useGraphContentModelContext} from "../hooks/use-graph-content-model-context"
import {GraphDataConfigurationContext} from "../hooks/use-graph-data-configuration-context"
import {useGraphLayoutContext} from "../hooks/use-graph-layout-context"
import {useGraphModel} from "../hooks/use-graph-model"
import {GraphController} from "../models/graph-controller"
import { attrChangeNotificationValues, IAttrChangeValues } from "../models/graph-notification-utils"
import { BarChart } from "../plots/bar-chart/bar-chart"
import { BinnedDotPlot } from "../plots/binned-dot-plot/binned-dot-plot"
import {CasePlot} from "../plots/case-plot/case-plot"
import { DotChart } from "../plots/dot-chart/dot-chart"
import { DotLinePlot } from "../plots/dot-plot/dot-line-plot"
import { Histogram } from "../plots/histogram/histogram"
import {ScatterPlot} from "../plots/scatter-plot/scatter-plot"
import { updateCellMasks } from "../utilities/graph-utils"
import {DroppableAddAttribute} from "./droppable-add-attribute"
import {DroppablePlot} from "./droppable-plot"
import {GraphAxis} from "./graph-axis"
import { ParentToggles } from "./parent-toggles"

import "./graph.scss"

const kParentTogglesHeight = 20

interface IProps {
  graphController: GraphController
  setGraphRef: (ref: HTMLDivElement | null) => void
  rendererArray: PointRendererArray
  /** Whether a context was requested and denied (for showing placeholder) */
  contextWasDenied?: boolean
  /** Whether the renderer is visible (not minimized or off-screen) */
  isRendererVisible?: boolean
  /** Callback to request a WebGL context with high priority (for user interaction) */
  onRequestContext?: () => void
}

export const Graph = observer(function Graph({
  graphController,
  setGraphRef,
  rendererArray,
  contextWasDenied = false,
  isRendererVisible = true,
  onRequestContext
}: IProps) {
  const graphModel = useGraphContentModelContext(),
    {plotType} = graphModel,
    renderer = rendererArray[0],
    {startAnimation} = useDataDisplayAnimation(),
    marqueeState = useMemo<MarqueeState>(() => new MarqueeState(), []),
    dataset = useDataSetContext(),
    layout = useGraphLayoutContext(),
    xScale = layout.getAxisScale("bottom"),
    svgRef = useRef<SVGSVGElement>(null),
    belowPointsGroupRef = useRef<SVGGElement>(null),
    abovePointsGroupRef = useRef<SVGGElement>(null),
    backgroundSvgRef = useRef<SVGGElement>(null),
    // Temporary HTML host to avoid <foreignObject> issues in Safari
    pixiContainerRef = useRef<HTMLDivElement>(null),
    prevAttrCollectionsMapRef = useRef<Record<string, string>>({}),
    graphRef = useRef<HTMLDivElement | null>(null)

  // Mount/update the pixi canvas when the renderer changes
  // This is in an effect to ensure it runs after the DOM is ready
  useEffect(() => {
    if (renderer?.canvas && pixiContainerRef.current) {
      const container = pixiContainerRef.current
      const currentCanvas = renderer.canvas
      // Check if the current canvas is already mounted
      if (!container.contains(currentCanvas)) {
        // Remove any old canvases (from previous renderers that were disposed)
        while (container.firstChild) {
          container.removeChild(container.firstChild)
        }
        container.appendChild(currentCanvas)
        renderer.setupBackgroundEventDistribution({
          elementToHide: container
        })
      }
    }
  }, [renderer])

  const mySetGraphRef = (ref: HTMLDivElement | null) => {
    graphRef.current = ref
    setGraphRef(ref)
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
      // Position the HTML host (absolute) to overlay the plot area
      const host = pixiContainerRef.current
      if (host) {
        const w = Math.max(0, layout.plotWidth)
        const h = Math.max(0, layout.plotHeight)
        host.style.position = "absolute"
        host.style.left = `${x}px`
        host.style.top = `${y}px`
        host.style.width = `${w}px`
        host.style.height = `${h}px`
        host.style.pointerEvents = "auto"
      }

      updateCellMasks({ dataConfig: graphModel.dataConfiguration, layout, renderer })
    }
  }, [dataset, graphModel.dataConfiguration, layout, layout.plotHeight, layout.plotWidth, renderer, xScale])

  useEffect(function handleSubPlotsUpdate() {
    return mstReaction(
      () => graphModel.dataConfiguration.categoricalAttrsWithChangeCounts,
      () => {
        updateCellMasks({ dataConfig: graphModel.dataConfiguration, layout, renderer })
      }, {name: "Graph.handleSubPlotsUpdate", equals: comparer.structural}, graphModel
    )
  }, [graphModel, layout, renderer])

  useEffect(function handleAttributeConfigurationChange() {
    // Handles attribute configuration changes from undo/redo, for instance, among others.
    // `initializeGraph()` has mechanisms to prevent running redundantly.
    return mstReaction(
      () => graphModel.dataConfiguration.attributeDescriptionsStr,
      () => graphController.syncAxisScalesWithModel(),
      {name: "Graph.handleAttributeConfigurationChange"}, graphModel)
  }, [graphController, graphModel])

  // Register parent toggles with the layout when they are shown
  useEffect(function handleParentTogglesChange() {
    return mstAutorun(() => {
      if (graphModel.showParentToggles) {
        layout.registerBanner("parentToggles", kParentTogglesHeight, 0)
      } else {
        layout.unregisterBanner("parentToggles")
      }
    }, { name: "Graph.handleParentTogglesChange" }, graphModel)
  }, [graphModel, layout])

  // Respond to collection addition/removal. Note that this can fire in addition to the collection
  // map changes reaction below, but that fires too early, so this gives the graph another chance.
  useEffect(() => {
    return dataset && mstReaction(
      () => dataset.syncCollectionLinksCount,
      () => {
        graphModel.dataConfiguration._updateFilteredCasesCollectionID()
        graphModel.dataConfiguration.invalidateCases()
        graphController.callMatchCirclesToData()
      }, { name: "Graph.mstReaction [syncCollectionLinksCount]" }, [dataset, graphModel.dataConfiguration])
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
            graphModel.dataConfiguration.invalidateCases()
            graphController.callMatchCirclesToData()
          }
        })
        prevAttrCollectionsMapRef.current = attrCollections
      }, {name: "handleAttrConfigurationChange", equals: comparer.structural}, [dataset, graphModel.dataConfiguration]
    )
  }, [dataset, graphController, graphModel])

  const handleChangeAttribute = useCallback((place: GraphPlace, dataSet: IDataSet, attrId: string,
           attrIdToRemove = "") => {
    const computedPlace = place === 'plot' && graphModel.dataConfiguration.noAttributesAssigned ? 'bottom' : place
    const attrRole = graphPlaceToAttrRole[computedPlace]
    const attribute = dataSet.getAttribute(attrId || attrIdToRemove)
    const attrName = attribute?.name
    const tile = getTileModel(graphModel)
    const notificationType = place === "legend" ? "legendAttributeChange" : "attributeChange"
    let notificationValues: IAttrChangeValues | undefined = undefined

    graphModel.applyModelChange(
      () => {
        // We need to call setNumberOfCategoriesLimit early to avoid potential performance bottlenecks
        isCategoricalAttributeType(attribute?.type) && isAxisPlace(place) &&
          setNumberOfCategoriesLimit(graphModel.dataConfiguration, place, layout)
        graphModel.setAttributeID(attrRole, dataSet.id, attrId)
        notificationValues = attrChangeNotificationValues(place, attrId, attrName, attrIdToRemove, tile)
      },
      {
        notify: () => updateTileNotification(notificationType, notificationValues, tile),
        undoStringKey: "DG.Undo.axisAttributeChange",
        redoStringKey: "DG.Redo.axisAttributeChange",
        log: logStringifiedObjectMessage(
              attrIdToRemove ? "Attribute removed: %@" : "Attribute assigned: %@",
              { attribute: attrName, axis: place }, "plot")
      }
    )
  }, [graphModel, layout])

  /**
   * Only in the case that place === 'y' and there is more than one attribute assigned to the y-axis
   * do we have to do anything special. Otherwise, we can just call handleChangeAttribute.
   */
  const handleRemoveAttribute = useCallback((place: GraphPlace, idOfAttributeToRemove: string) => {
    if (place === 'left' && (graphModel.dataConfiguration.yAttributeDescriptions.length ?? 0) > 1) {
      graphModel.dataConfiguration.removeYAttributeWithID(idOfAttributeToRemove)
      const yAxisModel = graphModel.getAxis('left') as IBaseNumericAxisModel
      const yValues = graphModel.dataConfiguration.numericValuesForAttrRole('y') ?? []
      setNiceDomain(yValues, yAxisModel, graphModel.plot.axisDomainOptions)
    } else {
      dataset && handleChangeAttribute(place, dataset, '', idOfAttributeToRemove)
    }
  }, [dataset, graphModel, handleChangeAttribute])

  const handleTreatAttrAs = useCallback((place: GraphPlace, _attrId: string, treatAs: AttributeType) => {
    const attrName = dataset?.getAttribute(_attrId)?.name
    dataset && graphModel.applyModelChange(() => {
      // We need to call setNumberOfCategoriesLimit early to avoid potential performance bottlenecks
      isCategoricalAttributeType(treatAs) && isAxisPlace(place) &&
        setNumberOfCategoriesLimit(graphModel.dataConfiguration, place, layout)
      graphModel.dataConfiguration.setAttributeType(graphPlaceToAttrRole[place], treatAs)
      graphController?.handleAttributeAssignment()
    }, {
      undoStringKey: "V3.Undo.attributeTreatAs",
      redoStringKey: "V3.Redo.attributeTreatAs",
      log: logStringifiedObjectMessage(
            "plotAxisAttributeChangeType: %@",
            {axis: place, attribute: attrName, numeric: treatAs === 'numeric'})
    })
  }, [dataset, graphController, graphModel, layout])

  // respond to assignment of new attribute ID
  useEffect(function handleNewAttributeID() {
    let disposer: Maybe<IDisposer>
    if (graphModel) {
      disposer = onAnyAction(graphModel, action => {
        const dataConfigActions = [
          "replaceYAttribute", "replaceYAttributes", "removeYAttributeAtIndex", "setAttribute", "setAttributeType"
        ]
        if (dataConfigActions.includes(action.name) || isSetAttributeIDAction(action)) {
          startAnimation()
          graphController?.handleAttributeAssignment()
        }
      })
    }
    return () => disposer?.()
  }, [graphController, layout, graphModel, startAnimation])

  const renderPlotComponent = () => {
    const props: IPlotProps = {renderer, abovePointsGroupRef},
      typeToPlotComponentMap: Record<PlotType, React.JSX.Element> = {
        casePlot: <CasePlot {...props}/>,
        dotChart: <DotChart {...props}/>,
        barChart: <BarChart {...props}/>,
        dotPlot: <DotLinePlot {...props}/>,
        binnedDotPlot: <BinnedDotPlot {...props}/>,
        histogram: <Histogram {...props}/>,
        linePlot: <DotLinePlot {...props}/>,
        scatterPlot: <ScatterPlot {...props}/>
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

  useGraphModel({graphModel})

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
      <div className={clsx(kGraphClass, kPortalClass)} ref={mySetGraphRef} data-testid="graph">
        {graphModel.showParentToggles && <ParentToggles/>}
        <svg className='graph-svg' ref={svgRef}>
          <Background
            ref={backgroundSvgRef}
            marqueeState={marqueeState}
            rendererArray={rendererArray}
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
        </svg>
        {/* HTML host for Pixi canvas to avoid Safari foreignObject issues */}
        <div ref={pixiContainerRef} className="pixi-points-host" />
        {/* Show placeholder when a context was requested but denied */}
        <If condition={contextWasDenied && isRendererVisible}>
          <NoWebGLContextPlaceholder
            width={layout.plotWidth}
            height={layout.plotHeight}
            left={layout.getComputedBounds('plot')?.left ?? 0}
            top={layout.getComputedBounds('plot')?.top ?? 0}
            onClick={onRequestContext}
          />
        </If>
        <svg className="overlay-svg">
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
          renderer={renderer}
          getTipText={graphModel.getTipText}
        />
      </div>
    </GraphDataConfigurationContext.Provider>
  )
})
// Graph.whyDidYouRender = true
