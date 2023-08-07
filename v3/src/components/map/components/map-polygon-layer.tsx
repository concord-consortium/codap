import {reaction} from "mobx"
import {onAnyAction} from "../../../utilities/mst-utils"
import React, {useCallback, useEffect} from "react"
import {geoJSON, LeafletMouseEvent, point, Popup, popup} from "leaflet"
import {useMap} from "react-leaflet"
import {isSelectionAction, isSetCaseValuesAction} from "../../../models/data/data-set-actions"
import {transitionDuration} from "../../data-display/data-display-types"
import {getCaseTipText, handleClickOnCase} from "../../data-display/data-display-utils"
import {boundaryAttributeFromDataSet} from "../utilities/map-utils"
import {
  GeoJsonObject, kDefaultMapStrokeColor, kDefaultMapStrokeOpacity, kMapAreaNoLegendColor,
  kMapAreaNoLegendSelectedBorderColor, kMapAreaNoLegendSelectedColor, kMapAreaNoLegendSelectedOpacity,
  kMapAreaNoLegendUnselectedOpacity, kMapAreaSelectedBorderWeight, kMapAreaUnselectedBorderWeight,
  kMapAreaWithLegendSelectedBorderColor, PolygonLayerOptions
}
  from "../map-types"
import {useMapModelContext} from "../hooks/use-map-model-context"
import {useMapLayoutContext} from "../models/map-layout"
import {IMapPolygonLayerModel} from "../models/map-polygon-layer-model"

