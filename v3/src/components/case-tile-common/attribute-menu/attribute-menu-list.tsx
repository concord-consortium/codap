import { MenuItem, MenuList, useDisclosure } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import React, { forwardRef } from "react"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { useDataSetMetadata } from "../../../hooks/use-data-set-metadata"
import { useMenuItemScrollIntoView } from "../../../hooks/use-menu-item-scroll-into-view"
import { logMessageWithReplacement, logStringifiedObjectMessage } from "../../../lib/log-message"
import {
  deleteCollectionNotification, dependentCasesNotification, hideAttributeNotification, removeAttributesNotification
} from "../../../models/data/data-set-notifications"
import { IAttributeChangeResult } from "../../../models/data/data-set-types"
import { sortItemsWithCustomUndoRedo } from "../../../models/data/data-set-undo"
import { uiState } from "../../../models/ui-state"
import {
  allowAttributeDeletion, preventCollectionReorg, preventTopLevelReorg
} from "../../../utilities/plugin-utils"
import { t } from "../../../utilities/translation/translate"
import { kCellPadding } from "../../case-table/case-table-types"
import { useCaseTableModel } from "../../case-table/use-case-table-model"
import { findLongestContentWidth } from "../attribute-format-utils"
import { IMenuItem } from "../std-menu-list"
import { EditAttributePropertiesModal } from "./edit-attribute-properties-modal"

interface IProps {
  attrIndex: number
  attributeId: string
  finalFocusRef?: React.RefObject<HTMLElement>
  onRenameAttribute: () => void
  onModalOpen: (open: boolean) => void
}

