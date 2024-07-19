import React, { forwardRef } from "react"
import { observer } from "mobx-react-lite"
import { MenuItem, MenuList, useDisclosure, useToast } from "@chakra-ui/react"
import { useCaseMetadata } from "../../../hooks/use-case-metadata"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import {
  deleteCollectionNotification, hideAttributeNotification, removeAttributesNotification
} from "../../../models/data/data-set-notifications"
import { IAttributeChangeResult } from "../../../models/data/data-set-types"
import { t } from "../../../utilities/translation/translate"
import {
  getAllowEmptyAttributeDeletion, getPreventAttributeDeletion, getPreventReorg
} from "../../web-view/collaborator-utils"
import { TCalculatedColumn } from "../case-table-types"
import { EditAttributePropertiesModal } from "./edit-attribute-properties-modal"
import { EditFormulaModal } from "./edit-formula-modal"

interface IProps {
  column: TCalculatedColumn
  onRenameAttribute: () => void
  onModalOpen: (open: boolean) => void
}

const AttributeMenuListComp = forwardRef<HTMLDivElement, IProps>(
    ({ column, onRenameAttribute, onModalOpen }, ref) => {
  const toast = useToast()
  const data = useDataSetContext()
  const caseMetadata = useCaseMetadata()
  // each use of useDisclosure() maintains its own state and callbacks so they can be used for independent dialogs
  const attributePropsModal = useDisclosure()
  const formulaModal = useDisclosure()
  const columnName = column.name as string
  const columnId = column.key
  const attribute = data?.attrFromID(columnId)
  const rerandomizeDisabled = !attribute?.formula?.isRandomFunctionPresent

  const handleMenuItemClick = (menuItem: string) => {
    // TODO Don't forget to broadcast notifications as these menu items are implemented!
    toast({
      title: 'Menu item clicked',
      description: `You clicked on ${menuItem} on ${columnName}`,
      status: 'success',
      duration: 5000,
      isClosable: true,
    })
  }

  // can't hide last attribute of collection
  const collection = data?.getCollectionForAttribute(columnId)
  const visibleAttributes = collection?.attributes
                              .reduce((sum, attr) => attr && !caseMetadata?.isHidden(attr.id) ? sum + 1 : sum, 0) ?? 0
  const disableHideAttribute = visibleAttributes <= 1

  const handleHideAttribute = () => {
    caseMetadata?.applyModelChange(
      () => caseMetadata?.setIsHidden(column.key, true),
      {
        notifications: hideAttributeNotification([column.key], data),
        undoStringKey: "DG.Undo.caseTable.hideAttribute",
        redoStringKey: "DG.Redo.caseTable.hideAttribute"
      }
    )
  }

  const handleDeleteAttribute = () => {
    const attrId = column.key
    const attributeToDelete = data?.attrFromID(attrId)
    if (data && attributeToDelete) {
      let result: IAttributeChangeResult | undefined
      // instantiate values so they're captured by undo/redo patches
      attributeToDelete.prepareSnapshot()
      // delete the attribute
      data.applyModelChange(() => {
        result = data.removeAttribute(attrId)
      }, {
        notifications: () => {
          const notifications = [removeAttributesNotification([attrId], data)]
          if (result?.removedCollectionId) notifications.unshift(deleteCollectionNotification(data))
          return notifications
        },
        undoStringKey: "DG.Undo.caseTable.deleteAttribute",
        redoStringKey: "DG.Redo.caseTable.deleteAttribute"
      })
      attributeToDelete.completeSnapshot()
    }
  }

  const isDeleteAttributeDisabled = () => {
    // Anything goes when there is no dataset (this should probably never happen)
    if (!data) return false

    // Disabled if in the parent collection and preventTopLevelReorg is true
    if (getPreventReorg(data, collection?.id)) return true

    // Not disabled if the attribute is empty and allowEmptyAttributeDeletion is true
    const attributeIsEmpty = attribute?.values?.some(value => !!value)
    if (getAllowEmptyAttributeDeletion(data) && attributeIsEmpty) return false

    // Disabled if preventAttributeDeletion is true
    if (getPreventAttributeDeletion(data)) return true

    return false
  }
  const disableDeleteAttribute = isDeleteAttributeDisabled()

  const handleEditAttributePropsOpen = () => {
    attributePropsModal.onOpen()
    onModalOpen(true)
  }

  const handleEditAttributePropsClose = () => {
    attributePropsModal.onClose()
    onModalOpen(false)
  }

  const handleEditFormulaOpen = () => {
    formulaModal.onOpen()
    onModalOpen(true)
  }

  const handleEditFormulaClose = () => {
    formulaModal.onClose()
    onModalOpen(false)
  }

  const handleRerandomize = () => {
    attribute?.formula?.rerandomize()
  }

  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation()
  }

  return (
    <>
      <MenuList ref={ref} data-testid="attribute-menu-list" onKeyDown={handleMenuKeyDown}>
        <MenuItem onClick={onRenameAttribute}>
          {t("DG.TableController.headerMenuItems.renameAttribute")}
        </MenuItem>
        <MenuItem onClick={() => handleMenuItemClick("Fit width")}>
          {t("DG.TableController.headerMenuItems.resizeColumn")}
        </MenuItem>
        <MenuItem onClick={handleEditAttributePropsOpen}>
          {t("DG.TableController.headerMenuItems.editAttribute")}
        </MenuItem>
        <MenuItem onClick={handleEditFormulaOpen}>
          {t("DG.TableController.headerMenuItems.editFormula")}
        </MenuItem>
        <MenuItem onClick={() => handleMenuItemClick("Delete Formula")}>
          {t("DG.TableController.headerMenuItems.deleteFormula")}
        </MenuItem>
        <MenuItem onClick={() => handleMenuItemClick("Recover Formula")}>
          {t("DG.TableController.headerMenuItems.recoverFormula")}
        </MenuItem>
        <MenuItem onClick={handleRerandomize} isDisabled={rerandomizeDisabled}>
          {t("DG.TableController.headerMenuItems.randomizeAttribute")}
        </MenuItem>
        <MenuItem onClick={() => handleMenuItemClick("Sort Ascending")}>
          {t("DG.TableController.headerMenuItems.sortAscending")}
        </MenuItem>
        <MenuItem onClick={() => handleMenuItemClick("Sort Descending")}>
          {t("DG.TableController.headerMenuItems.sortDescending")}
        </MenuItem>
        <MenuItem onClick={handleHideAttribute} isDisabled={disableHideAttribute}>
          {t("DG.TableController.headerMenuItems.hideAttribute")}
        </MenuItem>
        <MenuItem onClick={() => handleDeleteAttribute()} isDisabled={disableDeleteAttribute}>
          {t("DG.TableController.headerMenuItems.deleteAttribute")}
        </MenuItem>
      </MenuList>
      <EditAttributePropertiesModal attributeId={columnId} isOpen={attributePropsModal.isOpen}
        onClose={handleEditAttributePropsClose} />
      <EditFormulaModal attributeId={columnId} isOpen={formulaModal.isOpen} onClose={handleEditFormulaClose} />
    </>
  )
})

AttributeMenuListComp.displayName = "AttributeMenuList"

export const AttributeMenuList = observer(AttributeMenuListComp)
