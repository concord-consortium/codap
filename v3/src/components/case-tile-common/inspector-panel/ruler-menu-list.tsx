import { observer } from "mobx-react-lite"
import React from "react"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { logStringifiedObjectMessage } from "../../../lib/log-message"
import { IAttribute } from "../../../models/data/attribute"
import { createAttributesNotification } from "../../../models/data/data-set-notifications"
import { uiState } from "../../../models/ui-state"
import { uniqueName } from "../../../utilities/js-utils"
import { preventCollectionReorg } from "../../../utilities/plugin-utils"
import { t } from "../../../utilities/translation/translate"
import { IMenuItem, StdMenuList } from "../std-menu-list"
import { addParsedCsvToDataSet, convertDatasetToCsv, importCsvContent } from "../../../utilities/csv-import"

export const RulerMenuList = observer(function RulerMenuList() {
  const data = useDataSetContext()

  const handleAddNewAttribute = (collectionId: string) => {
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

  const addAttributeMenuItems: IMenuItem[] =
    data?.collections.map(collection => ({
        itemKey: collection.id,
        dataTestId: "ruler-menu-new-attribute",
        itemLabel: () => t("DG.Inspector.newAttribute", { vars: [collection.title] }),
        isEnabled: () => !preventCollectionReorg(data, collection.id),
        handleClick: () => handleAddNewAttribute(collection.id)
      }
    )) ?? []

  const menuItems: IMenuItem[] = [
    ...addAttributeMenuItems,
    {
      itemKey: "DG.Inspector.randomizeAllAttributes",
      isEnabled: () => !!data?.attributes.some(attr => attr.formula?.isRandomFunctionPresent),
      handleClick: () => {
        data?.applyModelChange(() => {
          data.attributes.forEach(attr => {
            if (attr.formula?.isRandomFunctionPresent) {
              attr.formula.rerandomize()
            }
          })
        })
      }
    },
    {
      itemKey: "DG.Inspector.exportCaseData"
    },
    {
      itemKey: "DG.Inspector.copyCaseDataToClipboard",
      handleClick: () => {
        if (data) navigator.clipboard.writeText(convertDatasetToCsv(data))
        // TODO: Display a popup saying how many cases were copied
      }
    },
    {
      itemKey: "DG.Inspector.getCaseDataFromClipboard",
      handleClick: () => {
        if (data) {
          navigator.clipboard.readText().then(text => {
            importCsvContent(text, csvData => addParsedCsvToDataSet(csvData, data))
          })
        }
      }
    }
  ]

  return (
    <StdMenuList data-testid="ruler-menu-list" menuItems={menuItems} />
  )
})
