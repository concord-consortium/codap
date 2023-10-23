import {reaction} from "mobx"
import {select} from "d3"
import React, {useCallback, useEffect} from "react"
import {useMap} from "react-leaflet"
import {mstAutorun} from "../../../utilities/mst-autorun"
import {defaultSelectedStroke, defaultSelectedStrokeWidth, defaultStrokeWidth} from "../../../utilities/color-utils"
import {CaseData, DotSelection, DotsElt} from "../../data-display/d3-types"
import {computePointRadius} from "../../data-display/data-display-utils"
import {transitionDuration} from "../../data-display/data-display-types"
import {latLongAttributesFromDataSet} from "../utilities/map-utils"
import {useMapLayoutContext} from "../models/map-layout"
import {IMapPointLayerModel} from "../models/map-point-layer-model"

export const MapPointLayer = function MapPointLayer(props: {
  mapLayerModel: IMapPointLayerModel
  dotsElement: DotsElt
  enableAnimation: React.MutableRefObject<boolean>
}) {
  const {mapLayerModel, dotsElement, enableAnimation} = props,
    {dataConfiguration, pointDescription} = mapLayerModel,
    dataset = dataConfiguration?.dataset,
    leafletMap = useMap(),
    layout = useMapLayoutContext()

  /*
    const refreshPointSelection = useCallback(() => {
      const {pointColor, pointStrokeColor} = mapLayerModel,
        selectedPointRadius = mapLayerModel.getPointRadius('select')
      dataConfiguration && setPointSelection({
        dotsRef, dataConfiguration, pointRadius: mapLayerModel.getPointRadius(), selectedPointRadius,
        pointColor, pointStrokeColor
      })
    }, [dataConfiguration, mapLayerModel, dotsRef])
  */

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {

    const lookupLegendColor = (aCaseData: CaseData) => {
      return dataConfiguration.attributeID('legend')
        ? dataConfiguration.getLegendColorForCase(aCaseData.caseID)
        : pointColor
    },
      getCoords = (anID: string) => {
        const long = dataset?.getNumeric(anID, latId) || 0,
          lat = dataset?.getNumeric(anID, longId) || 0,
          coords = leafletMap.latLngToLayerPoint([lat, long])
        coords.x /= 10
        coords.y /= 10
        console.log(`getCoords: ${anID} ${coords.x} ${coords.y}`)
        return coords
      },
      getScreenX = (anID: string) => {
        const coords = getCoords(anID)
        return coords.x
      },
      getScreenY = (anID: string) => {
        const coords = getCoords(anID)
        return coords.y
      }

    if (!dotsElement || !dataset) return
    const
      // theSelection = selectDots(dotsElement, selectedOnly),
      theSelection:DotSelection = select(dotsElement).selectAll('.graph-dot'),
      duration = enableAnimation.current ? transitionDuration : 0,
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
        .transition()
        .duration(duration)
        .attr('cx', (aCaseData: CaseData) => getScreenX(aCaseData.caseID))
        .attr('cy', (aCaseData: CaseData) => getScreenY(aCaseData.caseID))
        .attr('r', (aCaseData: CaseData) => dataset?.isCaseSelected(aCaseData.caseID)
          ? selectedPointRadius : pointRadius)
        .style('fill', (aCaseData: CaseData) => lookupLegendColor(aCaseData))
        .style('stroke', (aCaseData: CaseData) =>
          (getLegendColor && dataset?.isCaseSelected(aCaseData.caseID))
            ? defaultSelectedStroke : pointStrokeColor)
        .style('stroke-width', (aCaseData: CaseData) =>
          (getLegendColor && dataset?.isCaseSelected(aCaseData.caseID))
            ? defaultSelectedStrokeWidth : defaultStrokeWidth)
    }

  }, [dotsElement, dataset, enableAnimation, dataConfiguration, pointDescription, leafletMap])

  useEffect(function respondToPointsNeedUpdate() {
    return mstAutorun(
      () => {
        !dataConfiguration.pointsNeedUpdating && refreshPointPositions(false)
      }, { name: "mapPointLayer.respondToPointsNeedUpdate" }, dataConfiguration)
  }, [dataConfiguration.pointsNeedUpdating, refreshPointPositions])

  // respond to layout size changes (e.g. component resizing)
  useEffect(() => {
    const disposer = reaction(
      () => [layout.mapWidth, layout.mapHeight, layout.legendHeight],
      () => {
        refreshPointPositions(false)
      }
    )
    return () => disposer()
  }, [layout, refreshPointPositions])


  return (
    <></>
  )
}
