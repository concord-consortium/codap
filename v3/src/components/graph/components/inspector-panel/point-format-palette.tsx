import {observer} from "mobx-react-lite"
import { t } from "../../../../utilities/translation/translate"
import { ITileModel } from "../../../../models/tiles/tile-model"
import {isGraphContentModel} from "../../models/graph-content-model"
import {InspectorPalette} from "../../../inspector-panel"
import FormatIcon from "../../../../assets/icons/inspector-panel/format-icon.svg"
import {DisplayItemFormatControl} from "../../../data-display/inspector/display-item-format-control"

interface IProps {
  id?: string
  tile?: ITileModel
  panelRect?: DOMRect
  buttonRect?: DOMRect
  setShowPalette: (palette: string | undefined) => void;
}

export const PointFormatPalette = observer(function PointFormatPalette({id, tile, panelRect, buttonRect,
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
      id={id}
      title={t("DG.Inspector.styles")}
      Icon={<FormatIcon/>}
      setShowPalette={setShowPalette}
      panelRect={panelRect}
      buttonRect={buttonRect}
      tileType="graph"
    >
      <DisplayItemFormatControl
        dataConfiguration={graphModel.dataConfiguration}
        displayItemDescription={graphModel.pointDescription}
        pointDisplayType={graphModel.plot.displayType}
        isTransparent={graphModel.isTransparent}
        plotBackgroundColor={graphModel.plotBackgroundColor}
        onBackgroundTransparencyChange={handleBackgroundTransparencyChange}
        onBackgroundColorChange={handleBackgroundColorChange}
      />
    </InspectorPalette>
  )
})
