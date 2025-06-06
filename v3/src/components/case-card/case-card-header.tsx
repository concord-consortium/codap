import { observer } from "mobx-react-lite"
import React from "react"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { createCasesNotification } from "../../models/data/data-set-notifications"
import { IGroupedCase } from "../../models/data/data-set-types"
import { t } from "../../utilities/translation/translate"
import { CollectionTitle } from "../case-tile-common/collection-title"
import { CaseCardControls } from "./case-card-controls"
import { useCaseCardModel } from "./use-case-card-model"

import AddIcon from "../../assets/icons/add-data-icon.svg"

import "./case-view.scss"

interface ICaseHeaderProps {
  cases: IGroupedCase[]
  level: number
}

export const CaseCardHeader = observer(function CaseView(props: ICaseHeaderProps) {
  const { cases, level } = props
  const cardModel = useCaseCardModel()
  const data = cardModel?.data
  const collectionId = useCollectionContext()
  const collection = data?.getCollection(collectionId)
  const isCollectionSummarized = !!cardModel?.summarizedCollections.includes(collectionId)

  const getDisplayedCaseIndex = () => {
    if (cases.length === 1) return 0

    const _displayedCaseIndex = cases.findIndex(c => data?.isCaseSelected(c.__id__))
    if (_displayedCaseIndex !== -1) return _displayedCaseIndex

    // the child case is selected and not the parent, so we need to find the case that has the selected child
    const selectedItemId = data?.selection && Array.from(data.selection)[0]
    const selectedCaseId = cardModel?.caseLineage(selectedItemId)?.[level]
    const selectedCase = collection?.cases.find(c => c.__id__ === selectedCaseId)
    return cases.findIndex(c => c.__id__ === selectedCase?.__id__)
  }
  const displayedCaseIndex = getDisplayedCaseIndex()

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
      return `${displayedCaseIndex + 1} of ${cases.length}`
    }
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

  return (
    <div className="case-card-view-header" data-testid="case-card-view-header">
      <div className="case-card-view-title" data-testid="case-card-view-title">
        <CollectionTitle showCount={false} collectionIndex={level}/>
      </div>
      <CaseCardControls
        caseIndexText={getCaseIndexText()}
        cases={cases}
        data={data}
        displayedCaseIndex={displayedCaseIndex}
        isCollectionSummarized={isCollectionSummarized}
      />
      <div className="add-case">
        <button onClick={handleAddNewCase} data-testid="add-case-button">
          <AddIcon />
        </button>
      </div>
    </div>
  )
})
