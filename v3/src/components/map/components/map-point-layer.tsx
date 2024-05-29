import React, {useCallback, useEffect, useRef} from "react"
import {comparer, reaction} from "mobx"
import { observer } from "mobx-react-lite"
import { isAlive } from "mobx-state-tree"
import * as PIXI from "pixi.js"
import {mstReaction} from "../../../utilities/mst-reaction"
import {onAnyAction} from "../../../utilities/mst-utils"
import {useDebouncedCallback} from "use-debounce"
import {useMap} from "react-leaflet"
import {isSelectionAction, isSetCaseValuesAction} from "../../../models/data/data-set-actions"
import {defaultSelectedStroke, defaultSelectedStrokeWidth, defaultStrokeWidth} from "../../../utilities/color-utils"
import {DataTip} from "../../data-display/components/data-tip"
import {CaseData} from "../../data-display/d3-types"
import {
  computePointRadius, handleClickOnCase, matchCirclesToData, setPointSelection
} from "../../data-display/data-display-utils"
import { IConnectingLineDescription, transitionDuration } from "../../data-display/data-display-types"
import {isDisplayItemVisualPropsAction} from "../../data-display/models/display-model-actions"
import {useDataDisplayAnimation} from "../../data-display/hooks/use-data-display-animation"
import {useDataDisplayLayout} from "../../data-display/hooks/use-data-display-layout"
import {latLongAttributesFromDataSet} from "../utilities/map-utils"
import {IPixiPointMetadata, PixiPoints} from "../../data-display/pixi/pixi-points"
import {useMapModelContext} from "../hooks/use-map-model-context"
import {IMapPointLayerModel} from "../models/map-point-layer-model"
import {MapPointGrid} from "./map-point-grid"
import { mstAutorun } from "../../../utilities/mst-autorun"
import { useInstanceIdContext } from "../../../hooks/use-instance-id-context"
import { useConnectingLines } from "../../data-display/hooks/use-connecting-lines"

interface IProps {
  mapLayerModel: IMapPointLayerModel
  onSetPixiPointsForLayer: (pixiPoints: PixiPoints, layerIndex: number) => void
}

