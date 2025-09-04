import React, {useCallback, useEffect, useRef, useState} from "react"
import {comparer, reaction} from "mobx"
import { observer } from "mobx-react-lite"
import { isAlive } from "mobx-state-tree"
import * as PIXI from "pixi.js"
import {useMap} from "react-leaflet"
import simpleheat from "simpleheat"
import {useDebouncedCallback} from "use-debounce"
import { select } from "d3"
import {isSelectionAction, isSetCaseValuesAction} from "../../../models/data/data-set-actions"
import { firstVisibleParentAttribute, idOfChildmostCollectionForAttributes } from "../../../models/data/data-set-utils"
import {defaultSelectedStroke, defaultSelectedStrokeWidth, defaultStrokeWidth} from "../../../utilities/color-utils"
import { mstAutorun } from "../../../utilities/mst-autorun"
import {mstReaction} from "../../../utilities/mst-reaction"
import {onAnyAction} from "../../../utilities/mst-utils"
import {DataTip} from "../../data-display/components/data-tip"
import {CaseData} from "../../data-display/d3-types"
import {
  computePointRadius, handleClickOnCase, matchCirclesToData, setPointSelection
} from "../../data-display/data-display-utils"
import { IConnectingLineDescription } from "../../data-display/data-display-types"
import {isDisplayItemVisualPropsAction} from "../../data-display/models/display-model-actions"
import {useDataDisplayLayout} from "../../data-display/hooks/use-data-display-layout"
import {latLongAttributesFromDataSet} from "../utilities/map-utils"
import {IPixiPointMetadata, PixiPoints} from "../../data-display/pixi/pixi-points"
import {useMapModelContext} from "../hooks/use-map-model-context"
import {IMapPointLayerModel} from "../models/map-point-layer-model"
import {MapPointGrid} from "./map-point-grid"
import { useInstanceIdContext } from "../../../hooks/use-instance-id-context"
import { useConnectingLines } from "../../data-display/hooks/use-connecting-lines"

import "./map-point-layer.scss"

interface IProps {
  mapLayerModel: IMapPointLayerModel
  setPixiPointsLayer: (pixiPoints: PixiPoints, layerIndex: number) => void
}

