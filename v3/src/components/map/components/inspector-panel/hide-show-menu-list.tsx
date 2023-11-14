import { MenuItem, MenuList, useToast } from "@chakra-ui/react"
import React from "react"
import { useDataSetContext } from "../../../../hooks/use-data-set-context"
import { ITileModel } from "../../../../models/tiles/tile-model"
import {isMapContentModel} from "../../models/map-content-model"
import t from "../../../../utilities/translation/translate"

interface IProps {
  tile?: ITileModel
}

export const HideShowMenuList = ({tile}: IProps) => {
  const data = useDataSetContext()
  const toast = useToast()
  // const mapModel = isMapContentModel(tile?.content) ? tile?.content : undefined
  const handleMenuItemClick = (menuItem: string) => {
    toast({
      title: 'Menu item clicked',
      description: `You clicked on ${menuItem}`,
      status: 'success',
      duration: 5000,
      isClosable: true,
    })
  }

  const hideSelectedString = (data?.selectCases?.length ?? 0) === 1
                              ? t("DG.DataDisplayMenu.hideSelectedSing")
                              : t("DG.DataDisplayMenu.hideSelectedPlural")
  const hideUnselectedString = data && (data.cases.length - data.selectCases.length) === 1
                              ? t("DG.DataDisplayMenu.hideUnselectedSing")
                              : t("DG.DataDisplayMenu.hideUnselectedPlural")

  return (
    <MenuList data-testid="trash-menu-list">
      <MenuItem onClick={()=>handleMenuItemClick("Hide selected cases")}>{hideSelectedString}</MenuItem>
      <MenuItem onClick={()=>handleMenuItemClick("Hide unselected cases")}>{hideUnselectedString}</MenuItem>
      <MenuItem onClick={()=>handleMenuItemClick("Show all cases")}>{t("DG.DataDisplayMenu.showAll")}</MenuItem>
      <MenuItem onClick={()=>handleMenuItemClick("Display only selected cases")}>
        {t("DG.DataDisplayMenu.displayOnlySelected")}
      </MenuItem>
    </MenuList>
  )
}