export const MapPointLayer = observer(function MapPointLayer({mapLayerModel, onSetPixiPointsForLayer}: IProps) {
  const {dataConfiguration, pointDescription} = mapLayerModel,
    dataset = isAlive(dataConfiguration) ? dataConfiguration?.dataset : undefined,
    mapModel = useMapModelContext(),
    {isAnimating} = useDataDisplayAnimation(),
    leafletMap = useMap(),
    layout = useDataDisplayLayout(),
    instanceId = useInstanceIdContext(),
    pixiContainerRef = useRef<HTMLDivElement>(null),
    pixiPointsRef = useRef<PixiPoints>(),
    showConnectingLines = mapLayerModel.connectingLinesAreVisible,
    connectingLinesRef = useRef<SVGGElement>(null),
    connectingLinesActivatedRef = useRef(false)

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
      const caseData = dataset?.getCase(caseID, { numeric: false })
      if (caseData) {
        const lineCoords: [number, number] = [xValue, yValue]
        return { caseData, lineCoords }
      }
    }
  }, [dataset, leafletMap])

  const connectingLinesForCases = useCallback(() => {
    const lineDescriptions: IConnectingLineDescription[] = []
    dataset?.cases.forEach(c => {
        const cLine = connectingLine(c.__id__)
        cLine && lineDescriptions.push(cLine)
    })
    return lineDescriptions
  }, [connectingLine, dataset?.cases])

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
    clientType: "map", pixiPoints: pixiPointsRef.current, connectingLinesSvg: connectingLinesRef.current,
    connectingLinesActivatedRef, onConnectingLinesClick: handleConnectingLinesClick
  })

  useEffect(function createPixiPoints() {
    if (!pixiContainerRef.current) {
      return
    }
    pixiPointsRef.current = new PixiPoints({
      resizeTo: pixiContainerRef.current,
      // PixiPoints background should redistribute events to the geoJSON polygons that lie underneath.
      backgroundEventDistribution: {
        // Element that needs to be "hidden" to obtain another element at the current cursor position.
        elementToHide: pixiContainerRef.current
      }
    })
    onSetPixiPointsForLayer(pixiPointsRef.current, mapLayerModel.layerIndex)

    return () => pixiPointsRef.current?.dispose()
  }, [mapLayerModel.layerIndex, onSetPixiPointsForLayer])

  useEffect(() => {
    if (!pixiPointsRef.current) {
      return
    }
    pixiPointsRef.current.onPointClick = (event: PointerEvent, sprite: PIXI.Sprite, metadata: IPixiPointMetadata) => {
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
  }, [dataConfiguration.dataset, mapModel])

  useEffect(() => {
    if (pixiPointsRef.current != null && pixiContainerRef.current && pixiContainerRef.current.children.length === 0) {
      pixiContainerRef.current.appendChild(pixiPointsRef.current.canvas)
      pixiPointsRef.current.resize(layout.contentWidth, layout.contentHeight)
    }
  }, [layout.contentWidth, layout.contentHeight])

  const refreshConnectingLines = useCallback(() => {
    if (!showConnectingLines && !connectingLinesActivatedRef.current) return
    const connectingLines = connectingLinesForCases()
    // TODO: is this the right rule for parent grouping attribute? Seems like it
    // should depend on the collection(s) in which the plotted attributes reside.
    const parentAttr = (dataset?.collections.length ?? 0) > 1 ? dataset?.collections[0]?.attributes[0] : undefined
    const parentAttrID = parentAttr?.id
    const parentAttrName = parentAttr?.name
    const pointColorAtIndex = mapModel.pointDescription.pointColorAtIndex

    renderConnectingLines({ connectingLines, parentAttrID, parentAttrName, pointColorAtIndex, showConnectingLines })
  }, [connectingLinesForCases, dataset?.collections, mapModel.pointDescription.pointColorAtIndex, renderConnectingLines,
      showConnectingLines])

  const callMatchCirclesToData = useCallback(() => {
    if (mapLayerModel && dataConfiguration && layout && pixiPointsRef.current) {
      matchCirclesToData({
        dataConfiguration,
        pixiPoints: pixiPointsRef.current,
        pointRadius: mapLayerModel.getPointRadius(),
        instanceId: dataConfiguration.id,
        pointColor: pointDescription?.pointColor,
        pointStrokeColor: pointDescription?.pointStrokeColor,
        startAnimation: mapModel.startAnimation
      })
    }
  }, [dataConfiguration, layout, mapLayerModel, mapModel.startAnimation,
    pointDescription?.pointColor, pointDescription?.pointStrokeColor])

  const refreshPointSelection = useCallback(() => {
    const {pointColor, pointStrokeColor} = pointDescription,
      selectedPointRadius = mapLayerModel.getPointRadius('select')
    dataConfiguration && setPointSelection({
      pixiPoints: pixiPointsRef.current, dataConfiguration, pointRadius: mapLayerModel.getPointRadius(),
      selectedPointRadius, pointColor, pointStrokeColor
    })
  }, [pointDescription, mapLayerModel, dataConfiguration])

  const refreshPoints = useDebouncedCallback(async (selectedOnly: boolean) => {
    const lookupLegendColor = (aCaseData: CaseData) => {
        return dataConfiguration.attributeID('legend')
          ? dataConfiguration.getLegendColorForCase(aCaseData.caseID)
          : pointColor
      },
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
      },
      layerIsVisible = mapLayerModel.isVisible,
      pointsAreVisible = mapLayerModel.pointsAreVisible
    const pixiPoints = pixiPointsRef.current
    if (!pixiPoints || !dataset) {
      return
    }
    if (!(layerIsVisible && pointsAreVisible && pixiPointsRef.current?.isVisible)) {
      pixiPointsRef.current?.setVisibility(false)
      return
    }
    if (layerIsVisible && pointsAreVisible && !pixiPointsRef.current?.isVisible) {
      pixiPointsRef.current?.setVisibility(true)
    }
    const pointRadius = computePointRadius(dataConfiguration.caseDataArray.length,
        pointDescription.pointSizeMultiplier)
    const selectedPointRadius = computePointRadius(dataConfiguration.caseDataArray.length,
        pointDescription.pointSizeMultiplier, 'select')
    const {pointColor, pointStrokeColor} = pointDescription
    const getLegendColor = dataConfiguration?.attributeID('legend')
        ? dataConfiguration?.getLegendColorForCase : undefined
    const {latId, longId} = latLongAttributesFromDataSet(dataset)

    await pixiPoints.transition(() => {
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
    }, { duration: isAnimating() ? transitionDuration : 0 })
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
        } else if (["addCases", "removeCases"].includes(action.name)) {
          refreshPoints(false)
        }
      })
      return () => disposer()
    }
  }, [dataset, refreshPoints, refreshPointSelection])

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
      }, {name: "MapPointLayer.respondToLayoutChanges", equals: comparer.structural}
    )
  }, [layout, mapModel.leafletMapState, refreshConnectingLines, refreshPoints])

  // respond to attribute assignment changes
  useEffect(function setupResponseToLegendAttributeChange() {
    const disposer = mstReaction(
      () => {
        return [dataConfiguration?.attributeID('legend'), dataConfiguration?.attributeType('legend')]
      },
      () => {
        refreshPoints(false)
      }, {name: "MapPointLayer.respondToLegendAttributeChange", equals: comparer.structural}, dataConfiguration
    )
    return () => disposer()
  }, [refreshPoints, dataConfiguration])

  useEffect(function setupResponseToChangeInNumberOfCases() {
    return mstReaction(
      () => dataConfiguration?.caseDataArray.length,
      () => {
        callMatchCirclesToData()
        refreshPoints(false)
      }, {name: "MapPointLayer.setupResponseToChangeInNumberOfCases", fireImmediately: true}, dataConfiguration
    )
  }, [callMatchCirclesToData, dataConfiguration, refreshPoints])

  // respond to visual item properties change
  useEffect(function respondToDisplayItemVisualPropsAction() {
    const disposer = onAnyAction(mapLayerModel, action => {
      if (isDisplayItemVisualPropsAction(action)) {
        callMatchCirclesToData()
      }
    })
    return () => disposer()
  }, [callMatchCirclesToData, mapLayerModel])

  // respond to change in layer visibility
  useEffect(function respondToLayerVisibilityChange() {
    return mstReaction(() => {
        return { layerIsVisible: mapLayerModel.isVisible, pointsAreVisible: mapLayerModel.pointsAreVisible}
      },
      ({layerIsVisible, pointsAreVisible}) => {
        if (layerIsVisible && pointsAreVisible && !pixiPointsRef.current?.isVisible) {
          pixiPointsRef.current?.setVisibility(true)
          refreshPoints(false)
        }
        else if (!(layerIsVisible && pointsAreVisible) && pixiPointsRef.current?.isVisible) {
          pixiPointsRef.current?.setVisibility(false)
        }
      },
      {name: "MapPointLayer.respondToLayerVisibilityChange"}, mapLayerModel
    )
  }, [mapLayerModel, callMatchCirclesToData, layout.contentWidth, layout.contentHeight, refreshPoints])

  // respond to point properties change
  useEffect(function respondToPointVisualChange() {
    return mstReaction(() => {
        const { pointColor, pointStrokeColor, pointStrokeSameAsFill, pointSizeMultiplier } =
          mapLayerModel.pointDescription
        return [pointColor, pointStrokeColor, pointStrokeSameAsFill, pointSizeMultiplier]
      },
      () => callMatchCirclesToData(),
      {name: "MapPointLayer.respondToPointVisualChange"}, mapLayerModel
    )
  }, [callMatchCirclesToData, mapLayerModel])

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
      <svg style={{height: "100%", position: "absolute", width: "100%", zIndex: 11}}>
        <g data-testid={`connecting-lines-${instanceId}`} className="connecting-lines" ref={connectingLinesRef}/>
      </svg>
      <div ref={pixiContainerRef} className="map-dot-area"/>
      <MapPointGrid mapLayerModel={mapLayerModel} />
      <DataTip
        dataset={dataset}
        getTipAttrs={getTipAttrs}
        pixiPoints={pixiPointsRef.current}
        getTipText={mapModel.getTipText}
      />
    </>
  )
})
