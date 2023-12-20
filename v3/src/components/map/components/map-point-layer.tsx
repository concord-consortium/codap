import {comparer, reaction} from "mobx"
import {mstReaction} from "../../../utilities/mst-reaction"
import {onAnyAction} from "../../../utilities/mst-utils"
import React, {useCallback, useEffect, useRef} from "react"
import {useDebouncedCallback} from "use-debounce"
import {useMap} from "react-leaflet"
import {isSelectionAction, isSetCaseValuesAction} from "../../../models/data/data-set-actions"
import {defaultSelectedStroke, defaultSelectedStrokeWidth, defaultStrokeWidth} from "../../../utilities/color-utils"
import {CaseData, DotsElt, selectDots} from "../../data-display/d3-types"
import {computePointRadius, matchCirclesToData, setPointSelection} from "../../data-display/data-display-utils"
import {transitionDuration} from "../../data-display/data-display-types"
import {useDataDisplayAnimation} from "../../data-display/hooks/use-data-display-animation"
import {useDataDisplayLayout} from "../../data-display/hooks/use-data-display-layout"
import {useDataTips} from "../../data-display/hooks/use-data-tips"
import {latLongAttributesFromDataSet} from "../utilities/map-utils"
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
    dotsRef = useRef<DotsElt>(null)

  useDataTips({dotsRef, dataset, displayModel: mapLayerModel})

  const callMatchCirclesToData = useCallback(() => {
    if (mapLayerModel && dataConfiguration && layout && dotsRef.current) {
      matchCirclesToData({
        dataConfiguration,
        dotsElement: dotsRef.current,
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
      dotsRef, dataConfiguration, pointRadius: mapLayerModel.getPointRadius(), selectedPointRadius,
      pointColor, pointStrokeColor
    })
  }, [pointDescription, mapLayerModel, dataConfiguration])

  const refreshPoints = useDebouncedCallback((selectedOnly: boolean) => {
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

    if (!dotsRef.current || !dataset) return
    const
      theSelection = selectDots(dotsRef.current, selectedOnly),
      duration = isAnimating() ? transitionDuration : 0,
      pointRadius = computePointRadius(dataConfiguration.caseDataArray.length,
        pointDescription.pointSizeMultiplier),
      selectedPointRadius = computePointRadius(dataConfiguration.caseDataArray.length,
        pointDescription.pointSizeMultiplier, 'select'),
      {pointColor, pointStrokeColor} = pointDescription,
      getLegendColor = dataConfiguration?.attributeID('legend')
        ? dataConfiguration?.getLegendColorForCase : undefined,
      {latId, longId} = latLongAttributesFromDataSet(dataset)
    if (theSelection?.size()) {
      theSelection
        .attr('cx', (aCaseData: CaseData) => getScreenX(aCaseData.caseID))
        .attr('cy', (aCaseData: CaseData) => getScreenY(aCaseData.caseID))
        .transition()
        .duration(duration)
        .attr('r', (aCaseData: CaseData) => dataset?.isCaseSelected(aCaseData.caseID)
          ? selectedPointRadius : pointRadius)
        .style('fill', (aCaseData: CaseData) => lookupLegendColor(aCaseData))
        .style('stroke', (aCaseData: CaseData) =>
          (getLegendColor && dataset?.isCaseSelected(aCaseData.caseID))
            ? defaultSelectedStroke : pointStrokeColor)
        .style('stroke-width', (aCaseData: CaseData) =>
          (getLegendColor && dataset?.isCaseSelected(aCaseData.caseID))
            ? defaultSelectedStrokeWidth : defaultStrokeWidth)
        // this calls refreshPointSelection for _each_ point, e.g. 858 times for the four seals data
        // .on('end', refreshPointSelection)
    }
  }, 10)

  // Actions in the dataset can trigger need for point updates
  useEffect(function setupResponsesToDatasetActions() {
    if (dataset) {
      const disposer = onAnyAction(dataset, action => {
        if (isSelectionAction(action)) {
          refreshPointSelection()
        } else if (isSetCaseValuesAction(action)) {
          // assumes that if we're caching then only selected cases are being updated
          refreshPoints(dataset.isCaching)
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

  return (
    <svg ref={dotsRef}></svg>
  )
}
