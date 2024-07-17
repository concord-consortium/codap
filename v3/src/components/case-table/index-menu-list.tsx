import { MenuItem, MenuList, useDisclosure, useToast } from "@chakra-ui/react"
import React from "react"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { removeCasesWithCustomUndoRedo } from "../../models/data/data-set-undo"
import { t } from "../../utilities/translation/translate"
import { InsertCasesModal } from "./insert-cases-modal"

interface IProps {
  caseId: string
  index?: number
}

export const IndexMenuList = ({caseId, index}: IProps) => {
  const toast = useToast()
  const data = useDataSetContext()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const deleteCasesItemText = data?.selection.size === 1
                                ? t("DG.CaseTable.indexMenu.deleteCase")
                                : t("DG.CaseTable.indexMenu.deleteCases")

  const handleInsertCase = () => {
    data?.addCases([{}], {before: caseId})
  }

  const handleInsertCases = () => {
    onOpen()
  }

  const handleMenuItemClick = (menuItem: string) => {
    toast({
      title: 'Menu item clicked',
      description: `You clicked on ${menuItem} on index=${index} id=${caseId}`,
      status: 'success',
      duration: 9000,
      isClosable: true,
    })
  }

  const handleDeleteCases = () => {
    if (data?.selection.size) {
      removeCasesWithCustomUndoRedo(data, Array.from(data.selection))
    }
  }

  return (
    <>
      <MenuList data-testid="index-menu-list" >
        <MenuItem onClick={()=>handleMenuItemClick("Move Data Entry Row")}>
          {t("DG.CaseTable.indexMenu.moveEntryRow")}
        </MenuItem>
        <MenuItem onClick={handleInsertCase}>{t("DG.CaseTable.indexMenu.insertCase")}</MenuItem>
        <MenuItem onClick={handleInsertCases}>{t("DG.CaseTable.indexMenu.insertCases")}</MenuItem>
        <MenuItem onClick={handleDeleteCases}>{deleteCasesItemText}</MenuItem>
      </MenuList>
      <InsertCasesModal caseId={caseId} isOpen={isOpen} onClose={onClose}/>
    </>
  )
}