export const MapPolygonLayer = function MapPolygonLayer(props: {
  mapLayerModel: IMapPolygonLayerModel
  enableAnimation: React.MutableRefObject<boolean>
}) {
  const {mapLayerModel, enableAnimation} = props,
    {dataConfiguration} = mapLayerModel,
    dataset = dataConfiguration?.dataset,
    mapModel = useMapModelContext(),
    leafletMap = useMap(),
    layout = useMapLayoutContext()

  // useDataTips({dotsRef, dataset, displayModel: mapLayerModel, enableAnimation})

  const refreshPolygonStyles = useCallback(() => {
    if (!dataset) return

    const selectedCases = dataConfiguration.selection,
      hasLegend = !!dataConfiguration.attributeID('legend')
    mapLayerModel.features.forEach((feature) => {
      const
        featureCaseID = (feature.options as PolygonLayerOptions).caseID,
        isSelected = selectedCases.includes(featureCaseID),
        // todo: fillColor, strokeColor and opacity are going to need
        //  to draw from what the user has set in the layers palette
        fillColor = hasLegend ? dataConfiguration.getLegendColorForCase(featureCaseID)
          : (isSelected ? kMapAreaNoLegendSelectedColor : kMapAreaNoLegendColor),
        strokeColor = hasLegend
          ? (isSelected ? kMapAreaWithLegendSelectedBorderColor
            : dataConfiguration.getLegendColorForCase(featureCaseID))
          : (isSelected ? kMapAreaNoLegendSelectedBorderColor : kDefaultMapStrokeColor),
        opacity = kDefaultMapStrokeOpacity,
        weight = isSelected ? kMapAreaSelectedBorderWeight : kMapAreaUnselectedBorderWeight
      feature.setStyle({
        fillColor,
        color: strokeColor,
        fillOpacity: isSelected ? kMapAreaNoLegendSelectedOpacity : kMapAreaNoLegendUnselectedOpacity,
        opacity,
        weight
      })
    })
  }, [dataset, dataConfiguration, mapLayerModel.features])

  const refreshPolygons = useCallback((selectedOnly: boolean) => {
      if (!dataset) return

      const
        stashFeature = (caseID: string, jsonObject: GeoJsonObject, caseIndex: number, error: string) => {

          let infoPopup: Popup | null

          const handleClick = (iEvent: LeafletMouseEvent) => {
              const mouseEvent = iEvent.originalEvent
              handleClickOnCase(mouseEvent, caseID, dataset)
              mouseEvent.stopPropagation()
            },

            handleMouseover = () => {
              const tFeature = mapLayerModel.features[caseIndex],
                attrIDsToUse = (dataConfiguration.uniqueTipAttributes ?? [])
                  .map(aPair => aPair.attributeID),
                tipText = getCaseTipText(caseID, attrIDsToUse, dataset)
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
            },

            handleMouseout = () => {
              infoPopup?.close()
              infoPopup = null
            }

          if (!jsonObject) {
            console.log(`MapPolygonLayer.refreshPolygons: error: ${error}`)
            return
          }
          mapLayerModel.features[caseIndex] = geoJSON(jsonObject, {
            style(feature) {
              return {
                fillColor: kMapAreaNoLegendColor,
                fillOpacity: kMapAreaNoLegendUnselectedOpacity,
                smoothFactor: 2
              }
            },
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            caseID // Stashes reference in features[iIndex].options.case
          })
            .on('click', handleClick) // unable to use 'mousedown' for unknown reason
            .on('mouseover', handleMouseover)
            .on('mouseout', handleMouseout)
            .addTo(leafletMap)
        }

      const
        polygonId = boundaryAttributeFromDataSet(dataset),
        // Keep track of which features are already on the map so that we can delete ones that no longer have
        // corresponding cases in the dataset
        featuresToRemove = mapLayerModel.features.map((feature) => {
          return (feature.options as PolygonLayerOptions).caseID
        })
      console.log(`refreshPolygons with ${featuresToRemove.length} features`)
      dataConfiguration.caseDataArray.forEach((aCaseData, caseIndex) => {
        const notAlreadyStashed = mapLayerModel.features.findIndex((feature) => {
          return (feature.options as PolygonLayerOptions).caseID === aCaseData.caseID
        }) === -1
        if (notAlreadyStashed) {
          const
            polygon = dataset.getStrValue(aCaseData.caseID, polygonId)
          if (polygon) {
            stashFeature(aCaseData.caseID, JSON.parse(polygon), caseIndex, '')
          }
        } else {  // This case has an already stashed feature. Remove it from the list of current features
          // so that its corresponding feature won't be deleted below
          const featureID = (mapLayerModel.features[caseIndex].options as PolygonLayerOptions).caseID,
            featureIndex = featuresToRemove.indexOf(featureID)
          featuresToRemove.splice(featureIndex, 1)
        }
      })
      // Delete features that no longer have corresponding cases in the dataset
      featuresToRemove.forEach((featureID) => {
        const featureIndex = mapLayerModel.features.findIndex((feature) => {
          return (feature.options as PolygonLayerOptions).caseID === featureID
        })
        if (featureIndex !== -1) {
          leafletMap.removeLayer(mapLayerModel.features[featureIndex])
          mapLayerModel.features.splice(featureIndex, 1)
        }
      })
      // Now that we're sure we have the right polygon features, update their styles
      refreshPolygonStyles()
    }, [dataset, mapLayerModel.features, dataConfiguration.caseDataArray, dataConfiguration.uniqueTipAttributes,
    refreshPolygonStyles, leafletMap]
  )

// Actions in the dataset can trigger need point updates
  useEffect(function setupResponsesToDatasetActions() {
    if (dataset) {
      const disposer = onAnyAction(dataset, action => {
        if (isSelectionAction(action)) {
          refreshPolygonStyles()
        } else if (isSetCaseValuesAction(action) || ["addCases", "removeCases"].includes(action.name)) {
          refreshPolygons(false)
        }
      })
      return () => disposer()
    }
  }, [dataset, refreshPolygons, refreshPolygonStyles])

// Changes in layout require repositioning polygons
  useEffect(function setupResponsesToLayoutChanges() {
    const disposer = reaction(
      () => [layout.mapWidth, layout.mapHeight, layout.legendHeight],
      () => {
        refreshPolygons(false)
      }
    )
    return () => disposer()
  }, [layout, refreshPolygons])

// Changes in legend attribute require repositioning polygons
  useEffect(function setupResponsesToLayoutChanges() {
    const disposer = reaction(
      () => [dataConfiguration.attributeID('legend')],
      () => {
        refreshPolygons(false)
      }
    )
    return () => disposer()
  }, [dataConfiguration, refreshPolygons])

// respond to change in mapContentModel.displayChangeCount triggered by user action in leaflet
  useEffect(function setupReactionToDisplayChangeCount() {
    const disposer = reaction(
      () => [mapModel.displayChangeCount],
      () => {
        refreshPolygons(false)
      }
    )
    return () => disposer()
  }, [layout, mapModel.displayChangeCount, refreshPolygons])

  return (
    <></>
  )
}
