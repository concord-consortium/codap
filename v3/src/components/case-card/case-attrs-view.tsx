import React, { useCallback, useRef, useState } from "react"
import { observer } from "mobx-react-lite"
import { IGroupedCase } from "../../models/data/data-set-types"
import { CaseAttrView } from "./case-attr-view"
import { IValueType } from "../../models/data/attribute"
import { ICollectionModel } from "../../models/data/collection"
import { useCaseCardModel } from "./use-case-card-model"
import { getSharedCaseMetadataFromDataset } from "../../models/shared/shared-data-utils"
import { AttributeHeader } from "../case-tile-common/attribute-header"
import { kIndexColumnKey } from "../case-table/case-table-types"
import { AttributeHeaderDivider } from "../case-tile-common/attribute-header-divider"

import "./case-attrs-view.scss"

interface ICaseAttrsViewProps {
  caseItem: IGroupedCase
  collection?: ICollectionModel
}

export const CaseAttrsView = observer(function CaseAttrsView({caseItem, collection}: ICaseAttrsViewProps) {
  const data = useCaseCardModel()?.data
  const contentRef = useRef<HTMLDivElement | null>(null)
  const [, setCellElt] = useState<HTMLElement | null>(null)
  const values: IValueType[] = collection?.attributes.map(attr => {
    return attr?.id && data?.getValue(caseItem.__id__, attr.id)
  }) ?? []

  const handleSetContentElt = useCallback((contentElt: HTMLDivElement | null) => {
    contentRef.current = contentElt
    const _cellElt: HTMLElement | null = contentRef.current?.closest(".case-card-attr") ?? null
    setCellElt(_cellElt)
    return _cellElt
  }, [])

  return (
    <table className="case-card-attrs fadeIn" data-testid="case-card-attrs">
      <tbody>
        <tr className="case-card-attr index-row">
          <td colSpan={2}>
        <AttributeHeader
          attributeId={kIndexColumnKey}
          HeaderDivider={AttributeHeaderDivider}
          onSetContentElt={handleSetContentElt}
        />
          </td>
        </tr>
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
                onSetContentElt={handleSetContentElt}
              />
            )
          })
        }
      </tbody>
    </table>
  )
})
