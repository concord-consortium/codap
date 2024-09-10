import React, { useCallback, useRef, useState } from "react"
import { observer } from "mobx-react-lite"
import { IGroupedCase } from "../../models/data/data-set-types"
import { CaseAttrView } from "./case-attr-view"
import { IValueType } from "../../models/data/attribute"
import { ICollectionModel } from "../../models/data/collection"
import { useCaseCardModel } from "./use-case-card-model"
import { getSharedCaseMetadataFromDataset } from "../../models/shared/shared-data-utils"
import { AttributeHeader } from "../case-tile-common/attribute-header"
import { AttributeHeaderDivider } from "../case-tile-common/attribute-header-divider"
import { kIndexColumnKey } from "../case-tile-common/case-tile-types"

import "./case-attrs-view.scss"

interface ICaseAttrsViewProps {
  caseItem: IGroupedCase
  collection?: ICollectionModel
}

function getDividerBounds(containerBounds: DOMRect, cellBounds: DOMRect) {
  const kCardCellWidthOffset = 5
  const kCardCellHeight = 25
  return {
    top: cellBounds.bottom - containerBounds.top + kCardCellHeight,
    left: cellBounds.left - containerBounds.left,
    width: containerBounds.width - cellBounds.left - containerBounds.left - kCardCellWidthOffset,
    height: 6
  }
}

export const CaseAttrsView = observer(function CaseAttrsView({caseItem, collection}: ICaseAttrsViewProps) {
  const data = useCaseCardModel()?.data
  const contentRef = useRef<HTMLDivElement | null>(null)
  const [, setCellElt] = useState<HTMLElement | null>(null)
  const values: IValueType[] = collection?.attributes.map(attr => {
    return attr?.id && data?.getValue(caseItem?.__id__, attr.id)
  }) ?? []

  const handleSetHeaderContentElt = useCallback((contentElt: HTMLDivElement | null) => {
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
              getDividerBounds={getDividerBounds}
              HeaderDivider={AttributeHeaderDivider}
              onSetHeaderContentElt={handleSetHeaderContentElt}
            />
          </td>
        </tr>
        {collection?.attributes.map((attr, index: number) => {
            const metadata = data && getSharedCaseMetadataFromDataset(data)
            if (!attr || metadata?.isHidden(attr.id) || !caseItem) return null
            return (
              <CaseAttrView
                key={attr.id}
                caseId={caseItem.__id__}
                collection={collection}
                attrId={attr.id}
                name={attr.name}
                value={values[index]}
                unit={attr.units}
                getDividerBounds={getDividerBounds}
                onSetContentElt={handleSetHeaderContentElt}
              />
            )
          })
        }
      </tbody>
    </table>
  )
})
