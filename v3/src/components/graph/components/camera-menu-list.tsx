import React from "react"
import { observer } from "mobx-react-lite"
import { MenuItem, MenuList } from "@chakra-ui/react"
import { getDrawToolPluginUrl } from "../../../constants"
import { getPositionOfNewComponent } from "../../../utilities/view-utils"
import { getTileInfo } from "../../../models/document/tile-utils"
import { useCfmContext } from "../../../hooks/use-cfm-context"
import { useTileModelContext } from "../../../hooks/use-tile-model-context"
import { isFreeTileRow } from "../../../models/document/free-tile-row"
import { updateTileNotification } from "../../../models/tiles/tile-notifications"
import { logMessageWithReplacement } from "../../../lib/log-message"
import { t } from "../../../utilities/translation/translate"
import { getTitle } from "../../../models/tiles/tile-content-info"
import { appState } from "../../../models/app-state"
import { kWebViewTileType } from "../../web-view/web-view-defs"
import { IWebViewSnapshot } from "../../web-view/web-view-model"
import { isGraphContentModel } from "../models/graph-content-model"
import { graphSvg } from "../utilities/image-utils"

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

  const openInDrawTool = async () => {
    const title = (tile && getTitle?.(tile)) || tile?.title || ""
    const { dimensions = { width: 400, height: 300 } } = tile?.id ? getTileInfo(tile?.id || '') : {}
    const computedPosition = getPositionOfNewComponent(dimensions)
    const imageString = await getImageString()
    const webViewModelSnap: IWebViewSnapshot = {
      type: kWebViewTileType,
      subType: "plugin",
      url: getDrawToolPluginUrl(),
    }
    const drawTileModel = appState.document.content?.insertTileSnapshotInDefaultRow({
      _title: `Draw: ${title}`,
      content: webViewModelSnap
    })
    const drawContentModel = drawTileModel?.content
    if (drawContentModel && imageString) {
      // Give the draw tool a moment to initialize before passing the image to it
      setTimeout(() => {
        drawContentModel.broadcastMessage({
          action: "update",
          resource: 'backgroundImage',
          values: { image: imageString }
        }, () => null)
        const row = appState.document.content?.findRowContainingTile(drawTileModel?.id)
        const freeTileRow = row && isFreeTileRow(row) ? row : undefined
        freeTileRow?.setTilePosition(drawTileModel?.id, computedPosition)
      }, 500)
    }
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

      <MenuItem data-testid="open-in-draw-tool" onClick={openInDrawTool}>
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
})
