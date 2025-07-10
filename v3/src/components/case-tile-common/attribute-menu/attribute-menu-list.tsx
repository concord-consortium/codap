import { MenuItem, MenuList, useDisclosure } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import React, { forwardRef } from "react"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { useDataSetMetadata } from "../../../hooks/use-data-set-metadata"
import { logMessageWithReplacement, logStringifiedObjectMessage } from "../../../lib/log-message"
import {
  deleteCollectionNotification, hideAttributeNotification, removeAttributesNotification
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
import { EditAttributePropertiesModal } from "./edit-attribute-properties-modal"

interface IProps {
  attributeId: string
  onRenameAttribute: () => void
  onModalOpen: (open: boolean) => void
}

const AttributeMenuListComponent = forwardRef<HTMLDivElement, IProps>(
    ({ attributeId, onRenameAttribute, onModalOpen }, ref) => {
  const data = useDataSetContext()
  const metadata = useDataSetMetadata()
  const tableModel = useCaseTableModel()
  const { isOpen, onClose, onOpen } = useDisclosure()

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
    uiState.setEditFormulaAttributeId(attributeId)
  }

  const handleSortCases = (item: IMenuItem) => {
    const direction = item.itemKey.includes("Descending") ? "descending" : "ascending"
    data && sortItemsWithCustomUndoRedo(data, attributeId, direction)
  }

  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation()
  }

  interface IMenuItem {
    itemKey: string
    // defaults to true if not implemented
    isEnabled?: (item: IMenuItem) => boolean
    handleClick?: (item: IMenuItem) => void
  }

  const menuItems: IMenuItem[] = [
    {
      itemKey: "DG.TableController.headerMenuItems.renameAttribute",
      isEnabled: () => !metadata?.isRenameProtected(attributeId),
      handleClick: onRenameAttribute
    },
    {
      itemKey: "DG.TableController.headerMenuItems.resizeColumn",
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
      handleClick: handleEditPropertiesOpen
    },
    {
      itemKey: "DG.TableController.headerMenuItems.editFormula",
      handleClick: handleEditFormulaOpen
    },
    {
      itemKey: "DG.TableController.headerMenuItems.deleteFormula",
      isEnabled: () => !metadata?.isEditProtected(attributeId) && !!attribute?.hasFormula,
      handleClick: () => {
        data?.applyModelChange(() => {
          attribute?.clearFormula()
        }, {
          // TODO Should also broadcast notify component edit formula notification
          undoStringKey: "DG.Undo.caseTable.editAttributeFormula",
          redoStringKey: "DG.Undo.caseTable.editAttributeFormula",
          log: logMessageWithReplacement("Clear formula for attribute %@", { name: attribute?.name })
        })
      }
    },
    {
      itemKey: "DG.TableController.headerMenuItems.recoverFormula"
    },
    {
      itemKey: "DG.TableController.headerMenuItems.randomizeAttribute",
      isEnabled: () => !!attribute?.formula?.isRandomFunctionPresent,
      handleClick: () => {
        data?.applyModelChange(() => {
          attribute?.formula?.rerandomize()
          data.validateCases({ force: true })
        })
      }
    },
    {
      itemKey: "DG.TableController.headerMenuItems.sortAscending",
      handleClick: handleSortCases
    },
    {
      itemKey: "DG.TableController.headerMenuItems.sortDescending",
      handleClick: handleSortCases
    },
    {
      itemKey: "DG.TableController.headerMenuItems.hideAttribute",
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
      <MenuList ref={ref} data-testid="attribute-menu-list" onKeyDown={handleMenuKeyDown}>
        {menuItems.map(item => (
          <MenuItem key={item.itemKey} isDisabled={!isItemEnabled(item)} onClick={() => item.handleClick?.(item)}>
            {`${t(item.itemKey)}${item.handleClick ? "" : " 🚧"}`}
          </MenuItem>
        ))}
      </MenuList>
      <EditAttributePropertiesModal attributeId={attributeId} isOpen={isOpen}
        onClose={handleEditPropertiesClose} />
    </>
  )
})

AttributeMenuListComponent.displayName = "AttributeMenuList"

export const AttributeMenuList = observer(AttributeMenuListComponent)
