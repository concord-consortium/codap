import { updateCollectionNotification } from "../../models/data/data-set-notifications"
import { DG } from "../../v2/dg-compat.v2"
import { v2t } from "../../v2/sc-compat"

DG.CaseDisplayUtils = {

  /**
   *
   * @param iAttribute {DG.Attribute} attribute for tooltip
   */
  getTooltipForAttribute (iAttribute) {
    var name = iAttribute.get('name'),
        unit = iAttribute.get('unit'),
        description = iAttribute.get('description'),
        formula = iAttribute.get('formula')
    if (!description && !formula)
      { return unit ? v2t('DG.CaseCard.attrHintUnitsOnly').loc(name, unit)
                  : v2t('DG.CaseCard.attrHintPlain').loc(name) }
    if (!formula)
      { return v2t('DG.CaseCard.attrHintDescription').loc(name, description) }
    if (!description)
      { return v2t('DG.CaseCard.attrHintFormula').loc(name, formula) }
    return v2t('DG.CaseCard.attrHintDescriptionAndFormula').loc(name, description, formula)
  },

  setCollectionNameWithCommand (iDataContext, iOldName, iNewName) {
    var collectionClient = iDataContext.getCollectionByName(iOldName),
        dgCollection = collectionClient?.get("collection"),
        dsCollection = dgCollection?.get("collection")

    if (dsCollection && iNewName !== iOldName) {
      iDataContext.data.applyModelChange(() => {
        dsCollection.setName(iNewName)
      }, {
        notifications: () => updateCollectionNotification(dsCollection, iDataContext.data),
        undoStringKey: "DG.Undo.caseTable.collectionNameChange",
        redoStringKey: "DG.Redo.caseTable.collectionNameChange",
      })
    }

    // function setCollectionName(currName, newName) {
    //   var tCollectionClient = iDataContext.getCollectionByName(currName)
    //   if (tCollectionClient) {
    //     iDataContext.applyChange({
    //       operation: 'updateCollection',
    //       collection: tCollectionClient,
    //       properties: { name: newName }
    //     })
    //   }
    // }

    // DG.UndoHistory.execute(DG.Command.create({
    //   name: 'caseTable.collectionNameChange',
    //   undoString: 'DG.Undo.caseTable.collectionNameChange',
    //   redoString: 'DG.Redo.caseTable.collectionNameChange',
    //   execute () {
    //     setCollectionName(iOldName, iNewName)
    //     this.log = "Change collection name from '%@' to '%@'".fmt(iOldName, iNewName)
    //   },
    //   undo () {
    //     setCollectionName(iNewName, iOldName)
    //   },
    //   redo() {
    //     setCollectionName(iOldName, iNewName)
    //   }
    // }))
  }

}
