import React from "react"
import { observer } from "mobx-react-lite"
import { IGroupedCase } from "../../models/data/data-set-types"
import { CaseAttrView } from "./case-attr-view"
import { IValueType } from "../../models/data/attribute"
import { ICollectionModel } from "../../models/data/collection"
import { useCaseCardModel } from "./use-case-card-model"
import { getSharedCaseMetadataFromDataset } from "../../models/shared/shared-data-utils"

import "./case-attrs-view.scss"

interface ICaseAttrsViewProps {
  caseItem: IGroupedCase
  collection?: ICollectionModel
}

export const CaseAttrsView = observer(function CaseAttrsView({caseItem, collection}: ICaseAttrsViewProps) {
  const data = useCaseCardModel()?.data
  const values: IValueType[] = collection?.attributes.map(attr => {
    return attr?.id && data?.getValue(caseItem.__id__, attr.id)
  }) ?? []

  return (
    <table className="case-card-attrs fadeIn" data-testid="case-card-attrs">
      <tbody>
        {collection?.attributes.map((attr, index: number) => {
            const metadata = data && getSharedCaseMetadataFromDataset(data)
            if (!attr || metadata?.isHidden(attr.id)) return null
            return (
              <CaseAttrView
                key={attr.id}
                caseId={caseItem.__id__}
                collection={collection}
                attrId={attr.id}
                name={attr.name}
                value={values[index]}
                unit={attr.units}
              />
            )
          })
        }
      </tbody>
    </table>
  )
})
