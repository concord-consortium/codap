import { useDisclosure } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import { useState } from "react"
import { useCfmContext } from "../../../hooks/use-cfm-context"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { logStringifiedObjectMessage } from "../../../lib/log-message"
import { IAttribute } from "../../../models/data/attribute"
import { ICollectionModel } from "../../../models/data/collection"
import { IDataSet } from "../../../models/data/data-set"
import { createAttributesNotification } from "../../../models/data/data-set-notifications"
import { uiState } from "../../../models/ui-state"
import { convertDatasetToCsv } from "../../../utilities/csv-export"
import { initiateImportFromClipboard } from "../../../utilities/csv-import"
import { uniqueName } from "../../../utilities/js-utils"
import { preventCollectionReorg } from "../../../utilities/plugin-utils"
import { t } from "../../../utilities/translation/translate"
import { rerandomizeAllAttributes } from "../../../models/data/data-set-utils"
import { CopiedCasesAlert } from "../copied-cases-alert"
import { ExportDataModal } from "../export-data-modal"
import { IMenuItem, StdMenuList } from "../std-menu-list"

export const RulerMenuList = observer(function RulerMenuList() {
  const data = useDataSetContext()
  const cfm = useCfmContext()
  const [copiedCasesString, setCopiedCasesString] = useState("")
  const { isOpen: isExportModalOpen, onClose: onCloseExportModal, onOpen: onOpenExportModal } = useDisclosure()
  const { isOpen: isCopyModalOpen, onClose: onCloseCopyModal, onOpen: onOpenCopyModal } = useDisclosure()
  const { isOpen: isCopiedAlertOpen, onClose: onCloseCopiedAlert, onOpen: onOpenCopiedAlert } = useDisclosure()

  const handleAddNewAttribute = (collectionId: string) => {
    let attribute: IAttribute | undefined
    data?.applyModelChange(() => {
      const newAttrName = uniqueName("newAttr",
        (aName: string) => !data.attributes.find(attr => aName === attr.name)
      )
      attribute = data.addAttribute({ name: newAttrName }, { collection: collectionId })
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

  const addAttributeMenuItems: IMenuItem[] =
    data?.collections.map(collection => ({
        itemKey: collection.id,
        dataTestId: "ruler-menu-new-attribute",
        itemLabel: () => t("DG.Inspector.newAttribute", { vars: [collection.title] }),
        isEnabled: () => !preventCollectionReorg(data, collection.id),
        handleClick: () => handleAddNewAttribute(collection.id)
      }
    )) ?? []

  const exportData = (dataSet: IDataSet, selectedCollection?: ICollectionModel) => {
    const csvContent = convertDatasetToCsv(dataSet, selectedCollection)
    cfm?.client.saveSecondaryFileAsDialog(csvContent, "csv", "text/csv", () => null)
  }

  const copyDataToClipboard = (dataSet: IDataSet, selectedCollection?: ICollectionModel) => {
    navigator.clipboard.writeText(convertDatasetToCsv(dataSet, selectedCollection))
    const collection = selectedCollection ?? dataSet.childCollection
    setCopiedCasesString(`${collection.caseIds.length} ${collection.title}`)
    onOpenCopiedAlert()
  }

  const menuItems: IMenuItem[] = [
    ...addAttributeMenuItems,
    {
      itemKey: "DG.Inspector.randomizeAllAttributes",
      isEnabled: () => !!data?.attributes.some(attr => attr.formula?.isRandomFunctionPresent),
      handleClick: () => rerandomizeAllAttributes(data)
    },
    {
      itemKey: "DG.Inspector.exportCaseData",
      handleClick: () => {
        if (data) {
          if (data.collections.length > 1) {
            onOpenExportModal()
          } else {
            exportData(data)
          }
        }
      }
    },
    {
      itemKey: "DG.Inspector.copyCaseDataToClipboard",
      handleClick: () => {
        if (data) {
          if (data.collections.length > 1) {
            onOpenCopyModal()
          } else {
            copyDataToClipboard(data)
          }
        }
      }
    },
    {
      itemKey: "DG.Inspector.getCaseDataFromClipboard",
      handleClick: () => {
        if (data) initiateImportFromClipboard(data)
      }
    }
  ]

  return (
    <>
      <StdMenuList data-testid="ruler-menu-list" menuItems={menuItems} />
      <ExportDataModal
        isOpen={isExportModalOpen}
        prompt={t("DG.AppController.exportCaseData.prompt")}
        okLabel={t("DG.AppController.exportDocument.exportTitle")}
        okTooltip={t("DG.AppController.exportDocument.exportTooltip")}
        onClose={onCloseExportModal}
        onComplete={exportData}
      />
      <ExportDataModal
        isOpen={isCopyModalOpen}
        prompt={t("DG.Inspector.caseTable.exportCaseDialog.copyFrom")}
        okLabel={t("DG.Inspector.caseTable.exportCaseDialog.copy")}
        okTooltip={t("DG.Inspector.caseTable.exportCaseDialog.copyTooltip")}
        onClose={onCloseCopyModal}
        onComplete={copyDataToClipboard}
      />
      <CopiedCasesAlert
        copiedCasesString={copiedCasesString}
        isOpen={isCopiedAlertOpen}
        onClose={onCloseCopiedAlert}
      />
    </>
  )
})
