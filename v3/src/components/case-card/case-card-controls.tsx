import React from 'react'
import { useCollectionContext } from '../../hooks/use-collection-context'
import { IDataSet } from "../../models/data/data-set"
import { IGroupedCase } from '../../models/data/data-set-types'
import { getNextCase, getPreviousCase, setSelectedCases } from "../../models/data/data-set-utils"

import Arrow from "../../assets/icons/arrow.svg"

interface ICaseCardControlsProps {
  caseIndexText: string
  cases: IGroupedCase[]
  data?: IDataSet
  displayedCaseIndex: number
  isCollectionSummarized: boolean
}

export function CaseCardControls({
  caseIndexText, cases, data, displayedCaseIndex, isCollectionSummarized
}: ICaseCardControlsProps) {
  const caseId = cases[displayedCaseIndex]?.__id__
  const collectionId = useCollectionContext()
  const collection = data?.getCollection(collectionId)

  const renderCaseIndexText = () => {
    return (
      <span className="caseIndex" data-testid="case-card-view-index">
        {caseIndexText}
      </span>
    )
  }

  if (cases.length === 0) {
    return (
      <div className="case-card-controls">
        {renderCaseIndexText()}
      </div>
    )
  }

  const nextCase = data && collection ? getNextCase(data, collection, caseId) : undefined
  const nextButtonDisabled = !nextCase

  const previousCase = data && collection ? getPreviousCase(data, collection, caseId) : undefined
  const prevButtonDisabled = !previousCase

  const handleSelectCase = (id?: string) => {
    if (id) setSelectedCases([id], data)
  }

  return (
    <div className="case-card-controls">
      <button
        className="arrow previous"
        data-testid="case-card-view-previous-button"
        disabled={prevButtonDisabled}
        onClick={() => handleSelectCase(previousCase?.__id__)}
      >
        <Arrow />
      </button>
      { renderCaseIndexText() }
      <button
        className="arrow next"
        data-testid="case-card-view-next-button"
        disabled={nextButtonDisabled}
        onClick={() => handleSelectCase(nextCase?.__id__)}
      >
        <Arrow />
      </button>
    </div>
  )
}
