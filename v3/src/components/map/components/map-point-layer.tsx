import {comparer, reaction} from "mobx"
import * as PIXI from "pixi.js"
import {mstReaction} from "../../../utilities/mst-reaction"
import {onAnyAction} from "../../../utilities/mst-utils"
import React, {useCallback, useEffect, useRef} from "react"
import {useDebouncedCallback} from "use-debounce"
import {useMap} from "react-leaflet"
import {isSelectionAction, isSetCaseValuesAction} from "../../../models/data/data-set-actions"
import {defaultSelectedStroke, defaultSelectedStrokeWidth, defaultStrokeWidth} from "../../../utilities/color-utils"
import {DataTip} from "../../data-display/components/data-tip"
import {CaseData} from "../../data-display/d3-types"
import {
  computePointRadius, handleClickOnCase, matchCirclesToData, setPointSelection
} from "../../data-display/data-display-utils"
import {transitionDuration} from "../../data-display/data-display-types"
import {useDataDisplayAnimation} from "../../data-display/hooks/use-data-display-animation"
import {useDataDisplayLayout} from "../../data-display/hooks/use-data-display-layout"
import {latLongAttributesFromDataSet} from "../utilities/map-utils"
import {IPixiPointMetadata, PixiPoints} from "../../graph/utilities/pixi-points"
import {useMapModelContext} from "../hooks/use-map-model-context"
import {IMapPointLayerModel} from "../models/map-point-layer-model"

export const MapPointLayer = function MapPointLayer(props: {
  mapLayerModel: IMapPointLayerModel
}) {
  const {mapLayerModel} = props,
    {dataConfiguration, pointDescription} = mapLayerModel,
    dataset = dataConfiguration?.dataset,
    mapModel = useMapModelContext(),
    {isAnimating} = useDataDisplayAnimation(),
    leafletMap = useMap(),
    layout = useDataDisplayLayout(),
    pixiContainerRef = useRef<HTMLDivElement>(null),
    pixiPointsRef = useRef<PixiPoints>()

  useEffect(() => {
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
    return () => pixiPointsRef.current?.dispose()
  }, [])

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
    }
  }, [dataConfiguration.dataset])

  if (pixiPointsRef.current != null && pixiContainerRef.current && pixiContainerRef.current.children.length === 0) {
    pixiContainerRef.current.appendChild(pixiPointsRef.current.canvas)
    pixiPointsRef.current.resize(layout.contentWidth, layout.contentHeight)
  }

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
      pixiPointsRef, dataConfiguration, pointRadius: mapLayerModel.getPointRadius(), selectedPointRadius,
      pointColor, pointStrokeColor
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
      }

    const pixiPoints = pixiPointsRef.current
    if (!pixiPoints || !dataset) {
      return
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
      }, {name: "MapPointLayer.respondToLayoutChanges", equals: comparer.structural}
    )
  }, [layout, mapModel.leafletMapState, refreshPoints])

  // respond to attribute assignment changes
  useEffect(function setupResponseToLegendAttributeChange() {
    const disposer = mstReaction(
      () => {
        return [dataConfiguration?.attributeID('legend'), dataConfiguration?.attributeType('legend')]
      },
      () => {
        refreshPoints(false)
      }, {name: "setupResponseToLegendAttributeChange", equals: comparer.structural}, dataConfiguration
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

  const getTipAttrs = useCallback((plotNum: number) => {
    const dataConfig = mapLayerModel.dataConfiguration
    const roleAttrIDPairs = dataConfig.uniqueTipAttributes ?? []
    return roleAttrIDPairs.filter(aPair => plotNum > 0 || aPair.role !== 'rightNumeric')
      .map(aPair => aPair.attributeID)
  }, [mapLayerModel.dataConfiguration])

  return (
    <>
      <div ref={pixiContainerRef} className="map-dot-area" style={{width: "100%", height: "100%"}}/>
      <DataTip dataset={dataset} getTipAttrs={getTipAttrs} pixiPointsRef={pixiPointsRef}/>
    </>
  )
}
