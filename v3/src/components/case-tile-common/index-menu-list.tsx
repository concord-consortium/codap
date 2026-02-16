import { MenuItem, MenuList, useDisclosure } from "@chakra-ui/react"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { insertCasesWithCustomUndoRedo, removeCasesWithCustomUndoRedo } from "../../models/data/data-set-undo"
import { t } from "../../utilities/translation/translate"
import { IInsertSpec, InsertCasesModal } from "./insert-cases-modal"
import { isItemEditable } from "../../utilities/plugin-utils"
import { ICaseCreation } from "../../models/data/data-set-types"
import { kInputRowKey } from "../case-table/case-table-types"
import { useCollectionTableModel } from "../case-table/use-collection-table-model"

interface IProps {
  caseId: string
  index?: number
}

export const IndexMenuList = ({caseId, index}: IProps) => {
  const data = useDataSetContext()
  const { isOpen, onOpen: onOpenInsertCasesModal, onClose: onCloseInsertCasesModal } = useDisclosure()
  const deletableSelectedItems = data?.selection
    ? Array.from(data.selection).filter(itemId => isItemEditable(data, itemId))
    : []
  const disableEdits = deletableSelectedItems.length < 1

  const collectionId = useCollectionContext()
  const collection = data?.getCollection(collectionId)
  const tableIndex = collection?.caseIdToIndexMap.get(caseId) ?? -1
  const collectionTable = useCollectionTableModel()

  // When the menu is opened on the input row, resolve a real case ID for insert operations.
  // The input row's __id__ is "__input__" which isn't a real case, so we map it to the case
  // at the input row's current position so that inserts get the correct position and parent values.
  const isInputRow = caseId === kInputRowKey
  const inputRowIndex = collectionTable?.inputRowIndex ?? -1
  const insertReferenceCaseId = isInputRow && inputRowIndex >= 0
    ? collection?.caseIds[inputRowIndex]
    : undefined

  function insertCasesAtInputRow(cases: ICaseCreation[], position: "before" | "after" = "before") {
    if (!data || !insertReferenceCaseId) return
    insertCasesWithCustomUndoRedo(data, cases, { before: insertReferenceCaseId })
    // "before" the input row: bump inputRowIndex so the input row moves below the new cases.
    // "after" the input row: keep inputRowIndex as-is so the input row stays above the new cases.
    if (collectionTable && inputRowIndex >= 0 && position === "before") {
      collectionTable.setInputRowIndex(inputRowIndex + cases.length)
    }
  }

  function handleCloseInsertCasesModel(insertSpec?: IInsertSpec) {
    const { count, position } = insertSpec || {}
    if (data && count && position) {
      const casesToInsert: ICaseCreation[] = Array<ICaseCreation>(count).fill({})
      if (isInputRow) {
        insertCasesAtInputRow(casesToInsert, position)
      } else {
        insertCasesWithCustomUndoRedo(data, casesToInsert, { [position]: caseId })
      }
    }
    onCloseInsertCasesModal()
  }

  interface IMenuItem {
    itemKey: string
    // defaults to true if not implemented
    isEnabled?: (item: IMenuItem) => boolean
    handleClick?: (item: IMenuItem) => void
  }

  const menuItems: IMenuItem[] = [
    {
      itemKey: "DG.CaseTable.indexMenu.moveEntryRow",
      isEnabled: () => tableIndex !== -1,
      handleClick: () => collectionTable?.setInputRowIndex(tableIndex)
    },
    {
      itemKey: "DG.CaseTable.indexMenu.insertCase",
      isEnabled: () => !disableEdits,
      handleClick: () => {
        if (isInputRow) {
          insertCasesAtInputRow([{}])
        } else if (data) {
          insertCasesWithCustomUndoRedo(data, [{}], { before: caseId })
        }
      }
    },
    {
      itemKey: "DG.CaseTable.indexMenu.insertCases",
      isEnabled: () => !disableEdits,
      handleClick: () => onOpenInsertCasesModal()
    },
    {
      itemKey: `DG.CaseTable.indexMenu.delete${deletableSelectedItems.length === 1 ? "Case" : "Cases" }`,
      isEnabled: () => deletableSelectedItems.length >= 1,
      handleClick: () => {
        if (deletableSelectedItems && data) {
          removeCasesWithCustomUndoRedo(data, deletableSelectedItems)
        }
      }
    }
  ]

  return (
    <>
      <MenuList data-testid="index-menu-list">
        {
          menuItems.map(item => {
            const isDisabled = !item.handleClick || item.isEnabled?.(item) === false
            return (
              <MenuItem key={item.itemKey} isDisabled={isDisabled} onClick={() => item.handleClick?.(item)}>
                {`${t(item.itemKey)}${item.handleClick ? "" : " 🚧"}`}
              </MenuItem>
            )
          })
        }
      </MenuList>
      <InsertCasesModal caseId={caseId} isOpen={isOpen} onClose={handleCloseInsertCasesModel}/>
    </>
  )
}
