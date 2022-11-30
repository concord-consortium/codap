import { MenuItem, MenuList, useToast } from "@chakra-ui/react"
import React from "react"
import { useDataSetContext } from "../../../../hooks/use-data-set-context"
import t from "../../../../utilities/translation/translate"

interface IProps {
  showParentToggles?: boolean
  setShowParentToggles?: (show: boolean) => void
  showMeasuresForSelection?: boolean
  setShowMeasuresForSelection?: (show: boolean) => void
}

export const HideShowMenuList = ({showParentToggles, setShowParentToggles, showMeasuresForSelection,
    setShowMeasuresForSelection}: IProps) => {
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

  const hideSelectedString = data?.selectCases && data?.selectCases.length > 1
                              ? t("DG.DataDisplayMenu.hideSelectedPlural")
                              : t("DG.DataDisplayMenu.hideSelectedSing")
  const hideUnselectedString = data && (data.cases.length - data.selectCases.length) > 1
                              ? t("DG.DataDisplayMenu.hideUnselectedPlural")
                              : t("DG.DataDisplayMenu.hideUnselectedSing")
  const parentToggleString = showParentToggles ? t("DG.DataDisplayMenu.disableNumberToggle")
                                               : t("DG.DataDisplayMenu.enableNumberToggle")
  const measuresForSelectionString = showMeasuresForSelection ? t("DG.DataDisplayMenu.disableMeasuresForSelection")
                                               : t("DG.DataDisplayMenu.enableMeasuresForSelection")

  return (
    <MenuList data-testid="trash-menu-list">
      <MenuItem onClick={()=>handleMenuItemClick("Hide selected cases")}>{hideSelectedString}</MenuItem>
      <MenuItem onClick={()=>handleMenuItemClick("Hide unselected cases")}>{hideUnselectedString}</MenuItem>
      <MenuItem onClick={()=>handleMenuItemClick("Show all cases")}>{t("DG.DataDisplayMenu.showAll")}</MenuItem>
      <MenuItem onClick={()=>handleMenuItemClick("Display only selected cases")}>
        {t("DG.DataDisplayMenu.displayOnlySelected")}
      </MenuItem>
      <MenuItem onClick={()=>handleMenuItemClick("Show Parent Visibility toggles")}>{parentToggleString}</MenuItem>
      <MenuItem onClick={()=>handleMenuItemClick("Show Measure for Selection")}>{measuresForSelectionString}</MenuItem>

    </MenuList>
  )
}
