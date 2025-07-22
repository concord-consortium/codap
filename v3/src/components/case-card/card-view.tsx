import React, { useRef } from "react"
import { observer } from "mobx-react-lite"
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
  const rootCollection = collections?.[0]
  const contentRef = useRef<HTMLDivElement>(null)
  const summarizedCollections = cardModel?.summarizedCollections || []
  const isInSummaryMode = summarizedCollections.length > 0

  const handleSelectCases = (caseIds: string[]) => {
    data?.setSelectedCases(caseIds)
  }

  const handleSummaryButtonClick = () => {
    if (isInSummaryMode) {
      // select the first child-most case
      const firstItemId = data?.itemIds[0]
      const firstItemLineage = cardModel?.caseLineage(firstItemId)
      if (firstItemLineage) {
        data?.setSelectedCases([firstItemLineage[firstItemLineage.length - 1]])
      }
    } else {
      data?.setSelectedCases([])
    }
  }

  return (
    <div ref={contentRef} className="case-card-content" data-testid="case-card-content">
      <AttributeHeaderDividerContext.Provider value={contentRef}>
        {rootCollection &&
          <CollectionContext.Provider key={`${rootCollection.id}-${collections?.length}`} value={rootCollection.id}>
            <CaseView
              cases={rootCollection.cases}
              level={0}
              onSelectCases={handleSelectCases}
              onNewCollectionDrop={onNewCollectionDrop}
            />
            <div className="summary-view-toggle-container">
              <button
                className="summary-view-toggle-button"
                data-testid="summary-view-toggle-button"
                onClick={handleSummaryButtonClick}
                disabled={data?.items.length === 0}
              >
                { isInSummaryMode
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
