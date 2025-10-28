import { MenuItem, MenuList } from "@chakra-ui/react"
import React from "react"
import { ITileModel } from "../../../../models/tiles/tile-model"
import { t } from "../../../../utilities/translation/translate"
import { openInDrawTool } from "../../../data-display/data-display-image-utils"
import { isMapContentModel } from "../../models/map-content-model"
import { useCfmContext } from "../../../../hooks/use-cfm-context"

interface IProps {
  tile?: ITileModel
}

export const SaveImageMenuList = ({tile}: IProps) => {
  const cfm = useCfmContext()
  const mapModel = isMapContentModel(tile?.content) ? tile?.content : undefined

  const getImageString = async () => {
    if (!mapModel?.renderState) return ''
    // TODO: Confirm that updateSnapshot works correctly for map models. If not, add map-specific handling
    //  or tests to validate its behavior.
    await mapModel.renderState.updateSnapshot()
    return mapModel.renderState.dataUri || ''
  }

  const handleExportPNG = async () => {
    let imageString = await getImageString()
    imageString = imageString.replace("data:image/png;base64,", "")
    if (imageString) {
      cfm?.client.saveSecondaryFileAsDialog(imageString, "png", "image/png", () => null)
    } else {
      console.error("Error exporting PNG image.")
    }
  }

  const handleExportSVG = () => {
    alert("SVG export is not currently supported for map images.")
    /*
    if (!graphModel?.renderState) return

    const { imageOptions } = graphModel.renderState
    if (!imageOptions) return

    // TODO: The current strategy for turning a graph into an SVG involves wrapping the whole tile in a foreignObject,
    // which will not render in Word, Notes, etc.
    const svgString = graphSvg(imageOptions)

    if (svgString) {
      cfm?.client.saveSecondaryFileAsDialog(svgString, "svg", "text/plain", () => null)
    }
    */
  }

  return (
    <MenuList data-testid="save-image-menu-list">
      <MenuItem data-testid="open-in-draw-tool" onClick={ async () => {
        if (tile) {
          const imageString = await getImageString()
          await openInDrawTool(tile, imageString)
        }
      }}>
        {t("DG.DataDisplayMenu.copyAsImage")}
      </MenuItem>
      <MenuItem data-testid="export-png-image" onClick={handleExportPNG}>
        {t("DG.DataDisplayMenu.exportPngImage")}
      </MenuItem>
      <MenuItem data-testid="export-svg-image" onClick={handleExportSVG}>
        {t("DG.DataDisplayMenu.exportSvgImage")}
      </MenuItem>
    </MenuList>
  )
}
