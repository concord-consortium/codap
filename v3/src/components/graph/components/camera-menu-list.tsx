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
            <MenuItem onClick={handleRemoveBackgroundImage}>{t("DG.DataDisplayMenu.removeBackgroundImage")}</MenuItem>
            {imageLocked
              ? <MenuItem onClick={handleUnlockImage}>{t("DG.DataDisplayMenu.unlockImageFromAxes")}</MenuItem>
              : <MenuItem onClick={handleLockImage}>{t("DG.DataDisplayMenu.lockImageToAxes")}</MenuItem>
            }
          </>
        : <MenuItem onClick={handleAddBackgroundImage}>{t("DG.DataDisplayMenu.addBackgroundImage")}</MenuItem>
      }
      <MenuItem>{t("DG.DataDisplayMenu.copyAsImage")}</MenuItem>
      <MenuItem>{t("DG.DataDisplayMenu.exportPngImage")}</MenuItem>
      <MenuItem>{t("DG.DataDisplayMenu.exportSvgImage")}</MenuItem>
    </MenuList>
  )
}
