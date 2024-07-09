import React, { useState } from "react"
import { MenuItem, MenuList } from "@chakra-ui/react"
import { t } from "../../../utilities/translation/translate"

export const CameraMenuList = () => {
  const [hasBackgroundImage, setHasBackgroundImage] = useState(false)
  const [imageLocked, setImageLocked] = useState(false)

  const handleAddBackgroundImage = () => {
    setHasBackgroundImage(true)
  }

  const handleRemoveBackgroundImage = () => {
    setHasBackgroundImage(false)
  }

  const handleUnlockImage = () => {
    setImageLocked(false)
  }

  const handleLockImage = () => {
    setImageLocked(true)
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
      <MenuItem data-testid="open-in-draw-tool">{t("DG.DataDisplayMenu.copyAsImage")}</MenuItem>
      <MenuItem data-testid="export-png-image">{t("DG.DataDisplayMenu.exportPngImage")}</MenuItem>
      <MenuItem data-testid="export-svg-image">{t("DG.DataDisplayMenu.exportSvgImage")}</MenuItem>
    </MenuList>
  )
}
