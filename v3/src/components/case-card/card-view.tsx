import React from "react"
import { observer } from "mobx-react-lite"
import { CaseView } from "./case-view"
import { useCaseCardModel } from "./use-case-card-model"
import { CollectionContext } from "../../hooks/use-collection-context"

import "./card-view.scss"

export const CardView = observer(function CardView() {
  const cardModel = useCaseCardModel()
  const data = cardModel?.data
  const collections = data?.collections
  const rootCollection = collections?.[0]
  const selectedItems = data?.selection
  const selectedItemId = selectedItems && Array.from(selectedItems)[0]
  const selectedItemLineage = cardModel?.caseLineage(selectedItemId)

  const handleSelectCases = (caseIds: string[]) => {
    data?.setSelectedCases(caseIds)
  }

  return (
    <div className="case-card-content" data-testid="case-card-content">
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
    </div>
  )
})
