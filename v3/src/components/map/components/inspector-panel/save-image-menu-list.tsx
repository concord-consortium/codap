import { MenuItem, MenuList } from "@chakra-ui/react"
import React from "react"
import { toPng, toSvg } from 'html-to-image';

import { ITileModel } from "../../../../models/tiles/tile-model"
import { t } from "../../../../utilities/translation/translate"
import { openInDrawTool } from "../../../data-display/data-display-image-utils"
import { isMapContentModel } from "../../models/map-content-model"
import { useCfmContext } from "../../../../hooks/use-cfm-context"

type ExportableFormat = "png" | "svg"

interface IProps {
  tile?: ITileModel
}

export const SaveImageMenuList = ({tile}: IProps) => {
  const cfm = useCfmContext()
  const mapModel = isMapContentModel(tile?.content) ? tile?.content : undefined

  const getImageDataUri = async (format: ExportableFormat) => {
    if (!mapModel?.renderState) {
      return undefined
    }
    const {displayElement} = mapModel.renderState
    let dataUri: string|undefined = undefined

    // TODO: show a "in progress" indicator while the image is being generated
    // as it can take a noticeable amount of time
    try {
      dataUri = await (format === "png"
        ? toPng(displayElement)
        : toSvg(displayElement))
    } catch (error) {
      console.error(`Error generating ${format.toUpperCase()} image:`, error)
      // TODO: report error to user in translatable string
    }

    return dataUri
  }

  const getImageDataString = async (format: ExportableFormat) => {
    const dataUri = await getImageDataUri(format)
    const parts = dataUri?.split(",")
    if (parts?.length === 2) {
      if (parts[0].indexOf("charset=utf-8") >= 0) {
        return decodeURIComponent(parts[1])
      }
      return parts[1]
    }
    return undefined
  }

  const handleOpenInDrawTool = async () => {
    if (tile) {
      const imageDataUri = await getImageDataUri("png")
      await openInDrawTool(tile, imageDataUri || "")
    }
  }

  const handleExportPNG = async () => {
    const imageString = await getImageDataString("png")
    if (imageString) {
      cfm?.client.saveSecondaryFileAsDialog(imageString, "png", "image/png", () => null)
    }
  }

  const handleExportSVG = async () => {
    const imageString = await getImageDataString("svg")
    if (imageString) {
      // NOTE: Using application/octet-stream so that the CFM does not try to convert from base64
      // as it does by default for image-based mime types.
      cfm?.client.saveSecondaryFileAsDialog(imageString, "svg", "application/octet-stream", () => null)
    }
  }

  return (
    <MenuList data-testid="save-image-menu-list">
      <MenuItem data-testid="open-in-draw-tool" onClick={handleOpenInDrawTool}>
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
