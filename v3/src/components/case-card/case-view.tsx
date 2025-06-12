import React, { useCallback } from "react"
import { observer } from "mobx-react-lite"
import { IGroupedCase } from "../../models/data/data-set-types"
import { ICollectionModel } from "../../models/data/collection"
import { CaseAttrsView } from "./case-attrs-view"
import { useCaseCardModel } from "./use-case-card-model"
import { CollectionContext, ParentCollectionContext, useCollectionContext } from "../../hooks/use-collection-context"
import { t } from "../../utilities/translation/translate"
import { IAttribute } from "../../models/data/attribute"
import { createAttributesNotification } from "../../models/data/data-set-notifications"
import { uiState } from "../../models/ui-state"
import { uniqueName } from "../../utilities/js-utils"
import { IDataSet } from "../../models/data/data-set"
import { colorCycleClass } from "../case-tile-common/case-tile-utils"
import { CaseCardCollectionSpacer } from "./case-card-collection-spacer"
import { CaseCardHeader } from "./case-card-header"

import AddIcon from "../../assets/icons/add-data-icon.svg"

import "./case-view.scss"

interface ICaseViewProps {
  cases: IGroupedCase[]
  level: number
  onSelectCases: (caseIds: string[]) => void
  displayedCaseLineage?: readonly string[]
  onNewCollectionDrop: (dataSet: IDataSet, attrId: string, beforeCollectionId: string) => void
}

export const CaseView = observer(function CaseView(props: ICaseViewProps) {
  const {cases, level, onSelectCases, onNewCollectionDrop, displayedCaseLineage = []} = props
  const cardModel = useCaseCardModel()
  const data = cardModel?.data
  const collectionCount = data?.collections.length ?? 1
  const collectionId = useCollectionContext()
  const collection = data?.getCollection(collectionId)
  const initialSelectedCase = collection?.cases.find(c => c.__id__ === displayedCaseLineage[level])
  const displayedCase = initialSelectedCase ?? cases[0]
  const displayedCaseId = displayedCase?.__id__

  const handleNewCollectionDrop = useCallback((dataSet: IDataSet, attrId: string, collId: string) => {
    const attr = dataSet.attrFromID(attrId)
    attr && onNewCollectionDrop(dataSet, attrId, collId)
  }, [onNewCollectionDrop])

  const handleAddNewAttribute = () => {
    let attribute: IAttribute | undefined
    data?.applyModelChange(() => {
      const newAttrName = uniqueName(t("DG.CaseTable.defaultAttrName"),
        (aName: string) => !data.attributes.find(attr => aName === attr.name)
      )
      attribute = data.addAttribute({ name: newAttrName }, { collection: collectionId })
      if (attribute) {
        uiState.setAttrIdToEdit(attribute.id)
      }
    }, {
      notify: () => createAttributesNotification(attribute ? [attribute] : [], data),
      undoStringKey: "DG.Undo.caseTable.createAttribute",
      redoStringKey: "DG.Redo.caseTable.createAttribute"
    })
  }

  const renderChildCollection = (coll: ICollectionModel) => {
    const childCases = cardModel?.groupChildCases(displayedCaseId)
    if (!childCases) return null

    return (
      <ParentCollectionContext.Provider key={`${displayedCaseId}-${level}`} value={coll.parent?.id}>
        <CollectionContext.Provider value={coll.id}>
          <CaseView
            cases={childCases}
            level={level + 1}
            onSelectCases={onSelectCases}
            displayedCaseLineage={displayedCaseLineage}
            onNewCollectionDrop={handleNewCollectionDrop}
          />
        </CollectionContext.Provider>
      </ParentCollectionContext.Provider>
    )
  }

  return (
    <div className={`case-card-view fadeIn ${colorCycleClass(level, collectionCount)}`} data-testid="case-card-view">
      {level === 0 && <CaseCardCollectionSpacer onDrop={handleNewCollectionDrop} collectionId={collectionId}/>}
      <CaseCardHeader cases={cases} level={level}/>
      <div className="case-card-attributes">
        <button className="add-attribute" onClick={handleAddNewAttribute} data-testid="add-attribute-button">
          <AddIcon />
        </button>
        <CaseAttrsView
          key={displayedCaseId}
          caseItem={displayedCase}
          collection={collection}
        />
        { collection?.child &&
          <>
            <CaseCardCollectionSpacer onDrop={handleNewCollectionDrop} collectionId={collection.child.id} />
            {renderChildCollection(collection.child)}
          </>
        }
      </div>
    </div>
  )
})
