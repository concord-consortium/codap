import React, { useRef } from "react"
import { observer } from "mobx-react-lite"
import { CollectionContext } from "../../hooks/use-collection-context"
import { AttributeHeaderDividerContext } from "../case-tile-common/use-attribute-header-divider-context"
import { CaseView } from "./case-view"
import { useCaseCardModel } from "./use-case-card-model"

import "./card-view.scss"

export const CardView = observer(function CardView() {
  const cardModel = useCaseCardModel()
  const data = cardModel?.data
  const collections = data?.collections
  const rootCollection = collections?.[0]
  const selectedItems = data?.selection
  const selectedItemId = selectedItems && Array.from(selectedItems)[0]
  const selectedItemLineage = cardModel?.caseLineage(selectedItemId)
  const contentRef = useRef<HTMLDivElement>(null)

  const handleSelectCases = (caseIds: string[]) => {
    data?.setSelectedCases(caseIds)
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
              displayedCaseLineage={selectedItemLineage}
            />
          </CollectionContext.Provider>
        }
      </AttributeHeaderDividerContext.Provider>
    </div>
  )
})
