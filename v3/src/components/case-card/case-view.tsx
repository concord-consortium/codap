import React, { useCallback, useMemo } from "react"
import { observer } from "mobx-react-lite"
import { IGroupedCase } from "../../models/data/data-set-types"
import { ICollectionModel } from "../../models/data/collection"
import { CaseAttrsView } from "./case-attrs-view"
import { useCaseCardModel } from "./use-case-card-model"
import { CollectionContext, ParentCollectionContext, useCollectionContext } from "../../hooks/use-collection-context"
import { CollectionTitle } from "../case-tile-common/collection-title"
import { t } from "../../utilities/translation/translate"
import { IAttribute } from "../../models/data/attribute"
import { createAttributesNotification, createCasesNotification } from "../../models/data/data-set-notifications"
import { uiState } from "../../models/ui-state"
import { uniqueName } from "../../utilities/js-utils"
import { IDataSet } from "../../models/data/data-set"
import { CaseCardCollectionSpacer } from "./case-card-collection-spacer"

import Arrow from "../../assets/icons/arrow.svg"
import AddIcon from "../../assets/icons/add-data-icon.svg"

import "./case-view.scss"

interface ICaseViewProps {
  cases: IGroupedCase[]
  level: number
  onSelectCases: (caseIds: string[], collection: string) => void
  displayedCaseLineage?: readonly string[]
  onNewCollectionDrop: (dataSet: IDataSet, attrId: string, beforeCollectionId: string) => void
}

const colorCycleClass = (level: number) => {
  const colorCycleCount = 5
  // e.g. `color-cycle-1`, `color-cycle-2`, etc.
  return `color-cycle-${level % colorCycleCount + 1}`
}

export const CaseView = observer(function CaseView(props: ICaseViewProps) {
  const {cases, level, onSelectCases, onNewCollectionDrop, displayedCaseLineage = []} = props
  const cardModel = useCaseCardModel()
  const data = cardModel?.data
  const selectedCases = data?.selection
  const selectionContainsCollectionCases = selectedCases && cases.some(c => selectedCases.has(c.__id__))
  const summaryTotal = selectionContainsCollectionCases ? selectedCases.size : cases.length
  const collectionId = useCollectionContext()
  const collection = data?.getCollection(collectionId)
  const isCollectionSummarized = !!cardModel?.summarizedCollections.includes(collectionId)
  const initialSelectedCase = collection?.cases.find(c => c.__id__ === displayedCaseLineage[level])
  const displayedCase = initialSelectedCase ?? cases[0]
  const displayedCaseId = displayedCase?.__id__

  const displayedCaseIndex = useMemo(() => {
    // the first time this runs selectedCase will not be defined and this will return -1, thus the Math.max
    return Math.max(0, cases.findIndex(c => c.__id__ === displayedCaseId))
  }, [cases, displayedCaseId])

  const caseIndexText = isCollectionSummarized
    ? `${summaryTotal} ${summaryTotal === 1 ? t("DG.DataContext.singleCaseName") : t("DG.DataContext.pluralCaseName")}`
    : `${displayedCaseIndex + 1} of ${cases.length}`
  const prevButtonDisabled = displayedCaseIndex <= 0
  const nextButtonDisabled = displayedCaseIndex >= cases.length - 1

  const handleNewCollectionDrop = useCallback((dataSet: IDataSet, attrId: string, collId: string) => {
    const attr = dataSet.attrFromID(attrId)
    attr && onNewCollectionDrop(dataSet, attrId, collId)
  }, [onNewCollectionDrop])

  const handleSelectCase = useCallback((delta: number) => () => {
    const selectedCaseIndex = isCollectionSummarized
                                ? delta < 0 ? cases.length - 1 : 0
                                : displayedCaseIndex + delta
    const newCase = cases[selectedCaseIndex]
    if (!newCase.__id__) return

    onSelectCases([newCase.__id__], collectionId)
  }, [isCollectionSummarized, cases, displayedCaseIndex, onSelectCases, collectionId])

  const handleAddNewCase = () => {
    if (collection) {
      let newCaseId: string | undefined
      data?.applyModelChange(() => {
        const newItemId = cardModel?.addNewCase(cases, collection, displayedCaseId)
        newCaseId = newItemId && data?.getItemCaseIds(newItemId)[level]
        newCaseId && onSelectCases([newCaseId], collectionId)
      }, {
        notify: () => {
          if (newCaseId) {
            return createCasesNotification([newCaseId], data)
          }
        },
        undoStringKey: "DG.Undo.caseTable.createNewCase",
        redoStringKey: "DG.Redo.caseTable.createNewCase"
      })
    }
  }

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
    <>
    <div className={`case-card-view fadeIn ${colorCycleClass(level)}`} data-testid="case-card-view">
      {level === 0 && <CaseCardCollectionSpacer onDrop={handleNewCollectionDrop} collectionId={collectionId}/>}
      <div className="case-card-view-header" data-testid="case-card-view-header">
        <div className="case-card-view-title" data-testid="case-card-view-title">
          <CollectionTitle showCount={false} />
        </div>
        <div className="case-card-controls">
          <button
            className="arrow previous"
            data-testid="case-card-view-previous-button"
            disabled={prevButtonDisabled}
            onClick={handleSelectCase(-1)}
          >
            <Arrow />
          </button>
          <span className="caseIndex" data-testid="case-card-view-index">
            {caseIndexText}
          </span>
          <button
            className="arrow next"
            data-testid="case-card-view-next-button"
            disabled={nextButtonDisabled}
            onClick={handleSelectCase(+1)}
          >
            <Arrow />
          </button>
        </div>
        <div className="add-case">
          <button onClick={handleAddNewCase} data-testid="add-case-button">
            <AddIcon />
          </button>
        </div>
      </div>
      <div className="case-card-attributes">
        <button className="add-attribute" onClick={handleAddNewAttribute} data-testid="add-attribute-button">
          <AddIcon />
        </button>
        <CaseAttrsView key={displayedCaseId} caseItem={displayedCase} collection={collection} />
        { collection?.child &&
          <>
            <CaseCardCollectionSpacer onDrop={handleNewCollectionDrop} collectionId={collection.child.id} />
            {renderChildCollection(collection.child)}
          </>
        }
      </div>
    </div>
    </>
  )
})
