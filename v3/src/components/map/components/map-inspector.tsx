import { useDndContext } from "@dnd-kit/core"
import { observer } from "mobx-react-lite"
import { useRef, useEffect, useState } from "react"
import { InspectorButton, InspectorMenu, InspectorPanel } from "../../inspector-panel"
import { t } from "../../../utilities/translation/translate"
import { ITileInspectorPanelProps } from "../../tiles/tile-base-props"
import { isMapContentModel } from "../models/map-content-model"
import { HideShowMenuList } from "./inspector-panel/hide-show-menu-list"
import { SaveImageMenuList } from "./inspector-panel/save-image-menu-list"
import { MapLayersPalette } from "./inspector-panel/map-layers-palette"

import RescaleIcon from "../../../assets/icons/inspector-panel/rescale-icon.svg"
import ViewIcon from "../../../assets/icons/inspector-panel/view-icon.svg"
import LayersIcon from "../../../assets/icons/inspector-panel/layers-icon.svg"
import ImageIcon from "../../../assets/icons/inspector-panel/image-icon.svg"

const kLayersPaletteId = "map-layers-palette"

export const MapInspector = observer(function MapInspector({tile, show}: ITileInspectorPanelProps) {
  const mapModel = isMapContentModel(tile?.content) ? tile?.content : undefined
  const [showPalette, setShowPalette] = useState<string | undefined>(undefined)
  const panelRef = useRef<HTMLDivElement>(null)
  const panelRect = panelRef.current?.getBoundingClientRect()
  const buttonRef = useRef<Element | null>(null)
  const buttonRect = buttonRef.current?.getBoundingClientRect()
  const {active} = useDndContext()

  useEffect(() => {
    !show && setShowPalette(undefined)
  }, [active, show])

  const handleClosePalette = () => {
    setShowPalette(undefined)
  }

  const handleMapRescale = () => {
    mapModel?.rescale("DG.Undo.map.fitBounds", "DG.Redo.map.fitBounds")
  }

  const renderLayersButton = () => {
    if (mapModel) {
      return (
        <InspectorButton
          aria-controls={kLayersPaletteId}
          aria-expanded={showPalette === "layers"}
          isActive={showPalette === "layers"}
          label={t("V3.map.Inspector.Layers")}
          onButtonClick={(e: { target: Element }) => {
            buttonRef.current = e.target.closest("button") ?? e.target
            setShowPalette(showPalette === "layers" ? undefined : "layers")
          }}
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
      case "layers":
        return <MapLayersPalette id={kLayersPaletteId} tile={tile} setShowPalette={setShowPalette}
                                 panelRect={panelRect} buttonRect={buttonRect}/>
      default:
        return null
    }
  }

  if (mapModel && mapModel.layers.length > 0) {
    return (
      <InspectorPanel
        ref={panelRef}
        component="map data-display"
        setShowPalette={setShowPalette}
        show={show}
        toolbarAriaLabel={t("DG.DocumentController.mapTitle")}
        toolbarOrientation="vertical"
        toolbarPersistenceKey="map-inspector-toolbar"
        width="wide"
      >
        <InspectorButton
          label={t("V3.map.Inspector.Rescale")}
          onButtonClick={handleMapRescale}
          testId={"map-resize-button"}
          tooltip={t("DG.Inspector.rescale.toolTip")}
          top={true}
        >
          <RescaleIcon/>
        </InspectorButton>
        <InspectorMenu
          icon={<ViewIcon/>}
          label={t("V3.map.Inspector.View")}
          onButtonClick={handleClosePalette}
          testId={"map-hide-show-button"}
          tooltip={t("DG.Inspector.hideShow.toolTip")}
        >
          <HideShowMenuList tile={tile}/>
        </InspectorMenu>
        {renderLayersButton()}
        <InspectorMenu
          bottom={true}
          icon={<ImageIcon/>}
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
