import { comparer } from "mobx"
import React, {useCallback, useEffect, useRef} from "react"
import {DomEvent, LeafletMouseEvent, point, popup, Rectangle, rectangle} from "leaflet"
import {useMap} from "react-leaflet"
import {useMemo} from "use-memo-one"
import { setOrExtendSelection } from "../../../models/data/data-set-utils"
import {mstReaction} from "../../../utilities/mst-reaction"
import { useLeafletMapLayers } from "../hooks/use-leaflet-map-layers"
import {IMapPointLayerModel} from "../models/map-point-layer-model"
import {getCaseCountString, getCategoryBreakdownHtml} from "../utilities/map-utils"

export interface IMapPointGridProps {
  mapLayerModel: IMapPointLayerModel
}

export const MapPointGrid = function MapPointGrid(props: IMapPointGridProps) {
  const {mapLayerModel} = props
  const mapGridModel = mapLayerModel.gridModel
  const leafletMapLayers = useLeafletMapLayers()
  const leafletMap = useMap()
  const leafletRectsRef = useRef<Array<Rectangle>>([])
  const leafletPopup = useMemo(() => popup({
    closeButton: false,
    autoPan: false,
    offset: point(0, 0)
  }), [])

  const refreshGridSelection = useCallback(() => {
    const leafletRects = leafletRectsRef.current
    if (mapLayerModel.isVisible && mapGridModel.isVisible && leafletRects) {
      let rectIndex = 0
      mapGridModel.latLngGrid.forEachGridCell((rectRecord) => {
        const leafletRect = leafletRects[rectIndex],
          selected = rectRecord.selected
        if (leafletRect) {
          leafletRect.setStyle({ color: selected ? 'black' : 'white', weight: selected ? 2 : 1})
        }
        rectIndex++
      })
    }
  }, [mapGridModel, mapLayerModel])

  const refreshLeafletRects = useCallback(() => {
    const options =
        {color: 'white', fillColor: 'red', weight: 1, fillOpacity: 0.5, className: 'leaflet-rectangle'},
      maxCount = mapGridModel.latLngGrid.maxCount,
      latAttrID = mapGridModel.dataConfiguration?.attributeID('lat') ?? ''
    // Start fresh
    leafletRectsRef.current.forEach(leafletRect => leafletRect.remove())
    leafletRectsRef.current = []
    if (mapLayerModel.isVisible && mapGridModel.isVisible) {
      mapGridModel.latLngGrid.forEachGridCell((rectRecord, longIndex, latIndex) => {
        const handleClick = (iEvent: LeafletMouseEvent) => {
          // Below is the Leaflet Way to stop the click from propagating.
          DomEvent.stopPropagation(iEvent)

          const tExtend = iEvent.originalEvent.shiftKey || iEvent.originalEvent.metaKey
          const dataset = mapGridModel.dataConfiguration?.dataset
          const caseIDs = mapGridModel.casesInRect(longIndex, latIndex)
          if (caseIDs) {
            if (tExtend) mapGridModel.clearGridSelection()
            setOrExtendSelection(caseIDs, dataset, tExtend)
          }
          return false
        },
        handleMouseOver = () => {
          const dataset = mapGridModel.dataConfiguration?.dataset
          if (!dataset) return
          const legendAttrID = mapGridModel.dataConfiguration?.attributeID('legend') ?? '',
            caseCountString = legendAttrID === ''
              ? getCaseCountString(dataset, latAttrID, rectRecord.count)
              : getCategoryBreakdownHtml(dataset, rectRecord.cases, legendAttrID)
          leafletPopup.setLatLng(rectRecord.bounds.getCenter())
            .setContent(caseCountString)
            .openOn(leafletMap)
          leafletMap.getContainer().style.cursor = 'pointer'
        },
        handleMouseOut = () => {
          leafletMap.closePopup(leafletPopup)
          leafletMap.getContainer().style.cursor = ''
        }
        options.fillOpacity = rectRecord.count / maxCount
        const leafletRect = rectangle(rectRecord.bounds, options)
          .on('click', handleClick)
          .on('mouseover', handleMouseOver)
          .on('mouseout', handleMouseOut)
        leafletRect.addTo(leafletMap)
        leafletRectsRef.current.push(leafletRect)
      })
      refreshGridSelection()
    }
  }, [leafletMap, leafletPopup, mapGridModel, mapLayerModel, refreshGridSelection])

  const refreshGridLayer = useCallback(() => {
    leafletMapLayers?.updateLayer(mapLayerModel, refreshLeafletRects)
  }, [leafletMapLayers, mapLayerModel, refreshLeafletRects])

  useEffect(function syncMapGridModel() {
    return mstReaction(
      () => [mapGridModel.changeCount, mapGridModel.isVisible, mapGridModel.gridMultiplier],
      () => refreshGridLayer(),
      {name: "syncMapGridModel", equals: comparer.structural}, mapGridModel)
  }, [mapGridModel, refreshGridLayer])

  useEffect(function respondToHiddenCasesChange() {
    return mstReaction(
      () => mapLayerModel.dataConfiguration?.hiddenCases.length,
      () => refreshGridLayer(),
      {name: 'MapPointGrid respondToHiddenCasesChange'}, mapLayerModel)
  }, [mapLayerModel, refreshGridLayer])

  useEffect(() => {
    refreshGridLayer()
  }, [refreshGridLayer])

  return (
    <></>
  )
}
