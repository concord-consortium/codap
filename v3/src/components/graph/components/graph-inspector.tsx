import { useRef, useEffect, useState } from "react"
import { observer } from "mobx-react-lite"
import { isAlive } from "mobx-state-tree"
import { InspectorButton, InspectorMenu, InspectorPanel } from "../../inspector-panel"
import { HideShowMenuList } from "./inspector-panel/hide-show-menu-list"
import { PointFormatPalette } from "./inspector-panel/point-format-palette"
import { GraphMeasurePalette } from "./inspector-panel/graph-measure-palette"
import { t } from "../../../utilities/translation/translate"
import { updateTileNotification } from "../../../models/tiles/tile-notifications"
import { useDndContext } from "@dnd-kit/core"
import { ITileInspectorPanelProps } from "../../tiles/tile-base-props"
import { isGraphContentModel } from "../models/graph-content-model"
import { DisplayConfigPalette } from "./inspector-panel/display-config-palette"
import { CameraMenuList } from "./camera-menu-list"

import RescaleIcon from "../../../assets/icons/inspector-panel/rescale-icon.svg"
import ViewIcon from "../../../assets/icons/inspector-panel/view-icon.svg"
import MeasureIcon from "../../../assets/icons/inspector-panel/data-icon.svg"
import ConfigurationIcon from "../../../assets/icons/inspector-panel/configuration-icon.svg"
import FormatIcon from "../../../assets/icons/inspector-panel/format-icon.svg"
import ImageIcon from "../../../assets/icons/inspector-panel/image-icon.svg"

const kConfigPaletteId = "graph-config-palette"
const kFormatPaletteId = "graph-format-palette"
const kMeasurePaletteId = "graph-measure-palette"

export const GraphInspector = observer(function GraphInspector({tile, show}: ITileInspectorPanelProps) {
  const graphModel = isGraphContentModel(tile?.content) && isAlive(tile.content) ? tile.content : undefined
  const [showPalette, setShowPalette] = useState<string | undefined>(undefined)
  const panelRef = useRef<HTMLDivElement>(null)
  const panelRect = panelRef.current?.getBoundingClientRect()
  const buttonRef = useRef<Element | null>(null)
  const buttonRect = buttonRef.current?.getBoundingClientRect()
  const { active } = useDndContext()
  const showDisplayConfig = graphModel?.plot.showDisplayConfig

  useEffect(() => {
    !show && setShowPalette(undefined)
  }, [active, show])

  const handleClosePalette = () => {
    setShowPalette(undefined)
  }

  const handleRulerButton = (e: { target: Element }) => {
    buttonRef.current = e.target.closest("button") ?? e.target
    setShowPalette(showPalette === "measure" ? undefined : "measure")
  }

  const handleConfigButton = (e: { target: Element }) => {
    buttonRef.current = e.target.closest("button") ?? e.target
    setShowPalette(showPalette === "config" ? undefined : "config")
  }

  const handleBrushButton = (e: { target: Element }) => {
    buttonRef.current = e.target.closest("button") ?? e.target
    setShowPalette(showPalette === "format" ? undefined : "format")
  }

  const renderRescaleButton = () => {

    const rescaleTooltip = graphModel?.noPossibleRescales
      ? "V3.Inspector.rescale.noRescale.toolTip"
      : graphModel?.plotType === "casePlot" ? "V3.Inspector.rescale.casePlot.toolTip" : "DG.Inspector.rescale.toolTip"

    const handleGraphRescale = () => {
      graphModel?.startAnimation()
      graphModel?.applyModelChange(
        () => graphModel.rescale(),
        {
          notify: () => updateTileNotification("rescaleGraph", {}, tile),
          undoStringKey: "DG.Undo.axisDilate",
          redoStringKey: "DG.Redo.axisDilate",
          log: {message: "Rescale axes from data", args: {}, category: "plot"}
        }
      )
    }

    return (
      <InspectorButton
        isDisabled={graphModel?.noPossibleRescales}
        label={t("V3.graph.Inspector.Rescale")}
        onButtonClick={handleGraphRescale}
        testId={"graph-resize-button"}
        tooltip={t(rescaleTooltip)}
        top={true}
      >
        <RescaleIcon/>
      </InspectorButton>
    )
  }

  return (
    <InspectorPanel
      component="graph data-display"
      ref={panelRef}
      setShowPalette={setShowPalette}
      show={show}
      toolbarAriaLabel={t("DG.DocumentController.graphTitle")}
      toolbarOrientation="vertical"
      toolbarPersistenceKey="graph-inspector-toolbar"
      width="wide"
    >
      {renderRescaleButton()}
      <InspectorMenu
        icon={<ViewIcon/>}
        label={t("V3.graph.Inspector.View")}
        onButtonClick={handleClosePalette}
        testId={"graph-hide-show-button"}
        tooltip={t("DG.Inspector.hideShow.toolTip")}
      >
        <HideShowMenuList tile={tile}/>
      </InspectorMenu>
      <InspectorButton
        aria-controls={kMeasurePaletteId}
        aria-expanded={showPalette === "measure"}
        aria-haspopup="dialog"
        isActive={showPalette === "measure"}
        label={t("V3.graph.Inspector.Measure")}
        onButtonClick={handleRulerButton}
        testId={"graph-display-values-button"}
        tooltip={t("DG.Inspector.displayValues.toolTip")}
      >
        <MeasureIcon/>
      </InspectorButton>
      {showDisplayConfig &&
        <InspectorButton
          aria-controls={kConfigPaletteId}
          aria-expanded={showPalette === "config"}
          aria-haspopup="dialog"
          isActive={showPalette === "config"}
          label={t("V3.graph.Inspector.Config")}
          onButtonClick={handleConfigButton}
          testId={"graph-display-config-button"}
          tooltip={t("DG.Inspector.displayConfiguration.toolTip")}
        >
          <ConfigurationIcon/>
        </InspectorButton>
      }
      <InspectorButton
        aria-controls={kFormatPaletteId}
        aria-expanded={showPalette === "format"}
        aria-haspopup="dialog"
        isActive={showPalette === "format"}
        label={t("V3.graph.Inspector.Format")}
        onButtonClick={handleBrushButton}
        testId={"graph-display-styles-button"}
        tooltip={t("DG.Inspector.displayStyles.toolTip")}
      >
        <FormatIcon/>
      </InspectorButton>
      <InspectorMenu
        bottom={true}
        icon={<ImageIcon/>}
        label={t("V3.graph.Inspector.Image")}
        onButtonClick={handleClosePalette}
        testId={"graph-camera-button"}
        tooltip={t("DG.Inspector.makeImage.toolTip")}
      >
        <CameraMenuList/>
      </InspectorMenu>
      {showPalette === "measure" &&
        <GraphMeasurePalette id={kMeasurePaletteId} tile={tile} setShowPalette={setShowPalette}
                             panelRect={panelRect} buttonRect={buttonRect}/>}

      {showPalette === "config" &&
        <DisplayConfigPalette id={kConfigPaletteId} tile={tile} setShowPalette={setShowPalette}
                              panelRect={panelRect} buttonRect={buttonRect}/>}
      {showPalette === "format" &&
        <PointFormatPalette id={kFormatPaletteId} tile={tile} setShowPalette={setShowPalette}
                            panelRect={panelRect} buttonRect={buttonRect}/>}
    </InspectorPanel>
  )
})
