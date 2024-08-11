import { MenuItem, MenuList, useDisclosure } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import React, { forwardRef } from "react"
import { useCaseMetadata } from "../../../hooks/use-case-metadata"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import {
  deleteCollectionNotification, hideAttributeNotification, removeAttributesNotification
} from "../../../models/data/data-set-notifications"
import { IAttributeChangeResult } from "../../../models/data/data-set-types"
import {
  allowAttributeDeletion, preventCollectionReorg, preventTopLevelReorg
} from "../../../utilities/plugin-utils"
import { t } from "../../../utilities/translation/translate"
import { TColumn } from "../case-table-types"
import { EditAttributePropertiesModal } from "./edit-attribute-properties-modal"
import { EditFormulaModal } from "./edit-formula-modal"

interface IProps {
  column: TColumn
  onRenameAttribute: () => void
  onModalOpen: (open: boolean) => void
}

const AttributeMenuListComp = forwardRef<HTMLDivElement, IProps>(
    ({ column, onRenameAttribute, onModalOpen }, ref) => {
  const data = useDataSetContext()
  const caseMetadata = useCaseMetadata()
  // each use of useDisclosure() maintains its own state and callbacks so they can be used for independent dialogs
  const propertiesModal = useDisclosure()
  const formulaModal = useDisclosure()
  const attributeId = column.key
  const attribute = data?.getAttribute(attributeId)
  const collection = data?.getCollectionForAttribute(attributeId)

  const handleEditPropertiesOpen = () => {
    propertiesModal.onOpen()
    onModalOpen(true)
  }

  const handleEditPropertiesClose = () => {
    propertiesModal.onClose()
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

  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation()
  }

  interface IMenuItem {
    itemString: string
    // defaults to true if not implemented
    isEnabled?: () => boolean
    handleClick?: () => void
  }

  const menuItems: IMenuItem[] = [
    {
      itemString: t("DG.TableController.headerMenuItems.renameAttribute"),
      handleClick: onRenameAttribute
    },
    {
      itemString: t("DG.TableController.headerMenuItems.resizeColumn")
    },
    {
      itemString: t("DG.TableController.headerMenuItems.editAttribute"),
      handleClick: handleEditPropertiesOpen
    },
    {
      itemString: t("DG.TableController.headerMenuItems.editFormula"),
      handleClick: handleEditFormulaOpen
    },
    {
      itemString: t("DG.TableController.headerMenuItems.deleteFormula"),
      isEnabled: () => !!(attribute?.editable && attribute?.hasFormula),
      handleClick: () => {
        data?.applyModelChange(() => {
          attribute?.clearFormula()
        }, {
          // TODO Should also broadcast notify component edit formula notification
          undoStringKey: "DG.Undo.caseTable.editAttributeFormula",
          redoStringKey: "DG.Undo.caseTable.editAttributeFormula"
        })
      }
    },
    {
      itemString: t("DG.TableController.headerMenuItems.recoverFormula")
    },
    {
      itemString: t("DG.TableController.headerMenuItems.randomizeAttribute"),
      isEnabled: () => !!attribute?.formula?.isRandomFunctionPresent,
      handleClick: () => {
        data?.applyModelChange(() => {
          attribute?.formula?.rerandomize()
        })
      }
    },
    {
      itemString: t("DG.TableController.headerMenuItems.sortAscending")
    },
    {
      itemString: t("DG.TableController.headerMenuItems.sortDescending")
    },
    {
      itemString: t("DG.TableController.headerMenuItems.hideAttribute"),
      isEnabled: () => {
        // can't hide last attribute of collection
        const visibleAttributes = collection?.attributes
                                    .reduce((sum, attr) => {
                                      return attr && !caseMetadata?.isHidden(attr.id) ? sum + 1 : sum
                                    }, 0) ?? 0
        return visibleAttributes > 1
      },
      handleClick: () => {
        caseMetadata?.applyModelChange(
          () => caseMetadata?.setIsHidden(attributeId, true),
          {
            notify: hideAttributeNotification([attributeId], data),
            undoStringKey: "DG.Undo.caseTable.hideAttribute",
            redoStringKey: "DG.Redo.caseTable.hideAttribute"
          }
        )
      }
    },
    {
      itemString: t("DG.TableController.headerMenuItems.deleteAttribute"),
      isEnabled: () => {
        if (!data) return false

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
            redoStringKey: "DG.Redo.caseTable.deleteAttribute"
          })
          attribute.completeSnapshot()
        }
      }
    }
  ]

  function isItemEnabled(item: IMenuItem) {
    if (!item.handleClick) return false
    if (!item.isEnabled) return true
    return item.isEnabled()
  }

  return (
    <>
      <MenuList ref={ref} data-testid="attribute-menu-list" onKeyDown={handleMenuKeyDown}>
        {menuItems.map(item => (
          <MenuItem key={item.itemString} isDisabled={!isItemEnabled(item)} onClick={item.handleClick}>
            {`${item.itemString}${item.handleClick ? "" : " 🚧"}`}
          </MenuItem>
        ))}
      </MenuList>
      <EditAttributePropertiesModal attributeId={attributeId} isOpen={propertiesModal.isOpen}
        onClose={handleEditPropertiesClose} />
      <EditFormulaModal attributeId={attributeId} isOpen={formulaModal.isOpen} onClose={handleEditFormulaClose} />
    </>
  )
})

AttributeMenuListComp.displayName = "AttributeMenuList"

export const AttributeMenuList = observer(AttributeMenuListComp)
