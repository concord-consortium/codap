import React from 'react'
import { useCollectionContext } from '../../hooks/use-collection-context'
import { ICollectionModel } from '../../models/data/collection'
import { IDataSet } from "../../models/data/data-set"
import { IGroupedCase } from '../../models/data/data-set-types'
import { setSelectedCases } from "../../models/data/data-set-utils"

import Arrow from "../../assets/icons/arrow.svg"

// TODO We should use collection.getCaseIndex here, but it's not working correctly
function caseIndex(caseId: string, collection?: ICollectionModel) {
  return collection?.caseIds.indexOf(caseId)
}

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
  console.log(`--- displayedCaseIndex`, displayedCaseIndex)
  const caseId = cases[displayedCaseIndex]?.__id__
  console.log(`--- caseId`, caseId)
  const collectionId = useCollectionContext()
  const collection = data?.getCollection(collectionId)
  const _indexInCollection = collection?.getCaseIndex(caseId)
  const indexInCollection = caseIndex(caseId, collection)
  console.log(` -- indexInCollection`, indexInCollection, _indexInCollection)
  // const parentCollection = collection?.parent
  // console.log(` -- parentCollection`, parentCollection)
  // const parentCase = parentCollection?.findParentCaseGroup(caseId)
  // const parentCase = data?.getParentCase(cases[displayedCaseIndex]?.__id__, collectionId)
  // console.log(` -- parentCase`, parentCase)
  // const parentCaseId = parentCase?.groupedCase.__id__
  // const parentCaseIndex = parentCaseId ? caseIndex(parentCaseId, parentCollection) : undefined
  // console.log(` -- parentCaseIndex`, parentCaseIndex)
  // const parentCollectionIndex = data?.getCollectionIndex(parentCollection?.id)

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

  const getNextCase = () => {
    if (!collection) return

    if (data?.selection.size === 1) {
      if (indexInCollection != null && indexInCollection < collection.cases.length - 1) {
        console.log(`!!! indexInCollection <`, indexInCollection)
        const nCase = collection.getCaseGroup(collection.caseIds[indexInCollection + 1])?.groupedCase
        console.log(` !! nextCase`, nCase)
        console.log(`. ! nextCaseId`, nCase?.__id__, collection.caseIds[indexInCollection + 1])
        if (nCase) {
          const nextCaseIndex = collection.getCaseIndex(nCase.__id__)
          console.log(`  ! nextCaseIndex`, nextCaseIndex, collection.caseIds[nextCaseIndex!])
        }
        return collection.getCaseGroup(collection.caseIds[indexInCollection + 1])?.groupedCase
      }
    } else {
      // If no cases are selected, return the first case
      if (data?.selection.size === 0) return collection?.cases[0]

      // Otherwise return the first case that is selected
      const nextCaseId = collection.caseIds.find(id => data?.isCaseSelected(id))
      console.log(` !! nextCaseId`, nextCaseId)
      if (nextCaseId) return collection.getCaseGroup(nextCaseId)?.groupedCase
    }
    // if (displayedCaseIndex < collection.cases.length - 1) {
    //   console.log(`!!! <`, displayedCaseIndex, collection.cases.length - 1)
    //   return collection.cases[displayedCaseIndex + 1]
    // }
    // if (parentCollection && parentCaseIndex != null && parentCaseIndex < parentCollection.cases.length - 1) {
    //   const nextParentCase = parentCollection.getCaseGroup(parentCollection.cases[parentCaseIndex + 1].__id__)
    //   console.log(`. - nextParentCase`, nextParentCase)
    //   const nextCaseId = nextParentCase?.childCaseIds?.[0]
    //   console.log(`. - nextParentCaseChildren`, nextParentCase?.childCaseIds)
    //   if (nextCaseId) return collection.getCaseGroup(nextCaseId)?.groupedCase
    // }
  }
  const nextCase = getNextCase()
  console.log(`  - nextCase`, nextCase)
  // const nextCase = displayedCaseIndex === -1
  //   ? collection?.cases[0]
  //   : displayedCaseIndex === 0
  //   ? collection?.cases[displayedCaseIndex + 1]
  const nextButtonDisabled = !nextCase

  const getPreviousCase = () => {
    if (!collection) return

    if (data?.selection.size === 1) {
      if (indexInCollection != null && indexInCollection > 0) {
        return collection.getCaseGroup(collection.caseIds[indexInCollection - 1])?.groupedCase
      }
    } else {
      // If no cases are selected, return the last case
      const lastCaseId = collection.caseIds[collection.caseIds.length - 1]
      const lastCase = lastCaseId ? collection.getCaseGroup(lastCaseId)?.groupedCase : undefined
      if (data?.selection.size === 0) return lastCase

      // Otherwise return the case before the first one that's selected
      const selectedItems = Array.from(data?.selection ?? []).map(id => ({ __id__: id }))
      const selectedCaseIds = data?.getItemsForCases(selectedItems)?.map(c => c.__id__) ?? []
      const selectedCaseIndices = selectedCaseIds.map(id => caseIndex(id, collection))
        .filter(index => !!index && index >= 0) as number[]
      const lowestIndex = Math.min(...selectedCaseIndices)
      if (lowestIndex > 0) {
        return collection.getCaseGroup(collection.caseIds[lowestIndex - 1])?.groupedCase
      } else {
        return lastCase
      }
      // // Otherwise return the last case that is selected
      // const prevCaseId = collection.caseIds.slice().reverse().find(id => data?.isCaseSelected(id))
      // if (prevCaseId) return collection.getCaseGroup(prevCaseId)?.groupedCase
    }
    // if (indexInCollection != null && indexInCollection > 0) {
    //   return collection.getCaseGroup(collection.caseIds[indexInCollection - 1])?.groupedCase
    // }
    // // if (displayedCaseIndex > 0) return collection.cases[displayedCaseIndex - 1]
    // if (parentCollection && parentCaseIndex != null && parentCaseIndex > 0) {
    //   const prevParentCase = parentCollection.getCaseGroup(parentCollection.cases[parentCaseIndex - 1].__id__)
    //   const prevCaseIndex = (prevParentCase?.childCaseIds?.length ?? 0) - 1
    //   const prevCaseId = prevParentCase?.childCaseIds?.[prevCaseIndex]
    //   if (prevCaseId) return collection.getCaseGroup(prevCaseId)?.groupedCase
    // }
  }
  const previousCase = getPreviousCase()
  console.log(`  - previousCase`, previousCase)
  // const previousCase = displayedCaseIndex === -1 ? undefined : collection?.cases[displayedCaseIndex - 1]
  const prevButtonDisabled = !previousCase

  const handleSelectCase = (id?: string) => {
    if (id) setSelectedCases([id], data)
  }
  // const handleSelectCase = (delta: number) => {
  //   const selectedCaseIndex = isCollectionSummarized
  //                               ? delta < 0 ? cases.length - 1 : 0
  //                               : displayedCaseIndex + delta
  //   const newCase = cases[selectedCaseIndex]
  //   if (!newCase.__id__) return
  //   setSelectedCases([newCase.__id__], data)
  // }

  // const prevButtonDisabled = isCollectionSummarized || displayedCaseIndex === 0
  // const nextButtonDisabled = !isCollectionSummarized && displayedCaseIndex === cases.length - 1
  return (
    <div className="case-card-controls">
      <button
        className="arrow previous"
        data-testid="case-card-view-previous-button"
        disabled={prevButtonDisabled}
        // onClick={() => handleSelectCase(-1)}
        onClick={() => handleSelectCase(previousCase?.__id__)}
      >
        <Arrow />
      </button>
      { renderCaseIndexText() }
      <button
        className="arrow next"
        data-testid="case-card-view-next-button"
        disabled={nextButtonDisabled}
        // onClick={() => handleSelectCase(+1)}
        onClick={() => handleSelectCase(nextCase?.__id__)}
      >
        <Arrow />
      </button>
    </div>
  )
}
