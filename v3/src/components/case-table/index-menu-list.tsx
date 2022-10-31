import { MenuItem, MenuList, useDisclosure, useToast } from "@chakra-ui/react"
import React, { useState } from "react"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { CodapModal } from "../codap-modal"
import { InsertCasesModalContent } from "./insert-cases-modal"
import t from "../../utilities/translation/translate"

interface IProps {
  caseId: string
  index?: number
}

export const IndexMenuList = ({caseId, index}: IProps) => {
  const toast = useToast()
  const data = useDataSetContext()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [numCasesToInsert, setNumCasesToInsert] = useState(1)
  const [insertPosition, setInsertPosition] = useState("after")
  const deleteCasesItemText = data?.selection.size === 1
                                ? t("DG.CaseTable.indexMenu.deleteCase")
                                : t("DG.CaseTable.indexMenu.deleteCases")
  const handleInsertPositionChange = (value: any) => {
    setInsertPosition(value)
  }

  const handleNumCasesToInsertChange = (value: string) => {
    setNumCasesToInsert(parseInt(value, 10))
  }

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
    data?.removeCases(Array.from(data.selection))
  }

  const insertCases = () => {
    onClose()
    const casesToAdd = []
    if (numCasesToInsert) {
      for (let i=0; i < numCasesToInsert; i++) {
        casesToAdd.push({})
      }
    }
    data?.addCases(casesToAdd, {[insertPosition]: caseId})
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
      <CodapModal
          isOpen={isOpen}
          onClose={onClose}
          title={t("DG.CaseTable.insertCasesDialog.title")}
          hasCloseButton={true}
          Content={InsertCasesModalContent}
          contentProps={{ numCasesToInsert,
                          insertPosition,
                          modalWidth: "280px",
                          onChangeNumCasesToInsert: handleNumCasesToInsertChange,
                          onChangeInsertPosition: handleInsertPositionChange
                        }}
          buttons={[{ label: t("DG.AttrFormView.cancelBtnTitle"),
                      tooltip: t("DG.AttrFormView.cancelBtnTooltip"),
                      onClick: onClose },
                    { label: t("DG.CaseTable.insertCasesDialog.applyBtnTitle"),
                      tooltip: t("DG.CaseTable.insertCasesDialog.applyBtnTooltip"),
                      onClick: insertCases }
                  ]}
      />
    </>
  )
}
