import React, {useRef, useEffect, useState} from "react"
import {InspectorButton, InspectorMenu, InspectorPanel} from "../../inspector-panel"
import ScaleDataIcon from "../../../assets/icons/icon-scaleData.svg"
import HideShowIcon from "../../../assets/icons/icon-hideShow.svg"
import ValuesIcon from "../../../assets/icons/icon-values.svg"
import LayersIcon from "../../../assets/icons/icon-layers.svg"
import CameraIcon from "../../../assets/icons/icon-camera.svg"
import t from "../../../utilities/translation/translate"
import {useDndContext} from "@dnd-kit/core"
import {ITileInspectorPanelProps} from "../../tiles/tile-base-props"
import {isMapContentModel} from "../models/map-content-model"
import {isMapPointLayerModel} from "../models/map-point-layer-model"
import {HideShowMenuList} from "./inspector-panel/hide-show-menu-list"
import {SaveImageMenuList} from "./inspector-panel/save-image-menu-list"
import {MapMeasurePalette} from "./inspector-panel/map-measure-palette"


export const MapInspector = ({tile, show}: ITileInspectorPanelProps) => {
  const mapModel = isMapContentModel(tile?.content) ? tile?.content : undefined
  const [showPalette, setShowPalette] = useState<string | undefined>(undefined)
  const panelRef = useRef<HTMLDivElement>()
  const panelRect = panelRef.current?.getBoundingClientRect()
  const buttonRef = useRef<HTMLDivElement>()
  const buttonRect = buttonRef.current?.getBoundingClientRect()
  const {active} = useDndContext()

  useEffect(() => {
    !show && setShowPalette(undefined)
  }, [active, show])

  const handleClosePalette = () => {
    setShowPalette(undefined)
  }

  const handleRulerButton = () => {
    setShowPalette(showPalette === "measure" ? undefined : "measure")
  }

  const setButtonRef = (ref: any) => {
    buttonRef.current = ref.current
  }

  const handleMapRescale = () => {
    mapModel?.applyUndoableAction(
      () => mapModel.rescale(),
      "DG.Undo.map.fitBounds",
      "DG.Redo.map.fitBounds")
  }

  const renderRulerButton = () => {
    if (mapModel && mapModel.layers.filter(layer => isMapPointLayerModel(layer)).length > 0) {
      return (
        <InspectorButton tooltip={t("DG.Inspector.displayValues.toolTip")} showMoreOptions={true}
                         onButtonClick={handleRulerButton} setButtonRef={setButtonRef}
                         testId={"map-display-values-button"}>
          <ValuesIcon/>
        </InspectorButton>
      )
    }
  }

  if (mapModel && mapModel.layers.length > 0) {
    return (
      <InspectorPanel ref={panelRef} component="map" show={show} setShowPalette={setShowPalette}>
        <InspectorButton tooltip={t("DG.Inspector.rescale.toolTip")}
                         showMoreOptions={false} testId={"map-resize-button"} onButtonClick={handleMapRescale}>
          <ScaleDataIcon/>
        </InspectorButton>
        <InspectorMenu tooltip={t("DG.Inspector.hideShow.toolTip")}
                       icon={<HideShowIcon/>} testId={"map-hide-show-button"} onButtonClick={handleClosePalette}>
          <HideShowMenuList tile={tile}/>
        </InspectorMenu>
        {renderRulerButton()}
        <InspectorButton tooltip={t("DG.Inspector.displayLayers.toolTip")} showMoreOptions={true}
                         testId={"map-display-config-button"}>
          <LayersIcon/>
        </InspectorButton>
        <InspectorMenu tooltip={t("DG.Inspector.makeImage.toolTip")}
                       icon={<CameraIcon/>} testId={"map-camera-button"} onButtonClick={handleClosePalette}>
          <SaveImageMenuList tile={tile}/>
        </InspectorMenu>
      {showPalette === "measure" &&
         <MapMeasurePalette tile={tile} setShowPalette={setShowPalette}
                              panelRect={panelRect} buttonRect={buttonRect}/>}
        {/*
      {showPalette === "format" &&
         <PointFormatPalette tile={tile} setShowPalette={setShowPalette}
                             panelRect={panelRect} buttonRect={buttonRect}/>}
*/}
      </InspectorPanel>
    )
  }
}
