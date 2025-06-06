import { observer } from "mobx-react-lite"
import React from "react"
import { CollectionTitle } from "../case-tile-common/collection-title"
import { useCaseCardModel } from "./use-case-card-model"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { createCasesNotification } from "../../models/data/data-set-notifications"
import { t } from "../../utilities/translation/translate"
import { IGroupedCase } from "../../models/data/data-set-types"
import { setSelectedCases } from "../../models/data/data-set-utils"

import Arrow from "../../assets/icons/arrow.svg"
import AddIcon from "../../assets/icons/add-data-icon.svg"

import "./case-view.scss"

interface ICaseHeaderProps {
  cases: IGroupedCase[]
  level: number
}

export const CaseCardHeader = observer(function CaseCardHeader(props: ICaseHeaderProps) {
  const { cases, level } = props
  const cardModel = useCaseCardModel()
  const data = cardModel?.data
  const collectionId = useCollectionContext()
  const collection = data?.getCollection(collectionId)
  const isCollectionSummarized = !!cardModel?.summarizedCollections.includes(collectionId)

  const getDisplayedCaseIndex = () => {
    if (cases.length === 1) return 0
    let displayedCaseIndex = cases.findIndex(c => data?.isCaseSelected(c.__id__))
    if (displayedCaseIndex === -1) {
      // the child case is selected and not the parent, so we need to find the case that has the selected child
      const selectedItemId = data?.selection && Array.from(data.selection)[0]
      const selectedCaseId = cardModel?.caseLineage(selectedItemId)?.[level]
      const selectedCase = collection?.cases.find(c => c.__id__ === selectedCaseId)
      displayedCaseIndex = cases.findIndex(c => c.__id__ === selectedCase?.__id__)
    }
    return displayedCaseIndex
  }

  const getCaseIndexText = () => {
    if (isCollectionSummarized) {
      let summaryTotal = 0
      if (data?.selection.size === 0) {
        summaryTotal = collection?.cases.length ?? 0
      } else if (!collection?.child) {
        summaryTotal = collection?.cases.filter(c => data?.isCaseSelected(c.__id__)).length ?? 0
      } else {
        const anyChildSelectedCount = collection?.cases.reduce((count, { __id__ }) => {
          const caseInfo = data?.caseInfoMap.get(__id__)
          return caseInfo?.childItemIds.some(id => data?.selection?.has(id)) ? count + 1 : count
        }, 0)
        summaryTotal = anyChildSelectedCount
      }

      return `${summaryTotal} ${summaryTotal === 1
                                ? t("DG.DataContext.singleCaseName")
                                : t("DG.DataContext.pluralCaseName")}`
    } else {
      return `${getDisplayedCaseIndex() + 1} of ${cases.length}`
    }
  }

  const handleSelectCase = (delta: number) => {
    const displayedCaseIndex = getDisplayedCaseIndex()
    const selectedCaseIndex = isCollectionSummarized
                                ? delta < 0 ? cases.length - 1 : 0
                                : displayedCaseIndex + delta
    const newCase = cases[selectedCaseIndex]
    if (!newCase.__id__) return
    setSelectedCases([newCase.__id__], data)
  }

  const handleAddNewCase = () => {
    if (collection) {
      let newCaseId: string | undefined
      data?.applyModelChange(() => {
        const newItemId = cardModel?.addNewCase(level)
        newCaseId = newItemId && data?.getItemCaseIds(newItemId)[level]
        newCaseId && data?.setSelectedCases([newCaseId])
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

  const prevButtonDisabled = isCollectionSummarized || (!isCollectionSummarized && getDisplayedCaseIndex() === 0)
  const nextButtonDisabled = !isCollectionSummarized && getDisplayedCaseIndex() === cases.length - 1

  return (
    <div className="case-card-view-header" data-testid="case-card-view-header">
      <div className="case-card-view-title" data-testid="case-card-view-title">
        <CollectionTitle showCount={false} collectionIndex={level}/>
      </div>
      <div className="case-card-controls">
        <button
          className="arrow previous"
          data-testid="case-card-view-previous-button"
          disabled={prevButtonDisabled}
          onClick={() => handleSelectCase(-1)}
        >
          <Arrow />
        </button>
        <span className="caseIndex" data-testid="case-card-view-index">
          {getCaseIndexText()}
        </span>
        <button
          className="arrow next"
          data-testid="case-card-view-next-button"
          disabled={nextButtonDisabled}
          onClick={() => handleSelectCase(+1)}
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
  )
})
