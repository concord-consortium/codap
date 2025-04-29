import React from "react"
import {observer} from "mobx-react-lite"
import { t } from "../../../../utilities/translation/translate"
import { ITileModel } from "../../../../models/tiles/tile-model"
import {isGraphContentModel} from "../../models/graph-content-model"
import {InspectorPalette} from "../../../inspector-panel"
import StylesIcon from "../../../../assets/icons/icon-styles.svg"
import {DisplayItemFormatControl} from "../../../data-display/inspector/display-item-format-control"

interface IProps {
  tile?: ITileModel
  panelRect?: DOMRect
  buttonRect?: DOMRect
  setShowPalette: (palette: string | undefined) => void;
}

export const PointFormatPalette = observer(function PointFormatPalette({tile, panelRect, buttonRect,
    setShowPalette}: IProps) {
  const graphModel = isGraphContentModel(tile?.content) ? tile?.content : undefined

  if (!graphModel) return null

  const handleBackgroundTransparencyChange = (isTransparent: boolean) => {
    graphModel.applyModelChange(() => graphModel.setIsTransparent(isTransparent),
    {
      undoStringKey: "DG.Undo.graph.toggleTransparent",
      redoStringKey: "DG.Redo.graph.toggleTransparent",
      log: `Made plot background ${isTransparent ? "transparent" : "opaque"}`
    })
  }

  const handleBackgroundColorChange = (color: string) => {
    graphModel.applyModelChange(() => graphModel.setPlotBackgroundColor(color),
    {
      undoStringKey: "DG.Undo.graph.changeBackgroundColor",
      redoStringKey: "DG.Redo.graph.changeBackgroundColor",
      log: "Changed background color"
    })
  }

  return (
    <InspectorPalette
      title={t("DG.Inspector.styles")}
      Icon={<StylesIcon/>}
      setShowPalette={setShowPalette}
      panelRect={panelRect}
      buttonRect={buttonRect}
    >
      <DisplayItemFormatControl
        dataConfiguration={graphModel.dataConfiguration}
        displayItemDescription={graphModel.pointDescription}
        pointDisplayType={graphModel.plot.displayType}
        isTransparent={graphModel.isTransparent}
        plotBackgroundColor={graphModel.plotBackgroundColor}
        isGraphModel = {!!graphModel}
        onBackgroundTransparencyChange={handleBackgroundTransparencyChange}
        onBackgroundColorChange={handleBackgroundColorChange}
      />
    </InspectorPalette>
  )
})
