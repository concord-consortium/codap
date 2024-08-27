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
  const selectedCases = data?.selection
  const selectedCaseId = selectedCases && Array.from(selectedCases)[0]
  const selectedCaseLineage = cardModel?.caseLineage(selectedCaseId)

  const handleSelectCases = (caseIds: string[]) => {
    data?.setSelectedCases(caseIds)
  }

  return (
    <div className="cardView" data-testid="card-view">
      {rootCollection &&
        <CollectionContext.Provider key={`${rootCollection.id}-${collections?.length}`} value={rootCollection.id}>
          <CaseView
            cases={rootCollection.cases}
            level={0}
            onSelectCases={handleSelectCases}
            displayedCaseLineage={selectedCaseLineage?.caseIds}
          />
        </CollectionContext.Provider>
      }
    </div>
  )
})
