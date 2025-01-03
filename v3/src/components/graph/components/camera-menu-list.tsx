import React, { useState } from "react"
import { MenuItem, MenuList, useToast } from "@chakra-ui/react"
import { t } from "../../../utilities/translation/translate"
import { useTileModelContext } from "../../../hooks/use-tile-model-context"
import { isGraphContentModel } from "../models/graph-content-model"
import { useCfmContext } from "../../../hooks/use-cfm-context"

export const CameraMenuList = () => {
  const tile = useTileModelContext().tile
  const graphModel = isGraphContentModel(tile?.content) ? tile?.content : undefined
  const cfm = useCfmContext()
  const [hasBackgroundImage, setHasBackgroundImage] = useState(false)
  const [imageLocked, setImageLocked] = useState(false)
  const toast = useToast()
  const handleMenuItemClick = (menuItem: string) => {
    toast({
      title: 'Menu item clicked',
      description: `You clicked on ${menuItem}`,
      status: 'success',
      duration: 5000,
      isClosable: true,
    })
  }

  const handleAddBackgroundImage = () => {
    setHasBackgroundImage(true)
    handleMenuItemClick("Add Background Image clicked")
  }

  const handleRemoveBackgroundImage = () => {
    setHasBackgroundImage(false)
    handleMenuItemClick("Remove Background Image clicked")
  }

  const handleUnlockImage = () => {
    setImageLocked(false)
    handleMenuItemClick("Unlock Image clicked")
  }

  const handleLockImage = () => {
    setImageLocked(true)
    handleMenuItemClick("Lock Image clicked")
  }

  const handleCopyImage = () => {
    handleMenuItemClick("Copy Image clicked")
  }

  const handleExportPNG = async () => {
    if (!graphModel?.renderState) return

    await graphModel.renderState.updateSnapshot()

    if (graphModel.renderState.dataUri) {
      const imageString = graphModel.renderState.dataUri.replace("data:image/png;base64,", "")
      cfm?.client.saveSecondaryFileAsDialog(imageString, "png", "image/png")
    } else {
      console.error("Error exporting PNG image.")
    }
  }

  const handleExportSVG = () => {
    handleMenuItemClick("Export SVG Image clicked")
  }

  return (
    <MenuList data-testid="graph-camera-menu-list">
      {hasBackgroundImage
        ? <>
            <MenuItem onClick={handleRemoveBackgroundImage} data-testid="remove-background-image">
              {t("DG.DataDisplayMenu.removeBackgroundImage")}
            </MenuItem>
            {imageLocked
              ? <MenuItem onClick={handleUnlockImage} data-testid="unlock-image">
                  {t("DG.DataDisplayMenu.unlockImageFromAxes")}
                </MenuItem>
              : <MenuItem onClick={handleLockImage} data-testid="lock-image">
                  {t("DG.DataDisplayMenu.lockImageToAxes")}
                </MenuItem>
            }
          </>
        : <MenuItem onClick={handleAddBackgroundImage} data-testid="add-background-image">
            {t("DG.DataDisplayMenu.addBackgroundImage")}
          </MenuItem>
      }
      <MenuItem data-testid="open-in-draw-tool" onClick={handleCopyImage}>
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
