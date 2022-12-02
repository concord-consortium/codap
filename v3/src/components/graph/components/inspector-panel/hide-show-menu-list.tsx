import { MenuItem, MenuList, useToast } from "@chakra-ui/react"
import React from "react"
import { useDataSetContext } from "../../../../hooks/use-data-set-context"
import t from "../../../../utilities/translation/translate"
import { IGraphModel } from "../../models/graph-model"

interface IProps {
  graphModel: IGraphModel
}

export const HideShowMenuList = ({graphModel}: IProps) => {
  const data = useDataSetContext()
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

  const hideSelectedString = (data?.selectCases?.length ?? 0) === 1
                              ? t("DG.DataDisplayMenu.hideSelectedSing")
                              : t("DG.DataDisplayMenu.hideSelectedPlural")
  const hideUnselectedString = data && (data.cases.length - data.selectCases.length) === 1
                              ? t("DG.DataDisplayMenu.hideUnselectedSing")
                              : t("DG.DataDisplayMenu.hideUnselectedPlural")
  const parentToggleString = graphModel.showParentToggles
                              ? t("DG.DataDisplayMenu.disableNumberToggle")
                              : t("DG.DataDisplayMenu.enableNumberToggle")
  const measuresForSelectionString = graphModel.showMeasuresForSelection
                                      ? t("DG.DataDisplayMenu.disableMeasuresForSelection")
                                      : t("DG.DataDisplayMenu.enableMeasuresForSelection")

  return (
    <MenuList data-testid="trash-menu-list">
      <MenuItem onClick={()=>handleMenuItemClick("Hide selected cases")}>{hideSelectedString}</MenuItem>
      <MenuItem onClick={()=>handleMenuItemClick("Hide unselected cases")}>{hideUnselectedString}</MenuItem>
      <MenuItem onClick={()=>handleMenuItemClick("Show all cases")}>{t("DG.DataDisplayMenu.showAll")}</MenuItem>
      <MenuItem onClick={()=>handleMenuItemClick("Display only selected cases")}>
        {t("DG.DataDisplayMenu.displayOnlySelected")}
      </MenuItem>
      <MenuItem onClick={()=>graphModel.setShowParentToggles(!graphModel.showParentToggles)}>
          {parentToggleString}
      </MenuItem>
      <MenuItem onClick={()=>graphModel.setShowMeasuresForSelection(!graphModel.showMeasuresForSelection)}>
        {measuresForSelectionString}
      </MenuItem>
    </MenuList>
  )
}