const AttributeMenuListComponent = forwardRef<HTMLDivElement, IProps>(
    ({ attrIndex, attributeId, finalFocusRef, onRenameAttribute, onModalOpen }, ref) => {
  const data = useDataSetContext()
  const metadata = useDataSetMetadata()
  const tableModel = useCaseTableModel()
  const { isOpen, onClose, onOpen } = useDisclosure()

  const handleMenuItemFocus = useMenuItemScrollIntoView()

  if (!attributeId) return null

  const attribute = data?.getAttribute(attributeId)
  const attributeName = attribute?.name
  const collection = data?.getCollectionForAttribute(attributeId)

  const handleEditPropertiesOpen = () => {
    onOpen()
    onModalOpen(true)
  }

  const handleEditPropertiesClose = () => {
    onClose()
    onModalOpen(false)
  }

  const handleEditFormulaOpen = () => {
    uiState.editFormulaFinalFocusElement = finalFocusRef?.current ?? null
    uiState.setEditFormulaAttributeId(attributeId)
  }

  const handleSortCases = (item: IMenuItem) => {
    const direction = item.itemKey.includes("Descending") ? "descending" : "ascending"
    data && sortItemsWithCustomUndoRedo(data, attributeId, direction)
  }

  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation()
  }

  const menuItems: IMenuItem[] = [
    {
      itemKey: "DG.TableController.headerMenuItems.renameAttribute",
      dataTestId: "attribute-menu-rename",
      isEnabled: () => !metadata?.isRenameProtected(attributeId),
      handleClick: onRenameAttribute
    },
    {
      itemKey: "DG.TableController.headerMenuItems.resizeColumn",
      dataTestId: "attribute-menu-resize",
      handleClick: () => {
        data?.applyModelChange(() => {
          if (attribute) {
            const longestContentWidth = findLongestContentWidth(attribute) + kCellPadding
            tableModel?.setColumnWidth(attributeId, longestContentWidth)
          }
        }, {
          undoStringKey: "DG.Undo.caseTable.resizeColumn",
          redoStringKey: "DG.Redo.caseTable.resizeColumn",
          log: logStringifiedObjectMessage("Fit column width: %@",
                   { collection: data?.name, attribute: attributeName })
        })
      }
    },
    {
      itemKey: "DG.TableController.headerMenuItems.editAttribute",
      dataTestId: "attribute-menu-edit",
      handleClick: handleEditPropertiesOpen
    },
    {
      itemKey: "DG.TableController.headerMenuItems.editFormula",
      dataTestId: "attribute-menu-edit-formula",
      handleClick: handleEditFormulaOpen
    },
    {
      itemKey: "DG.TableController.headerMenuItems.deleteFormula",
      dataTestId: "attribute-menu-delete-formula",
      isEnabled: () => !metadata?.isEditProtected(attributeId) && !!attribute?.hasFormula,
      handleClick: () => {
        data?.applyModelChange(() => {
          if (!metadata) {
            console.warn(`Metadata not found for data set: ${data?.id}`)
            return
          }
          metadata.deleteAttributeFormula(attributeId)
        }, {
          // TODO Should also broadcast notify component edit formula notification
          undoStringKey: "DG.Undo.caseTable.editAttributeFormula",
          redoStringKey: "DG.Undo.caseTable.editAttributeFormula",
          log: logMessageWithReplacement("Clear formula for attribute %@", { name: attribute?.name })
        })
      }
    },
    {
      itemKey: "DG.TableController.headerMenuItems.recoverFormula",
      dataTestId: "attribute-menu-recover-formula",
      isEnabled: () => !metadata?.isEditProtected(attributeId) &&
          !attribute?.hasFormula &&
          !!metadata?.getAttributeDeletedFormula(attributeId),
      handleClick: () => {
        data?.applyModelChange(() => {
          if (!metadata) {
            console.warn(`Metadata not found for data set: ${data?.id}`)
            return
          }
          metadata.recoverAttributeFormula(attributeId)
        }, {
          undoStringKey: "DG.Undo.caseTable.editAttributeFormula",
          redoStringKey: "DG.Undo.caseTable.editAttributeFormula",
          log: logMessageWithReplacement("Recover formula for attribute %@", { name: attribute?.name })
        })
      }
    },
    {
      itemKey: "DG.TableController.headerMenuItems.randomizeAttribute",
      dataTestId: "attribute-menu-randomize",
      isEnabled: () => !!attribute?.formula?.isRandomFunctionPresent,
      handleClick: () => {
        data?.applyModelChange(() => {
          attribute?.formula?.rerandomize()
        }, {
          noDirty: true,
          notify: dependentCasesNotification(data),
        })
      }
    },
    {
      itemKey: "DG.TableController.headerMenuItems.sortAscending",
      dataTestId: "attribute-menu-sort-asc",
      handleClick: handleSortCases
    },
    {
      itemKey: "DG.TableController.headerMenuItems.sortDescending",
      dataTestId: "attribute-menu-sort-desc",
      handleClick: handleSortCases
    },
    {
      itemKey: "DG.TableController.headerMenuItems.hideAttribute",
      dataTestId: "attribute-menu-hide",
      isEnabled: () => {
        // can't hide last attribute of collection
        const visibleAttributes = collection?.attributes
                                    .reduce((sum, attr) => {
                                      return attr && !metadata?.isHidden(attr.id) ? sum + 1 : sum
                                    }, 0) ?? 0
        return visibleAttributes > 1
      },
      handleClick: () => {
        metadata?.applyModelChange(
          () => metadata?.setIsHidden(attributeId, true),
          {
            notify: hideAttributeNotification([attributeId], data),
            undoStringKey: "DG.Undo.caseTable.hideAttribute",
            redoStringKey: "DG.Redo.caseTable.hideAttribute",
            log: logMessageWithReplacement("Hide attribute %@", { name: attribute?.name })
          }
        )
      }
    },
    {
      itemKey: "DG.TableController.headerMenuItems.deleteAttribute",
      dataTestId: "attribute-menu-delete",
      isEnabled: () => {
        if (metadata?.isDeleteProtected(attributeId) || !data) return false

        // If preventTopLevelReorg is true...
        if (preventTopLevelReorg(data)) {
          // Disabled if in the parent collection
          if (preventCollectionReorg(data, collection?.id)) return false

          // Disabled if there is only one attribute not in the parent collection
          if (data.attributes.length - data.collections[0].attributes.length <= 1) return false
        }

        return allowAttributeDeletion(data, attribute)
      },
      handleClick: () => {
        if (data && attribute) {
          let result: IAttributeChangeResult | undefined
          // instantiate values so they're captured by undo/redo patches
          attribute.prepareSnapshot()
          // delete the attribute
          data.applyModelChange(() => {
            result = data.removeAttribute(attributeId)
          }, {
            notify: () => {
              const notifications = [removeAttributesNotification([attributeId], data)]
              if (result?.removedCollectionId) notifications.unshift(deleteCollectionNotification(data))
              return notifications
            },
            undoStringKey: "DG.Undo.caseTable.deleteAttribute",
            redoStringKey: "DG.Redo.caseTable.deleteAttribute",
            log: logMessageWithReplacement("Delete attribute %@", { name: attribute.name }, "data")
          })
        }
      }
    }
  ]

  function isItemEnabled(item: IMenuItem) {
    if (!item.handleClick) return false
    if (!item.isEnabled) return true
    return item.isEnabled(item)
  }

  return (
    <>
      <MenuList ref={ref} data-testid={`attribute-header-menu-${attrIndex}`}
          onKeyDown={handleMenuKeyDown} onFocus={handleMenuItemFocus}>
        {menuItems.map(item => (
          <MenuItem key={item.itemKey} isDisabled={!isItemEnabled(item)} onClick={() => item.handleClick?.(item)}
              data-testid={item.dataTestId}>
            {`${t(item.itemKey)}${item.handleClick ? "" : " 🚧"}`}
          </MenuItem>
        ))}
      </MenuList>
      <EditAttributePropertiesModal attributeId={attributeId} finalFocusRef={finalFocusRef}
        isOpen={isOpen} onClose={handleEditPropertiesClose} />
    </>
  )
})

AttributeMenuListComponent.displayName = "AttributeMenuList"

export const AttributeMenuList = observer(AttributeMenuListComponent)
