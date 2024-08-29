import React from "react"
import { observer } from "mobx-react-lite"
import { IGroupedCase } from "../../models/data/data-set-types"
import { CaseAttrView } from "./case-attr-view"
import { IValueType } from "../../models/data/attribute"
import { ICollectionModel } from "../../models/data/collection"
import { useCaseCardModel } from "./use-case-card-model"

import "./card-view.scss"

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
    <table className="caseAttrs fadeIn" data-testid="case-attrs">
      <tbody>
        {collection?.attributes.map((attr, index: number) => {
            if (!attr) return null
            return (
              <CaseAttrView
                key={attr.id}
                caseId={caseItem.__id__}
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
