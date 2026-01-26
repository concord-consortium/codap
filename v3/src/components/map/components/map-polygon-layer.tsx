import {comparer, reaction} from "mobx"
import {isAlive} from "mobx-state-tree"
import {geoJSON, LeafletMouseEvent, point, Popup, popup} from "leaflet"
import {useCallback, useEffect} from "react"
import {useMap} from "react-leaflet"
import {DEBUG_MAP, debugLog} from "../../../lib/debug"
import {isSelectionAction, isSetCaseValuesAction} from "../../../models/data/data-set-actions"
import { transparentColor } from "../../../utilities/color-utils"
import {safeJsonParse} from "../../../utilities/js-utils"
import {onAnyAction} from "../../../utilities/mst-utils"
import {mstReaction} from "../../../utilities/mst-reaction"
import {transitionDuration} from "../../data-display/data-display-types"
import {handleClickOnCase} from "../../data-display/data-display-utils"
import {useDataDisplayLayout} from "../../data-display/hooks/use-data-display-layout"
import { PixiBackgroundPassThroughEvent } from "../../data-display/pixi/pixi-points"
import { useLeafletMapLayers } from "../hooks/use-leaflet-map-layers"
import {useMapModelContext} from "../hooks/use-map-model-context"
import {
  GeoJsonObject, kDefaultMapFillOpacity, kMapAreaNoLegendColor,
  kMapAreaNoLegendSelectedBorderColor, kMapAreaNoLegendSelectedColor, kMapAreaNoLegendSelectedOpacity,
  kMapAreaNoLegendUnselectedOpacity, kMapAreaSelectedBorderWeight, kMapAreaUnselectedBorderWeight,
  kMapAreaWithLegendSelectedBorderColor, PolygonLayerOptions
} from "../map-types"
import {IMapPolygonLayerModel} from "../models/map-polygon-layer-model"

