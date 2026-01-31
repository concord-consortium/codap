import { observer } from "mobx-react-lite"
import { DataSetContext } from "../../hooks/use-data-set-context"
import { logStringifiedObjectMessage } from "../../lib/log-message"
import { appState } from "../../models/app-state"
import { updateAttributesNotification, updateCasesNotification } from "../../models/data/data-set-notifications"
import { getSharedDataSets } from "../../models/shared/shared-data-utils"
import { uiState } from "../../models/ui-state"
import { t } from "../../utilities/translation/translate"
import { EditFormulaModal } from "./edit-formula-modal"

export const EditAttributeFormulaModal = observer(function EditAttributeFormulaModal() {
  const attributeId = uiState.editFormulaAttributeId
  const dataSet = getSharedDataSets(appState.document).find(ds => ds.dataSet.attrFromID(attributeId))?.dataSet
  const attribute = dataSet?.attrFromID(attributeId)
  const value = attribute?.formula?.display

  const applyFormula = (formula: string, attrName?: string) => {
    if (attribute) {
      dataSet?.applyModelChange(() => {
        attribute.setDisplayExpression(formula)
        if (attrName && attrName !== attribute.name) {
          dataSet.setAttributeName(attributeId, attrName)
        }
      }, {
        // TODO Should also broadcast notify component edit formula notification
        notify: [
          updateCasesNotification(dataSet),
          updateAttributesNotification([attribute], dataSet)
        ],
        undoStringKey: "DG.Undo.caseTable.editAttributeFormula",
        redoStringKey: "DG.Redo.caseTable.editAttributeFormula",
        log: logStringifiedObjectMessage("Edit attribute formula: %@",
              {name: attribute.name, collection: dataSet?.getCollectionForAttribute(attributeId)?.name, formula},
              "data")
      })
    }
  }

  return (
    <DataSetContext.Provider value={dataSet}>
      <EditFormulaModal
        applyFormula={applyFormula}
        formulaPrompt={t("DG.AttrFormView.formulaPrompt")}
        isOpen={!!uiState.editFormulaAttributeId}
        onClose={() => uiState.setEditFormulaAttributeId()}
        titleInput={attribute?.name}
        titleLabel={t("DG.AttrFormView.attrNamePrompt")}
        titlePlaceholder={t("V3.AttrFormView.attrPlaceholder")}
        value={value}
      />
    </DataSetContext.Provider>
  )
})
