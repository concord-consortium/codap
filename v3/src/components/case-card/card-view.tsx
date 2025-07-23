import React, { useRef } from "react"
import { observer } from "mobx-react-lite"
import { CollectionContext } from "../../hooks/use-collection-context"
import { IDataSet } from "../../models/data/data-set"
import { setSelectedCases } from "../../models/data/data-set-utils"
import { t } from "../../utilities/translation/translate"
import { AttributeHeaderDividerContext } from "../case-tile-common/use-attribute-header-divider-context"
import { CaseView } from "./case-view"
import { useCaseCardModel } from "./use-case-card-model"

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
  const summarizedCollectionsCount = cardModel?.summarizedCollections.size ?? 0
  const isInSummaryMode = summarizedCollectionsCount > 0

  const handleSelectCases = (caseIds: string[]) => {
    setSelectedCases(caseIds, data)
  }

  const handleSummaryButtonClick = () => {
    if (isInSummaryMode) {
      // select the first child-most case
      const caseId = data?.itemIdChildCaseMap.get(data?.itemIds[0])?.groupedCase?.__id__
      if (caseId) setSelectedCases([caseId], data)
    } else {
      setSelectedCases([], data)
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