export const MapPointLayer = observer(function MapPointLayer({mapLayerModel, setPixiPointsLayer}: IProps) {
  const {dataConfiguration, pointDescription} = mapLayerModel,
    dataset = isAlive(dataConfiguration) ? dataConfiguration?.dataset : undefined,
    mapModel = useMapModelContext(),
    leafletMap = useMap(),
    layout = useDataDisplayLayout(),
    instanceId = useInstanceIdContext(),
    pixiContainerRef = useRef<HTMLDivElement>(null),
    [pixiPoints, setPixiPoints] = useState<PixiPoints>(),
    showConnectingLines = mapLayerModel.connectingLinesAreVisible,
    connectingLinesRef = useRef<SVGGElement>(null),
    connectingLinesActivatedRef = useRef(false),
    heatmapCanvasRef = useRef<HTMLCanvasElement|null>(null),
    simpleheatRef = useRef<simpleheat.Instance>()

  const connectingLine = useCallback((caseID: string) => {
    if (!dataset) return
    const {latId, longId} = latLongAttributesFromDataSet(dataset)
    const getCoords = (anID: string) => {
      const long = dataset.getNumeric(anID, longId) || 0,
        lat = dataset?.getNumeric(anID, latId) || 0
      return leafletMap.latLngToContainerPoint([lat, long])
    },
    getScreenX = (anID: string) => {
      const coords = getCoords(anID)
      return coords.x
    },
    getScreenY = (anID: string) => {
      const coords = getCoords(anID)
      return coords.y
    }
    const xValue = getScreenX(caseID)
    const yValue = getScreenY(caseID)
    if (isFinite(xValue) && isFinite(yValue)) {
      const caseData = dataset?.getFirstItemForCase(caseID, { numeric: false })
      if (caseData) {
        const lineCoords: [number, number] = [xValue, yValue]
        return { caseData, lineCoords }
      }
    }
  }, [dataset, leafletMap])

  const connectingLinesForCases = useCallback(() => {
    const lineDescriptions: IConnectingLineDescription[] = []
    dataConfiguration?.getCaseDataArray(0).forEach(c => {
        const cLine = connectingLine(c.caseID)
        cLine && lineDescriptions.push(cLine)
    })
    return lineDescriptions
  }, [connectingLine, dataConfiguration])

  const handleConnectingLinesClick = useCallback(() => {
    // temporarily ignore leaflet clicks to prevent the map click handler
    // from deselecting the points.
    const wasIgnoringClicks = mapModel._ignoreLeafletClicks
    if (!wasIgnoringClicks) {
      mapModel.ignoreLeafletClicks(true)
      // Restore leaflet click handling once the current click has been handled
      setTimeout(() => mapModel.ignoreLeafletClicks(false), 10)
    }
  }, [mapModel])

  const { renderConnectingLines } = useConnectingLines({
    clientType: "map", pixiPoints, connectingLinesSvg: connectingLinesRef.current,
    connectingLinesActivatedRef, onConnectingLinesClick: handleConnectingLinesClick
  })

  useEffect(function createPixiPoints() {
    let _pixiPoints: PixiPoints

    async function initPixiPoints() {
      if (!pixiContainerRef.current) {
        return
      }
      _pixiPoints = new PixiPoints()
      await _pixiPoints.init({
        resizeTo: pixiContainerRef.current,
        // PixiPoints background should redistribute events to the geoJSON polygons that lie underneath.
        backgroundEventDistribution: {
          // Element that needs to be "hidden" to obtain another element at the current cursor position.
          elementToHide: pixiContainerRef.current
        }
      })
      setPixiPoints(_pixiPoints)
      setPixiPointsLayer(_pixiPoints, mapLayerModel.layerIndex)
    }
    initPixiPoints()

    return () => {
      _pixiPoints?.dispose()
    }
  }, [mapLayerModel.layerIndex, setPixiPointsLayer])

  // TODO: Deleted attributes should be removed from the DataConfiguration, in
  // which case the additional validation via the DataSet would be unnecessary.
  const legendAttributeId = dataConfiguration.attributeID('legend')
  const legendAttribute = dataset?.getAttribute(legendAttributeId)
  const getLegendColor = legendAttribute ? dataConfiguration?.getLegendColorForCase : undefined
  const lookupLegendColor = (aCaseData: CaseData) => {
    return dataConfiguration.getLegendColorForCase(aCaseData.caseID) || pointDescription.pointColor
  }

  // Manage the heatmap
  const { isVisible: layerIsVisible, pointsAreVisible, displayType } = mapLayerModel
  const displayHeatmap = displayType === "heatmap" && pointsAreVisible && layerIsVisible && legendAttributeId
  // Since the canvas is only rendered when the heatmap is visible,
  // we need to initizlize simpleheat with it whenever displayHeatmap becomes true.
  useEffect(() => {
    if (displayHeatmap && heatmapCanvasRef.current) {
      simpleheatRef.current = simpleheat(heatmapCanvasRef.current)
      // Add shutterbug support. See: shutterbug-support.ts.
      heatmapCanvasRef.current.classList.add("canvas-3d")
    }
  }, [displayHeatmap])
  // Actually update the heatmap
  const refreshHeatmap = useDebouncedCallback(() => {
    if (!(heatmapCanvasRef.current && dataset && simpleheatRef.current)) return

    // Reset simpleheat
    simpleheatRef.current.clear()
    simpleheatRef.current.resize()

    // If we should draw the heatmap, update simpleheat
    if (displayHeatmap) {
      // For some reason, the simpleheat canvas always changes to 300x150, so we have to scale the positions accordingly
      const mapContainer = leafletMap.getContainer()
      const mapRect = mapContainer.getBoundingClientRect()
      const scaleX = 300 / mapRect.width
      const scaleY = 150 / mapRect.height
      const averageScale = (scaleX + scaleY) / 2

      // Update the radius
      const minRadius = .25 // simpleheat will crash with a radius less than ~.25
      // When a Codap document first loads, leaflet does not have a zoom, so we use the model zoom instead.
      // At other times the model zoom is one frame behind so the leaflet zoom is generally preferable.
      const zoom = mapModel.leafletMapState.zoom ?? (mapModel.zoom >= 0 ? mapModel.zoom : 1)
      const pointRadius = Math.max(minRadius,
        computePointRadius(dataConfiguration.getCaseDataArray(0).length, pointDescription.pointSizeMultiplier))
      const baseMultiplier = .5
      const radius = pointRadius * baseMultiplier * zoom * averageScale
      const blurMultiplier = 2 / 3
      simpleheatRef.current.radius(radius, radius * blurMultiplier)

      // Update the gradient
      const colors = dataConfiguration.choroplethColors
      const gradient: Record<number, string> = {}
      colors.forEach((color, i) => {
        // Low values have low opacity, so we start at .5 to make sure the low color is actually visible
        gradient[.5 + (i / colors.length / 2)] = color
      })
      simpleheatRef.current.gradient(gradient)

      // Find the min and max values
      let minValue = Infinity
      let maxValue = -Infinity
      dataConfiguration.joinedCaseDataArrays.forEach(c => {
        const { caseID } = c
        const value = dataset.getNumeric(caseID, legendAttributeId)
        maxValue = Math.max(maxValue, value ?? -Infinity)
        minValue = Math.min(minValue, value ?? Infinity)
      })

      // Add the data to the heatmap
      const { latId, longId } = latLongAttributesFromDataSet(dataset)
      dataConfiguration.joinedCaseDataArrays.forEach(c => {
        const { caseID } = c
        const value = dataset.getNumeric(caseID, legendAttributeId) || minValue
        const normalizedValue = (value - minValue) / (maxValue - minValue)
        const long = dataset.getNumeric(caseID, longId) || 0
        const lat = dataset.getNumeric(caseID, latId) || 0
        const point = leafletMap.latLngToContainerPoint([lat, long])
        simpleheatRef.current?.add([point.x * scaleX, point.y * scaleY, normalizedValue])
      })
    }

    // Draw the heatmap
    simpleheatRef.current.draw()
  }, 10)

  useEffect(() => {
    if (!pixiPoints) {
      return
    }
    pixiPoints.onPointClick = (event: PointerEvent, sprite: PIXI.Sprite, metadata: IPixiPointMetadata) => {
      handleClickOnCase(event, metadata.caseID, dataConfiguration.dataset)
      // TODO PIXI: this doesn't seem to work in pixi. Note that this click will be propagated to the map container
      // and handled by its click handler (which will deselect the point). The current workaround is to disable
      // point deselection on map click, but it needs to be addressed better.
      event.stopPropagation()
      // We prevent the default action to avoid the map click handler deselecting the point
      const wasIgnoringClicks = mapModel._ignoreLeafletClicks
      if (!wasIgnoringClicks) {
        mapModel.ignoreLeafletClicks(true)
        // restore click handling once the current click has been handled
        setTimeout(() => mapModel.ignoreLeafletClicks(false), 10)
      }
    }
  }, [dataConfiguration.dataset, mapModel, pixiPoints])

  useEffect(() => {
    if (pixiPoints?.canvas && pixiContainerRef.current && pixiContainerRef.current.children.length === 0) {
      pixiContainerRef.current.appendChild(pixiPoints.canvas)
      pixiPoints.resize(layout.contentWidth, layout.contentHeight)
    }
  }, [layout.contentWidth, layout.contentHeight, pixiPoints])

  const refreshConnectingLines = useCallback(() => {
    if (!showConnectingLines && !connectingLinesActivatedRef.current) return
    const connectingLines = connectingLinesForCases()
    const childmostCollectionId = idOfChildmostCollectionForAttributes(dataConfiguration?.attributes ?? [], dataset)
    const parentAttr = firstVisibleParentAttribute(dataset, childmostCollectionId)
    const parentAttrID = parentAttr?.id
    const parentAttrName = parentAttr?.name
    const pointColorAtIndex = mapModel.pointDescription.pointColorAtIndex

    // Remove all existing connecting lines before rendering new ones to prevent duplicates
    if (connectingLinesRef.current) {
      const connectingLinesArea = select(connectingLinesRef.current)
      connectingLinesArea.selectAll("path").remove()
    }

    renderConnectingLines({ connectingLines, parentAttrID, parentAttrName, pointColorAtIndex, showConnectingLines })
  }, [connectingLinesForCases, dataConfiguration, dataset, mapModel.pointDescription.pointColorAtIndex,
      renderConnectingLines, showConnectingLines])

  const callMatchCirclesToData = useCallback(() => {
    if (mapLayerModel && dataConfiguration && layout && pixiPoints) {
      matchCirclesToData({
        dataConfiguration,
        pixiPoints,
        pointRadius: mapLayerModel.getPointRadius(),
        instanceId: dataConfiguration.id,
        pointColor: pointDescription?.pointColor,
        pointStrokeColor: pointDescription?.pointStrokeColor,
        startAnimation: mapModel.startAnimation
      })
    }
  }, [dataConfiguration, layout, mapLayerModel, mapModel.startAnimation, pointDescription, pixiPoints])

  const refreshPointSelection = useCallback(() => {
    const {pointColor, pointStrokeColor} = pointDescription,
      selectedPointRadius = mapLayerModel.getPointRadius('select')
    dataConfiguration && setPointSelection({
      pixiPoints, dataConfiguration, pointRadius: mapLayerModel.getPointRadius(),
      selectedPointRadius, pointColor, pointStrokeColor
    })
  }, [pointDescription, mapLayerModel, dataConfiguration, pixiPoints])

  const displayPoints = displayType === "points" && pointsAreVisible && layerIsVisible
  const refreshPoints = useDebouncedCallback(async (selectedOnly: boolean) => {
    const {pointSizeMultiplier, pointStrokeColor} = pointDescription,
      getCoords = (anID: string) => {
        const long = dataset?.getNumeric(anID, longId) || 0,
          lat = dataset?.getNumeric(anID, latId) || 0
        return leafletMap.latLngToContainerPoint([lat, long])
      },
      getScreenX = (anID: string) => {
        const coords = getCoords(anID)
        return coords.x
      },
      getScreenY = (anID: string) => {
        const coords = getCoords(anID)
        return coords.y
      }
    if (!pixiPoints || !dataset) {
      return
    }
    if (!(displayPoints && pixiPoints.isVisible)) {
      pixiPoints?.setVisibility(false)
      return
    }
    if (displayPoints && !pixiPoints.isVisible) {
      pixiPoints?.setVisibility(true)
    }
    const pointRadius = computePointRadius(dataConfiguration.getCaseDataArray(0).length, pointSizeMultiplier)
    const selectedPointRadius = computePointRadius(dataConfiguration.getCaseDataArray(0).length,
        pointSizeMultiplier, 'select')
    const {latId, longId} = latLongAttributesFromDataSet(dataset)

    pixiPoints.forEachPoint((point: PIXI.Sprite, metadata: IPixiPointMetadata) => {
      const {caseID} = metadata
      pixiPoints.setPointPosition(point, getScreenX(caseID), getScreenY(caseID))
      pixiPoints.setPointStyle(point, {
        radius: dataset?.isCaseSelected(caseID) ? selectedPointRadius : pointRadius,
        fill: lookupLegendColor(metadata),
        stroke: getLegendColor && dataset?.isCaseSelected(caseID)
          ? defaultSelectedStroke : pointStrokeColor,
        strokeWidth: getLegendColor && dataset?.isCaseSelected(caseID)
          ? defaultSelectedStrokeWidth : defaultStrokeWidth
      })
    }, { selectedOnly })

    refreshPointSelection()
  }, 10)

  // Actions in the dataset can trigger need for point updates
  useEffect(function setupResponsesToDatasetActions() {
    if (dataset) {
      const disposer = onAnyAction(dataset, action => {
        if (isSelectionAction(action)) {
          refreshPointSelection()
        } else if (isSetCaseValuesAction(action)) {
          // assumes that if we're caching then only selected cases are being updated
          refreshPoints(dataset.isCaching())
          refreshHeatmap()
        } else if (["addCases", "removeCases"].includes(action.name)) {
          refreshPoints(false)
          refreshHeatmap()
        }
      })
      return () => disposer()
    }
  }, [dataset, refreshPoints, refreshHeatmap, refreshPointSelection])

  useEffect(() => {
    return mstReaction(
      () => dataConfiguration?.legendColorDomain,
      () => {
        refreshPoints(false)
        refreshHeatmap()
      },
      {name: "MapPointLayer [legendColorChange]", fireImmediately: true}, dataConfiguration)
  }, [dataConfiguration, refreshHeatmap, refreshPoints])

  // Changes in layout or map pan/zoom require repositioning points
  useEffect(function setupResponsesToLayoutChanges() {
    return reaction(
      () => {
        const { contentWidth, contentHeight } = layout
        const { center, zoom } = mapModel.leafletMapState
        return { contentWidth, contentHeight, center, zoom }
      },
      () => {
        refreshPoints(false)
        refreshConnectingLines()
        refreshHeatmap()
      }, {name: "MapPointLayer.respondToLayoutChanges", equals: comparer.structural}
    )
  }, [layout, mapModel.leafletMapState, refreshConnectingLines, refreshHeatmap, refreshPoints])

  // respond to attribute assignment changes
  useEffect(function setupResponseToLegendAttributeChange() {
    const disposer = mstReaction(
      () => [dataConfiguration?.attributeID('legend'), dataConfiguration?.attributeType('legend')],
      () => {
        refreshPoints(false)
        refreshHeatmap()
      },
      {name: "MapPointLayer.respondToLegendAttributeChange", equals: comparer.structural}, dataConfiguration
    )
    return () => disposer()
  }, [refreshHeatmap, refreshPoints, dataConfiguration])

  useEffect(function setupResponseToChangeInCases() {
    return mstReaction(
      () => dataConfiguration?.caseDataHash,
      () => {
        callMatchCirclesToData()
        refreshPoints(false)
        refreshHeatmap()
      }, {name: "MapPointLayer.setupResponseToChangeInCases", fireImmediately: true}, dataConfiguration
    )
  }, [callMatchCirclesToData, dataConfiguration, refreshHeatmap, refreshPoints])

  // respond to visual item properties change
  useEffect(function respondToDisplayItemVisualPropsAction() {
    const disposer = onAnyAction(mapLayerModel, action => {
      if (isDisplayItemVisualPropsAction(action)) {
        refreshPoints(false)
        refreshHeatmap()
      }
    })
    return () => disposer()
  }, [refreshHeatmap, refreshPoints, mapLayerModel])

  // respond to change in layer visibility
  useEffect(function respondToLayerVisibilityChange() {
    return mstReaction(() => {
        return {
          reactionDisplayPoints: mapLayerModel.displayType === "points",
          reactionLayerIsVisible: mapLayerModel.isVisible,
          reactionPointsAreVisible: mapLayerModel.pointsAreVisible
        }
      },
      ({ reactionDisplayPoints, reactionLayerIsVisible, reactionPointsAreVisible }) => {
        if (reactionLayerIsVisible && reactionPointsAreVisible && reactionDisplayPoints && !pixiPoints?.isVisible) {
          pixiPoints?.setVisibility(true)
          refreshPoints(false)
        }
        else if (
          !(reactionLayerIsVisible && reactionPointsAreVisible && reactionDisplayPoints) && pixiPoints?.isVisible
        ) {
          pixiPoints?.setVisibility(false)
        }
        refreshHeatmap()
      },
      {name: "MapPointLayer.respondToLayerVisibilityChange"}, mapLayerModel
    )
  }, [mapLayerModel, refreshHeatmap, refreshPoints, pixiPoints])

  // respond to point properties change
  useEffect(function respondToPointVisualChange() {
    return mstReaction(() => {
        const { pointColor, pointStrokeColor, pointStrokeSameAsFill, pointSizeMultiplier } =
          mapLayerModel.pointDescription
        return [pointColor, pointStrokeColor, pointStrokeSameAsFill, pointSizeMultiplier]
      },
      () => {
        refreshPoints(false)
        refreshHeatmap()
      },
      {name: "MapPointLayer.respondToPointVisualChange"}, mapLayerModel
    )
  }, [mapLayerModel, refreshHeatmap, refreshPoints])

  // Call refreshConnectingLines when Connecting Lines option is switched on and when all
  // points are selected.
  useEffect(function updateConnectingLines() {
    return mstAutorun(() => {
      refreshConnectingLines()
    }, { name: "MapPointLayer.updateConnectingLines" }, mapLayerModel)
  }, [dataConfiguration.selection, mapLayerModel, refreshConnectingLines, showConnectingLines])

  const getTipAttrs = useCallback((plotNum: number) => {
    const dataConfig = mapLayerModel.dataConfiguration
    const roleAttrIDPairs = dataConfig.uniqueTipAttributes ?? []
    return roleAttrIDPairs.filter(aPair => plotNum > 0 || aPair.role !== 'rightNumeric')
      .map(aPair => aPair.attributeID)
  }, [mapLayerModel.dataConfiguration])

  return (
    <>
      <svg style={{height: "100%", position: "absolute", width: "100%", zIndex: 11,
          visibility: showConnectingLines ? "visible" : "hidden"}}>
        <g data-testid={`connecting-lines-${instanceId}`} className="connecting-lines" ref={connectingLinesRef}/>
      </svg>
      <div ref={pixiContainerRef} className="map-dot-area"/>
      <MapPointGrid mapLayerModel={mapLayerModel} />
      {displayHeatmap && (
        <div className="heatmap-area">
          <canvas ref={heatmapCanvasRef} className="heatmap-canvas" />
        </div>
      )}
      <DataTip
        dataset={dataset}
        getTipAttrs={getTipAttrs}
        pixiPoints={pixiPoints}
        getTipText={mapModel.getTipText}
      />
    </>
  )
})
