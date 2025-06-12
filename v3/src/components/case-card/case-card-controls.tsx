import React from 'react'
import { IDataSet } from "../../models/data/data-set"
import { IGroupedCase } from '../../models/data/data-set-types'
import { setSelectedCases } from "../../models/data/data-set-utils"

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

  const handleSelectCase = (delta: number) => {
    const selectedCaseIndex = isCollectionSummarized
                                ? delta < 0 ? cases.length - 1 : 0
                                : displayedCaseIndex + delta
    const newCase = cases[selectedCaseIndex]
    if (!newCase.__id__) return
    setSelectedCases([newCase.__id__], data)
  }

  const prevButtonDisabled = isCollectionSummarized || displayedCaseIndex === 0
  const nextButtonDisabled = !isCollectionSummarized && displayedCaseIndex === cases.length - 1
  return (
    <div className="case-card-controls">
      <button
        className="arrow previous"
        data-testid="case-card-view-previous-button"
        disabled={prevButtonDisabled}
        onClick={() => handleSelectCase(-1)}
      >
        <Arrow />
      </button>
      { renderCaseIndexText() }
      <button
        className="arrow next"
        data-testid="case-card-view-next-button"
        disabled={nextButtonDisabled}
        onClick={() => handleSelectCase(+1)}
      >
        <Arrow />
      </button>
    </div>
  )
}
