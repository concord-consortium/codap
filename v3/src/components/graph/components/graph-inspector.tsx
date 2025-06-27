import React, {useRef, useEffect, useState} from "react"
import {observer} from "mobx-react-lite"
import {InspectorButton, InspectorMenu, InspectorPanel} from "../../inspector-panel"
import ScaleDataIcon from "../../../assets/icons/icon-scaleData.svg"
import HideShowIcon from "../../../assets/icons/icon-hideShow.svg"
import ValuesIcon from "../../../assets/icons/icon-values.svg"
import BarChartIcon from "../../../assets/icons/icon-segmented-bar-chart.svg"
import StylesIcon from "../../../assets/icons/icon-styles.svg"
import CameraIcon from "../../../assets/icons/icon-camera.svg"
import {HideShowMenuList} from "./inspector-panel/hide-show-menu-list"
import {PointFormatPalette} from "./inspector-panel/point-format-palette"
import {GraphMeasurePalette} from "./inspector-panel/graph-measure-palette"
import { t } from "../../../utilities/translation/translate"
import { updateTileNotification } from "../../../models/tiles/tile-notifications"
import {useDndContext} from "@dnd-kit/core"
import {ITileInspectorPanelProps} from "../../tiles/tile-base-props"
import {isGraphContentModel} from "../models/graph-content-model"
import { DisplayConfigPalette } from "./inspector-panel/display-config-palette"
import { CameraMenuList } from "./camera-menu-list"


export const GraphInspector = observer(function GraphInspector({tile, show}: ITileInspectorPanelProps) {
  const graphModel = isGraphContentModel(tile?.content) ? tile?.content : undefined
  const [showPalette, setShowPalette] = useState<string | undefined>(undefined)
  const panelRef = useRef<HTMLDivElement>()
  const panelRect = panelRef.current?.getBoundingClientRect()
  const buttonRef = useRef<HTMLDivElement>()
  const buttonRect = buttonRef.current?.getBoundingClientRect()
  const {active} = useDndContext()
  const showDisplayConfig = graphModel?.plot.showDisplayConfig

  useEffect(() => {
    !show && setShowPalette(undefined)
  }, [active, show])

  const handleClosePalette = () => {
    setShowPalette(undefined)
  }

  const handleRulerButton = () => {
    setShowPalette(showPalette === "measure" ? undefined : "measure")
  }

  const handleConfigButton = () => {
    setShowPalette(showPalette === "config" ? undefined : "config")
  }

  const handleBrushButton = () => {
    setShowPalette(showPalette === "format" ? undefined : "format")
  }

  const setButtonRef = (ref: any) => {
    buttonRef.current = ref.current
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
      <InspectorButton tooltip={t(rescaleTooltip)} isDisabled={graphModel?.noPossibleRescales}
                       showMoreOptions={false} testId={"graph-resize-button"} onButtonClick={handleGraphRescale}>
        <ScaleDataIcon/>
      </InspectorButton>
    )
  }

  return (
    <InspectorPanel ref={panelRef} component="graph data-display" show={show} setShowPalette={setShowPalette}>
      {renderRescaleButton()}
      <InspectorMenu tooltip={t("DG.Inspector.hideShow.toolTip")}
                     icon={<HideShowIcon/>} testId={"graph-hide-show-button"} onButtonClick={handleClosePalette}>
        <HideShowMenuList tile={tile}/>
      </InspectorMenu>
      <InspectorButton tooltip={t("DG.Inspector.displayValues.toolTip")} showMoreOptions={true}
                       onButtonClick={handleRulerButton} setButtonRef={setButtonRef}
                       testId={"graph-display-values-button"}>
        <ValuesIcon/>
      </InspectorButton>
      {showDisplayConfig &&
        <InspectorButton tooltip={t("DG.Inspector.displayConfiguration.toolTip")} showMoreOptions={true}
                       onButtonClick={handleConfigButton} setButtonRef={setButtonRef}
                       testId={"graph-display-config-button"}>
          <BarChartIcon/>
        </InspectorButton>}
      <InspectorButton tooltip={t("DG.Inspector.displayStyles.toolTip")} showMoreOptions={true}
                       onButtonClick={handleBrushButton} setButtonRef={setButtonRef}
                       testId={"graph-display-styles-button"}>
        <StylesIcon/>
      </InspectorButton>
      <InspectorMenu tooltip={t("DG.Inspector.makeImage.toolTip")} icon={<CameraIcon/>}
                     onButtonClick={handleClosePalette} testId={"graph-camera-button"}>
        <CameraMenuList/>
      </InspectorMenu>
      {showPalette === "measure" &&
        <GraphMeasurePalette tile={tile} setShowPalette={setShowPalette}
                             panelRect={panelRect} buttonRect={buttonRect}/>}

      {showPalette === "config" &&
        <DisplayConfigPalette tile={tile} setShowPalette={setShowPalette}
                              panelRect={panelRect} buttonRect={buttonRect}/>}
      {showPalette === "format" &&
        <PointFormatPalette tile={tile} setShowPalette={setShowPalette}
                            panelRect={panelRect} buttonRect={buttonRect}/>}
    </InspectorPanel>
  )
})
