import { MenuItem, MenuList, useToast } from "@chakra-ui/react"
import React from "react"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { logStringifiedObjectMessage } from "../../../lib/log-message"
import { IAttribute } from "../../../models/data/attribute"
import { createAttributesNotification } from "../../../models/data/data-set-notifications"
import { uiState } from "../../../models/ui-state"
import { uniqueName } from "../../../utilities/js-utils"
import { preventCollectionReorg } from "../../../utilities/plugin-utils"
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

  const handleAddNewAttribute = (collectionId: string) => () => {
    let attribute: IAttribute | undefined
    data?.applyModelChange(() => {
      const newAttrName = uniqueName("newAttr",
        (aName: string) => !data.attributes.find(attr => aName === attr.name)
      )
      attribute = data.addAttribute({name: newAttrName}, { collection: collectionId })
      if (attribute) {
        uiState.setAttrIdToEdit(attribute.id)
      }
    }, {
      notify: () => createAttributesNotification(attribute ? [attribute] : [], data),
      undoStringKey: "DG.Undo.caseTable.createAttribute",
      redoStringKey: "DG.Redo.caseTable.createAttribute",
      log: logStringifiedObjectMessage("attributeCreate: %@",
        {name: "newAttr", collection: data?.getCollection(collectionId)?.name, formula: ""})
    })
  }

  const addAttributeButtons = data
    ? data.collections.map(collection => (
      <MenuItem
        isDisabled={preventCollectionReorg(data, collection.id)}
        key={`menu-add-attribute-button-${collection.id}`}
        onClick={handleAddNewAttribute(collection.id)}
      >
        {t("DG.Inspector.newAttribute", { vars: [collection.title] })}
      </MenuItem>
    ))
    : []

  return (
    <MenuList data-testid="ruler-menu-list">
      {...addAttributeButtons}
      <MenuItem onClick={()=>handleMenuItemClick("Rerandomize All")}>
        {t("DG.Inspector.randomizeAllAttributes")}
      </MenuItem>
      <MenuItem onClick={()=>handleMenuItemClick("Export Case Data")}>
        {t("DG.Inspector.exportCaseData")}
      </MenuItem>
      <MenuItem onClick={()=>handleMenuItemClick("Copy Case Data To Clipboard")}>
        {t("DG.Inspector.copyCaseDataToClipboard")}
      </MenuItem>
      <MenuItem onClick={()=>handleMenuItemClick("Get Case Data From Clipboard")}>
        {t("DG.Inspector.getCaseDataFromClipboard")}
      </MenuItem>
    </MenuList>
  )
}
