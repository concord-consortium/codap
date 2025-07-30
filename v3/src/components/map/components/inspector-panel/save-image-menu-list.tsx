import { MenuList } from "@chakra-ui/react"
import React from "react"
import { ITileModel } from "../../../../models/tiles/tile-model"
import { t } from "../../../../utilities/translation/translate"
import { UnimplementedMenuItem } from "../../../beta/unimplemented-menu-item"

interface IProps {
  tile?: ITileModel
}

export const SaveImageMenuList = ({tile}: IProps) => {

  return (
    <MenuList data-testid="save-image-menu-list">
      <UnimplementedMenuItem label={t('DG.DataDisplayMenu.copyAsImage')} />
      <UnimplementedMenuItem label={t('DG.DataDisplayMenu.exportPngImage')} />
      <UnimplementedMenuItem label={t('DG.DataDisplayMenu.exportSvgImage')} />
    </MenuList>
  )
}
