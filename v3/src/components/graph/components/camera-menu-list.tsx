import React from "react"
import { observer } from "mobx-react-lite"
import { MenuItem, MenuList } from "@chakra-ui/react"
import { useCfmContext } from "../../../hooks/use-cfm-context"
import { useTileModelContext } from "../../../hooks/use-tile-model-context"
import { updateTileNotification } from "../../../models/tiles/tile-notifications"
import { logMessageWithReplacement } from "../../../lib/log-message"
import { t } from "../../../utilities/translation/translate"
import { isGraphContentModel } from "../models/graph-content-model"
import { openInDrawTool } from "../../data-display/data-display-image-utils"

export const CameraMenuList = observer(function CameraMenuList() {
  const tile = useTileModelContext().tile
  const graphModel = isGraphContentModel(tile?.content) ? tile?.content : undefined
  const cfm = useCfmContext()
  const backgroundImage = graphModel?.plotBackgroundImage
  const backgroundImageIsLocked = graphModel?.plotBackgroundImageLockInfo?.locked ?? false
  const xAndOrYIsNumeric = graphModel?.getNumericAxis('bottom') ||
    graphModel?.getNumericAxis('left')

  const addBackgroundImage = () => {
    const handleAbnormal = () => {
      console.error("Abort or error on file read.")
    }

    const handleRead = function (this: FileReader) {
      if (!graphModel) return
      const result = this.result as string | null
      if (result) {
        graphModel?.applyModelChange(
          () => graphModel.setBackgroundImage(result),
          {
            undoStringKey: "DG.Undo.graph.addBackgroundImage",
            redoStringKey: "DG.Redo.graph.addBackgroundImage",
            log: logMessageWithReplacement(`added background image`, {}),
            notify: updateTileNotification("added background image", {}, tile)
          }
        )
      }
    }

    const parseData = (data: { file: { object: Blob } }) => {
      if (data) {
        const tReader = new FileReader()
        tReader.onabort = handleAbnormal
        tReader.onerror = handleAbnormal
        tReader.onload = handleRead
        tReader.readAsDataURL(data.file.object)
      }
    }

    return cfm?.client._ui.importDataDialog((data: { file: { object: Blob } }) => {
      parseData(data)
    })
  }

  const removeBackgroundImage = () => {
    graphModel?.applyModelChange(
      () => graphModel.removeBackgroundImage(),
      {
        undoStringKey: "DG.Undo.graph.removeBackgroundImage",
        redoStringKey: "DG.Redo.graph.removeBackgroundImage",
        log: logMessageWithReplacement(`removed background image`, {}),
        notify: updateTileNotification("removed background image", {}, tile)
      }
    )
  }

  const toggleBackgroundImageLock = () => {
    if (!graphModel) return
    const lockInfo = graphModel.plotBackgroundImageLockInfo
    const isLocked = lockInfo?.locked ?? false
    const undoKey = isLocked ? "DG.Undo.graph.unlockBackgroundImage" : "DG.Undo.graph.lockBackgroundImage"
    const redoKey = isLocked ? "DG.Redo.graph.unlockBackgroundImage" : "DG.Redo.graph.lockBackgroundImage"
    graphModel.applyModelChange(
      () => graphModel.setBackgroundImageLock(!isLocked),
      {
        undoStringKey: undoKey,
        redoStringKey: redoKey,
        log: logMessageWithReplacement(`${isLocked ? "unlocked" : "locked"} background image from axes`, {}),
        notify: updateTileNotification("background locked to axes", { to: isLocked ? 'unlocked' : 'locked' }, tile)
      }
    )
  }

  const getImageString = async () => {
    if (!graphModel?.renderState) return ''
    await graphModel.renderState.updateSnapshot()
    return graphModel.renderState.dataUri || ''
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

/*  Scheduled to happen in 3.1 timeframe
  const handleExportSVG = () => {
    if (!graphModel?.renderState) return

    const { imageOptions } = graphModel.renderState
    if (!imageOptions) return

    // TODO: The current strategy for turning a graph into an SVG involves wrapping the whole tile in a foreignObject,
    // which will not render in Word, Notes, etc.
    const svgString = graphSvg(imageOptions)

    if (svgString) {
      cfm?.client.saveSecondaryFileAsDialog(svgString, "svg", "text/plain", () => null)
    }
  }
*/

  return (
    <MenuList data-testid="graph-camera-menu-list">
      {
        backgroundImage !== undefined
        ? <>
            <MenuItem data-testid="remove-background-image" onClick={removeBackgroundImage}>
              {t("DG.DataDisplayMenu.removeBackgroundImage")}
            </MenuItem>
            {xAndOrYIsNumeric ?
              (backgroundImageIsLocked
              ? <MenuItem data-testid="unlock-image" onClick={toggleBackgroundImageLock}>
                  {t("DG.DataDisplayMenu.unlockImageFromAxes")}
                </MenuItem>
              : <MenuItem data-testid="lock-image" onClick={toggleBackgroundImageLock}>
                  {t("DG.DataDisplayMenu.lockImageToAxes")}
                </MenuItem>)
        : null
            }
          </>
        : <MenuItem data-testid="add-background-image" onClick={addBackgroundImage}>
            {t("DG.DataDisplayMenu.addBackgroundImage")}
          </MenuItem>
      }

      <MenuItem data-testid="open-in-draw-tool"
                onClick={
                  async () => {
                    if (tile) {
                      const imageString = await getImageString()
                      await openInDrawTool(tile, imageString)
                    }
                  }}
                isDisabled={true}>
        {t("DG.DataDisplayMenu.copyAsImage")} 🚧
      </MenuItem>
      <MenuItem data-testid="export-png-image"
                onClick={handleExportPNG}
                isDisabled={true}>
        {t("DG.DataDisplayMenu.exportPngImage")} 🚧
      </MenuItem>
{/*
      <MenuItem data-testid="export-svg-image" onClick={handleExportSVG}>
        {t("DG.DataDisplayMenu.exportSvgImage")}
      </MenuItem>
*/}
    </MenuList>
  )
})
