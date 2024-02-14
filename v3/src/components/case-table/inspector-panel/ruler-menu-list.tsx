import { MenuItem, MenuList, useToast } from "@chakra-ui/react"
import React from "react"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { uniqueName } from "../../../utilities/js-utils"
import { t } from "../../../utilities/translation/translate"

export const RulerMenuList = () => {
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

  const handleAddNewAttribute = () => {
    const newAttrName = uniqueName("newAttr",
      (aName: string) => !data?.attributes.find(attr => aName === attr.name)
     )
    data?.addAttribute({name: newAttrName})
  }

  return (
    <MenuList data-testid="trash-menu-list">
      <MenuItem
        onClick={handleAddNewAttribute}>{t("DG.Inspector.newAttribute", { vars: [data?.name || ""] })}
      </MenuItem>
      <MenuItem onClick={()=>handleMenuItemClick("Rerandomize All")}>{t("DG.Inspector.randomizeAllAttributes")}
      </MenuItem>
      <MenuItem onClick={()=>handleMenuItemClick("Export Case Data")}>{t("DG.Inspector.exportCaseData")}</MenuItem>
      <MenuItem
        onClick={()=>handleMenuItemClick("Copy Case Data To Clipboard")}>{t("DG.Inspector.copyCaseDataToClipboard")}
      </MenuItem>
      <MenuItem
        onClick={()=>handleMenuItemClick("Get Case Data From Clipboard")}>{t("DG.Inspector.getCaseDataFromClipboard")}
      </MenuItem>
    </MenuList>
  )
}
