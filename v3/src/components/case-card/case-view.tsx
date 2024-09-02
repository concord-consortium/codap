import React, { useCallback, useMemo } from "react"
import { observer } from "mobx-react-lite"
import { IGroupedCase } from "../../models/data/data-set-types"
import { ICollectionModel } from "../../models/data/collection"
import { CaseAttrsView } from "./case-attrs-view"
import { useCaseCardModel } from "./use-case-card-model"
import { CollectionContext, ParentCollectionContext, useCollectionContext } from "../../hooks/use-collection-context"
import { CollectionTitle } from "../case-table-card-common/collection-title"

import Arrow from "../../assets/icons/arrow.svg"

import "./card-view.scss"

interface ICaseViewProps {
  cases: IGroupedCase[]
  level: number
  onSelectCases: (caseIds: string[]) => void
  displayedCaseLineage?: string[]
}

const colorCycleClass = (level: number) => {
  const colorCycleCount = 5
  // e.g. `color-cycle-1`, `color-cycle-2`, etc.
  return `color-cycle-${level % colorCycleCount + 1}`
}

export const CaseView = observer(function CaseView(props: ICaseViewProps) {
  const {cases, level, onSelectCases, displayedCaseLineage = []} = props
  const cardModel = useCaseCardModel()
  const data = cardModel?.data
  const collectionId = useCollectionContext()
  const collection = data?.getCollection(collectionId)
  const initialSelectedCase = collection?.cases.find(c => c.__id__ === displayedCaseLineage[level])
  const displayedCase = initialSelectedCase ?? cases[0]
  const displayedCaseId = displayedCase.__id__

  const displayedCaseIndex = useMemo(() => {
    // the first time this runs selectedCase will not be defined and this will return -1, thus the Math.max
    return Math.max(0, cases.findIndex(c => c.__id__ === displayedCaseId))
  }, [cases, displayedCaseId])

  const prevButtonDisabled = displayedCaseIndex <= 0
  const nextButtonDisabled = displayedCaseIndex >= cases.length - 1

  const handleButtonClickFn = useCallback((delta: number) => () => {
    const newCase = cases[displayedCaseIndex + delta]
    if (!newCase.__id__) return

    onSelectCases([newCase.__id__])
  }, [displayedCaseIndex, cases, onSelectCases])

  const renderChildCollection = (coll: ICollectionModel) => {
    const childCases = cardModel?.groupChildCases(coll, displayedCaseId)
    if (!childCases) return null

    return (
      <ParentCollectionContext.Provider key={`${displayedCaseId}-${level}`} value={coll.parent?.id}>
        <CollectionContext.Provider value={coll.id}>
          <CaseView
            cases={childCases}
            level={level + 1}
            onSelectCases={onSelectCases}
            displayedCaseLineage={displayedCaseLineage}
          />
        </CollectionContext.Provider>
      </ParentCollectionContext.Provider>
    )
  }

  return (
    <div className={`case fadeIn ${colorCycleClass(level)}`} data-testid="case-view">
      <div className="case-view-header" data-testid="case-view-header">
        <div className="case-view-title" data-testid="case-view-title">
          <CollectionTitle showCount={false} />
        </div>
        <div className="controls">
          <button
            className="arrow previous"
            data-testid="case-view-previous-button"
            disabled={prevButtonDisabled}
            onClick={handleButtonClickFn(-1)}
          >
            <Arrow />
          </button>
          <span className="caseIndex" data-testid="case-view-index">{displayedCaseIndex + 1} of {cases.length}</span>
          <button
            className="arrow next"
            data-testid="case-view-next-button"
            disabled={nextButtonDisabled}
            onClick={handleButtonClickFn(+1)}
          >
            <Arrow />
          </button>
        </div>
      </div>
      <CaseAttrsView key={displayedCaseId} caseItem={displayedCase} collection={collection} />
      {collection?.child && renderChildCollection(collection.child)}
    </div>
  )
})
