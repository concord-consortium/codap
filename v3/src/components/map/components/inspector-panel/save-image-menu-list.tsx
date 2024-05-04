import { MenuItem, MenuList, useToast } from "@chakra-ui/react"
import React from "react"
import { ITileModel } from "../../../../models/tiles/tile-model"
import { t } from "../../../../utilities/translation/translate"

interface IProps {
  tile?: ITileModel
}

export const SaveImageMenuList = ({tile}: IProps) => {
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

  return (
    <MenuList data-testid="save-image-menu-list">
      <MenuItem onClick={()=>handleMenuItemClick("Open in Draw Tool")}>
        {t('DG.DataDisplayMenu.copyAsImage')}
      </MenuItem>
      <MenuItem onClick={()=>handleMenuItemClick("Export PNG Image")}>
        {t('DG.DataDisplayMenu.exportPngImage')}
      </MenuItem>
      <MenuItem onClick={()=>handleMenuItemClick("Export SVG Image")}>
        {t('DG.DataDisplayMenu.exportSvgImage')}
      </MenuItem>
    </MenuList>
  )
}
