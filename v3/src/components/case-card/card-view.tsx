import React, { useEffect, useRef } from "react"
import { observer } from "mobx-react-lite"
import { mstReaction } from "../../utilities/mst-reaction"
import { CollectionContext } from "../../hooks/use-collection-context"
import { AttributeHeaderDividerContext } from "../case-tile-common/use-attribute-header-divider-context"
import { CaseView } from "./case-view"
import { useCaseCardModel } from "./use-case-card-model"
import { IDataSet } from "../../models/data/data-set"
import { t } from "../../utilities/translation/translate"

import "./card-view.scss"

interface CardViewProps {
  onNewCollectionDrop: (dataSet: IDataSet, attrId: string, beforeCollectionId: string) => void
}

export const CardView = observer(function CardView({onNewCollectionDrop}: CardViewProps) {
  const cardModel = useCaseCardModel()
  const data = cardModel?.data
  const collections = data?.collections
  const areAllCollectionsSummarized = !!collections?.every(c => cardModel?.summarizedCollections.includes(c.id))
  const rootCollection = collections?.[0]
  const selectedItems = data?.selection
  const selectedItemId = selectedItems && Array.from(selectedItems)[0]
  const selectedItemLineage = cardModel?.caseLineage(selectedItemId)
  const contentRef = useRef<HTMLDivElement>(null)

  const handleSelectCases = (caseIds: string[], collectionId: string) => {
    cardModel?.setShowSummary(caseIds.length > 1, collectionId)
    data?.setSelectedCases(caseIds)
  }

  const handleSummaryButtonClick = () => {
    cardModel?.setShowSummary(!areAllCollectionsSummarized)
  }

  // The first time the card is rendered, summarize all collections unless there is a selection.
  useEffect(function startWithAllCollectionsSummarized() {
    if (data?.selection.size === 0) {
      cardModel?.summarizeAllCollections()
    }
  }, [cardModel, data])

  // When all cases are selected, show summary.
  useEffect(function showSummaryOnAllCasesSelection() {
    return mstReaction(
      () => selectedItems?.size,
      () => {
        if (selectedItems?.size === data?.items.length || selectedItems?.size === 0) {
          cardModel?.summarizeAllCollections()
        }
      }, {name: "CardView.showSummaryOnAllCasesSelection"}, data
    )
  }, [cardModel, data, selectedItems])

  return (
    <div ref={contentRef} className="case-card-content" data-testid="case-card-content">
      <AttributeHeaderDividerContext.Provider value={contentRef}>
        {rootCollection &&
          <CollectionContext.Provider key={`${rootCollection.id}-${collections?.length}`} value={rootCollection.id}>
            <CaseView
              cases={rootCollection.cases}
              level={0}
              onSelectCases={handleSelectCases}
              displayedCaseLineage={selectedItemLineage}
              onNewCollectionDrop={onNewCollectionDrop}
            />
            <div className="summary-view-toggle-container">
              <button
                className="summary-view-toggle-button"
                data-testid="summary-view-toggle-button"
                onClick={handleSummaryButtonClick}
                disabled={data?.items.length === 0}
              >
                { areAllCollectionsSummarized
                    ? t("V3.caseCard.summaryButton.showIndividualCases")
                    : t("V3.caseCard.summaryButton.showSummary")
                }
              </button>
            </div>
          </CollectionContext.Provider>
        }
      </AttributeHeaderDividerContext.Provider>
    </div>
  )
})
