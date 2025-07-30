import { useDndContext } from "@dnd-kit/core"
import { observer } from "mobx-react-lite"
import React, { useRef, useEffect, useState } from "react"
import { InspectorButton, InspectorMenu, InspectorPanel } from "../../inspector-panel"
import { t } from "../../../utilities/translation/translate"
import { ITileInspectorPanelProps } from "../../tiles/tile-base-props"
import { isMapContentModel } from "../models/map-content-model"
import { isMapPinLayerModel } from "../models/map-pin-layer-model"
import { isMapPointLayerModel } from "../models/map-point-layer-model"
import { HideShowMenuList } from "./inspector-panel/hide-show-menu-list"
import { SaveImageMenuList } from "./inspector-panel/save-image-menu-list"
import { MapMeasurePalette } from "./inspector-panel/map-measure-palette"
import { MapLayersPalette } from "./inspector-panel/map-layers-palette"

import ScaleDataIcon from "../../../assets/icons/inspector-panel/resize-icon.svg"
import HideShowIcon from "../../../assets/icons/inspector-panel/view-icon.svg"
import ValuesIcon from "../../../assets/icons/inspector-panel/data-icon.svg"
import LayersIcon from "../../../assets/icons/inspector-panel/layers-icon.svg"
import CameraIcon from "../../../assets/icons/inspector-panel/image-icon.svg"

export const MapInspector = observer(function MapInspector({tile, show}: ITileInspectorPanelProps) {
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
  const setButtonRef = (ref: any) => {
    buttonRef.current = ref.current
  }

  const handleMapRescale = () => {
    mapModel?.rescale("DG.Undo.map.fitBounds", "DG.Redo.map.fitBounds")
  }

  const renderRulerButton = () => {
    if (mapModel?.layers.some(layer => isMapPointLayerModel(layer) || isMapPinLayerModel(layer))) {
      return (
        <InspectorButton
          label={t("V3.map.Inspector.Data")}
          onButtonClick={()=>{ setShowPalette(showPalette === "measure" ? undefined : "measure") }}
          setButtonRef={setButtonRef}
          testId={"map-display-values-button"}
          tooltip={t("DG.Inspector.displayValues.toolTip")}
        >
          <ValuesIcon/>
        </InspectorButton>
      )
    }
  }

  const renderLayersButton = () => {
    if (mapModel) {
      return (
        <InspectorButton
          label={t("V3.map.Inspector.Layers")}
          onButtonClick={()=>{ setShowPalette(showPalette === "layers" ? undefined : "layers") }}
          setButtonRef={setButtonRef}
          testId={"map-display-config-button"}
          tooltip={t("DG.Inspector.displayLayers.toolTip")}
        >
          <LayersIcon/>
        </InspectorButton>
      )
    }
  }

  const renderPaletteIfAny = () => {
    switch (showPalette) {
      case "measure":
        return <MapMeasurePalette tile={tile} setShowPalette={setShowPalette}
                                  panelRect={panelRect} buttonRect={buttonRect}/>
      case "layers":
        return <MapLayersPalette tile={tile} setShowPalette={setShowPalette}
                                 panelRect={panelRect} buttonRect={buttonRect}/>
      default:
        return null
    }
  }

  if (mapModel && mapModel.layers.length > 0) {
    return (
      <InspectorPanel ref={panelRef} component="map data-display" show={show} setShowPalette={setShowPalette}>
        <InspectorButton
          label={t("V3.map.Inspector.Rescale")}
          onButtonClick={handleMapRescale}
          testId={"map-resize-button"}
          tooltip={t("DG.Inspector.rescale.toolTip")}
          top={true}
        >
          <ScaleDataIcon/>
        </InspectorButton>
        <InspectorMenu
          icon={<HideShowIcon/>}
          label={t("V3.map.Inspector.View")}
          onButtonClick={handleClosePalette}
          testId={"map-hide-show-button"}
          tooltip={t("DG.Inspector.hideShow.toolTip")}
        >
          <HideShowMenuList tile={tile}/>
        </InspectorMenu>
        {renderRulerButton()}
        {renderLayersButton()}
        <InspectorMenu
          bottom={true}
          icon={<CameraIcon/>}
          label={t("V3.map.Inspector.Image")}
          onButtonClick={handleClosePalette}
          testId={"map-camera-button"}
          tooltip={t("DG.Inspector.makeImage.toolTip")}
        >
          <SaveImageMenuList tile={tile}/>
        </InspectorMenu>
        {renderPaletteIfAny()}
      </InspectorPanel>
    )
  }
})
