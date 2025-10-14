import { MenuItem, MenuList } from "@chakra-ui/react"
import React from "react"
import { ITileModel } from "../../../../models/tiles/tile-model"
import { t } from "../../../../utilities/translation/translate"
import { UnimplementedMenuItem } from "../../../beta/unimplemented-menu-item"
import { openInDrawTool } from "../../../data-display/data-display-image-utils"
import { isMapContentModel } from "../../models/map-content-model"

interface IProps {
  tile?: ITileModel
}

export const SaveImageMenuList = ({tile}: IProps) => {
  const mapModel = isMapContentModel(tile?.content) ? tile?.content : undefined

  const getImageString = async () => {
    if (!mapModel?.renderState) return ''
    // TODO: Confirm that updateSnapshot works correctly for map models. If not, add map-specific handling
    //  or tests to validate its behavior.
    await mapModel.renderState.updateSnapshot()
    return mapModel.renderState.dataUri || ''
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
      <UnimplementedMenuItem label={t('DG.DataDisplayMenu.exportPngImage')} />
      <UnimplementedMenuItem label={t('DG.DataDisplayMenu.exportSvgImage')} />
    </MenuList>
  )
}