export const MapPolygonLayer = function MapPolygonLayer(props: {
  mapLayerModel: IMapPolygonLayerModel
}) {
  const {mapLayerModel} = props,
    {dataConfiguration, displayItemDescription } = mapLayerModel,
    dataset = dataConfiguration?.dataset,
    mapModel = useMapModelContext(),
    leafletMapLayers = useLeafletMapLayers(),
    leafletMap = useMap(),
    layout = useDataDisplayLayout()

  // useDataTips({dotsRef, dataset, displayModel: mapLayerModel})

  const refreshPolygonStyles = useCallback(() => {
    if (!dataset || !isAlive(mapLayerModel)) return

    const selectedCases = dataConfiguration.selection,
      hasLegend = !!dataConfiguration.attributeID('legend')
    Object.values(mapLayerModel.features).forEach((feature) => {
      const
        featureCaseID = (feature.options as PolygonLayerOptions).caseID,
        isSelected = selectedCases.includes(featureCaseID),
        // todo: fillColor, strokeColor and opacity are going to need
        //  to draw from what the user has set in the layers palette
        fillColor = hasLegend ? dataConfiguration.getLegendColorForCase(featureCaseID, transparentColor)
          : (isSelected ? kMapAreaNoLegendSelectedColor : displayItemDescription.itemColor),
        strokeColor = hasLegend
          ? (isSelected ? kMapAreaWithLegendSelectedBorderColor
            : (displayItemDescription.itemStrokeSameAsFill
                ? dataConfiguration.getLegendColorForCase(featureCaseID)
                : displayItemDescription.itemStrokeColor))
          : (isSelected ? kMapAreaNoLegendSelectedBorderColor : displayItemDescription.itemStrokeColor),
        opacity = kDefaultMapFillOpacity,
        weight = isSelected ? kMapAreaSelectedBorderWeight : kMapAreaUnselectedBorderWeight
      feature.setStyle({
        fillColor,
        color: strokeColor,
        fillOpacity: isSelected ? kMapAreaNoLegendSelectedOpacity : kMapAreaNoLegendUnselectedOpacity,
        opacity,
        weight
      })
    })
  }, [dataset, dataConfiguration, mapLayerModel, displayItemDescription])

  const refreshPolygons = useCallback(() => {
    if (!dataset || !isAlive(mapLayerModel)) return
    const
      stashFeature = (caseID: string, jsonObject: GeoJsonObject, error: string) => {

        let infoPopup: Popup | null

        const handleClick = (iEvent: LeafletMouseEvent) => {
            const mouseEvent = iEvent.originalEvent
            handleClickOnCase(mouseEvent as PointerEvent, caseID, dataset)
            mouseEvent.stopPropagation()
          },

          handleMouseover = () => {
            const tFeature = mapLayerModel.features[caseID],
              attributeIDs = (dataConfiguration.uniqueTipAttributes ?? [])
                .map(aPair => aPair.attributeID),
              tipText = mapModel.getTipText({attributeIDs, caseID, dataset})
            infoPopup = popup({
                closeButton: false,
                autoPan: false,
                offset: point(0, -20)
              },
              tFeature)
            infoPopup.setContent(tipText)
            setTimeout(() => {
              if (infoPopup) {
                tFeature.bindPopup(infoPopup).openPopup()
              }
            }, transitionDuration)
            // Manual cursor setup is necessary when there's also the map points layer that uses PixiJS canvas.
            // In that case, the events are redistributed from canvas and the only way to have hover cursor is to use
            // mouseover and mouseout events.
            leafletMap.getContainer().style.cursor = "pointer"
          },

          handleMouseout = () => {
            infoPopup?.close()
            infoPopup = null
            // Manual cursor setup is necessary when there's also the map points layer that uses PixiJS canvas.
            leafletMap.getContainer().style.cursor = ""
          }

        if (!jsonObject) {
          debugLog(DEBUG_MAP, `MapPolygonLayer.refreshPolygons: error: ${error}`)
          return
        }
        mapLayerModel.features[caseID] = geoJSON(jsonObject, {
          style() {
            return {
              fillColor: kMapAreaNoLegendColor,
              fillOpacity: kMapAreaNoLegendUnselectedOpacity,
              smoothFactor: 2
            }
          },
          caseID // Stashes reference in features[caseID].options.caseID
        } as PolygonLayerOptions)
          .on(PixiBackgroundPassThroughEvent.Click, handleClick)
          .on(PixiBackgroundPassThroughEvent.MouseOver, handleMouseover)
          .on(PixiBackgroundPassThroughEvent.MouseOut, handleMouseout)
          .addTo(leafletMap)
      }

    const
      polygonId = mapLayerModel.boundaryAttributeId,
      // Keep track of which features are already on the map so that we can delete ones that no longer have
      // corresponding cases in the dataset
      featuresToRemove = Object.keys(mapLayerModel.features)
    // If this layer is not visible, skipping the following mapping will cause all the features to be removed
    // which is what we want
    mapLayerModel.isVisible && dataConfiguration.getCaseDataArray(0).forEach((aCaseData) => {
      const notAlreadyStashed = mapLayerModel.features[aCaseData.caseID] === undefined
      if (notAlreadyStashed) {
        const
          polygon = safeJsonParse(dataset.getStrValue(aCaseData.caseID, polygonId))
        if (polygon) {
          stashFeature(aCaseData.caseID, polygon, '')
        }
      } else {  // This case has an already stashed feature. Remove it from the list of current features
        // so that its corresponding feature won't be deleted below
        featuresToRemove.splice(featuresToRemove.indexOf(aCaseData.caseID), 1)
      }
    })
    // Delete features that no longer have corresponding cases in the dataset
    featuresToRemove.forEach((caseID) => {
      leafletMap.removeLayer(mapLayerModel.features[caseID])
      delete mapLayerModel.features[caseID]
    })
    // Now that we're sure we have the right polygon features, update their styles
    refreshPolygonStyles()
  }, [dataConfiguration, dataset, leafletMap, mapLayerModel, mapModel, refreshPolygonStyles])

  const refreshPolygonLayer = useCallback(() => {
    leafletMapLayers?.updateLayer(mapLayerModel.id, refreshPolygons)
  }, [leafletMapLayers, mapLayerModel.id, refreshPolygons])

  // Actions in the dataset can trigger need to update polygons
  useEffect(function setupResponsesToDatasetActions() {
    if (dataset) {
      const disposer = onAnyAction(dataset, action => {
        if (isSelectionAction(action)) {
          refreshPolygonStyles()
        } else if (isSetCaseValuesAction(action) || ["addCases", "removeCases"].includes(action.name)) {
          refreshPolygonLayer()
        }
      })
      return () => disposer()
    }
  }, [dataset, mapLayerModel, refreshPolygonLayer, refreshPolygonStyles])

  // Changes in layout or map pan/zoom require repositioning points
  useEffect(function setupResponsesToLayoutChanges() {
    return reaction(
      () => {
        const { contentWidth, contentHeight } = layout
        const { center, zoom } = mapModel.leafletMapState
        return { contentWidth, contentHeight, center, zoom }
      },
      () => {
        refreshPolygonLayer()
      }, {name: "MapPolygonLayer.respondToLayoutChanges", equals: comparer.structural, fireImmediately: true}
    )
  }, [layout, mapModel.leafletMapState, refreshPolygonLayer])

  // Changes in legend attribute require repositioning polygons
  useEffect(function setupResponsesToLegendAttribute() {
    return mstReaction(
      () => dataConfiguration.attributeID('legend'),
      () => {
        refreshPolygonLayer()
      }, {name: "MapPolygonLayer.setupResponsesToLegendAttribute"}, mapLayerModel
    )
  }, [dataConfiguration, mapLayerModel, refreshPolygonLayer])

  useEffect(function setupResponseToChangeInNumberOfCases() {
    return mstReaction(
      () => dataConfiguration?.getCaseDataArray(0).length ?? 0,
      () => {
        refreshPolygonLayer()
      }, {name: "MapPolygonLayer.setupResponseToChangeInNumberOfCases"}, [mapLayerModel, dataConfiguration]
    )
  }, [dataConfiguration, mapLayerModel, refreshPolygonLayer])

  useEffect(function setupResponseToChangeInVisibility() {
    return mstReaction(
      () => mapLayerModel.isVisible,
      () => {
        refreshPolygonLayer()
      }, {name: "MapPolygonLayer.setupResponseToChangeInVisibility"}, mapLayerModel
    )
  }, [dataConfiguration, mapLayerModel, refreshPolygonLayer])

  // respond to item visual properties change
  useEffect(function respondToItemVisualChange() {
    return mstReaction(() => {
        const { itemColor, itemStrokeColor, itemStrokeSameAsFill } =
          mapLayerModel.displayItemDescription
        return [itemColor, itemStrokeColor, itemStrokeSameAsFill]
      },
      () => refreshPolygonStyles(),
      {name: "MapPolygonLayer.respondToItemVisualChange", equals: comparer.structural}, mapLayerModel
    )
  }, [refreshPolygonStyles, mapLayerModel])

  // Clean up Leaflet features when component unmounts (e.g., when layer is deleted)
  useEffect(function cleanupOnUnmount() {
    return () => {
      // Remove all polygon features from the Leaflet map
      Object.values(mapLayerModel.features).forEach(feature => {
        leafletMap.removeLayer(feature)
      })
    }
  }, [leafletMap, mapLayerModel])

  return (
    <></>
  )
}
