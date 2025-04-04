import React, { useCallback, useRef, useState } from "react"
import { observer } from "mobx-react-lite"
import { clsx } from "clsx"
import { useDataSetMetadata } from "../../hooks/use-data-set-metadata"
import { IValueType } from "../../models/data/attribute-types"
import { IGroupedCase } from "../../models/data/data-set-types"
import { ICollectionModel } from "../../models/data/collection"
import { getCollectionAttrs } from "../../models/data/data-set-utils"
import { AttributeHeader } from "../case-tile-common/attribute-header"
import { AttributeHeaderDivider } from "../case-tile-common/attribute-header-divider"
import { kIndexColumnKey } from "../case-tile-common/case-tile-types"
import { CaseAttrView } from "./case-attr-view"
import { useCaseCardModel } from "./use-case-card-model"

import "./case-attrs-view.scss"

interface ICaseAttrsViewProps {
  caseItem: IGroupedCase
  collection?: ICollectionModel
}

function getDividerBounds(containerBounds: DOMRect, cellBounds: DOMRect) {
  return {
    top: cellBounds.bottom - containerBounds.top,
    left: cellBounds.left - containerBounds.left,
    width: cellBounds.right - cellBounds.left,
    height: 6
  }
}

export const CaseAttrsView = observer(function CaseAttrsView({caseItem, collection}: ICaseAttrsViewProps) {
  const cardModel = useCaseCardModel()
  const caseMetadata = useDataSetMetadata()
  const data = cardModel?.data
  const displayValues = useCaseCardModel()?.displayValues
  const isCollectionSummarized = collection?.cases && collection.cases.length > 0 &&
                                 !!cardModel?.summarizedCollections.find(cid => cid === collection?.id)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const [, setCellElt] = useState<HTMLElement | null>(null)
  const summaryValues = displayValues && collection ? displayValues(collection, caseItem) : []
  const values: IValueType[] = collection?.attributes.map(attr => {
    return attr?.id && data?.getValue(caseItem?.__id__, attr.id)
  }) ?? []
  const handleSetHeaderContentElt = useCallback((contentElt: HTMLDivElement | null) => {
    contentRef.current = contentElt
    const _cellElt: HTMLElement | null = contentRef.current?.closest(".case-card-attr") ?? null
    setCellElt(_cellElt)
    return _cellElt
  }, [])

  const tableClassName = clsx("case-card-attrs", "fadeIn", {"summary-view": isCollectionSummarized})
  const attrs = collection ? getCollectionAttrs(collection, data) : []
  const visibleAttrs = attrs ? attrs.filter(attr => attr && !caseMetadata?.isHidden(attr.id)) : []
  return (
    <table className={tableClassName} data-testid="case-card-attrs">
      <tbody>
        <tr className="case-card-attr index-row">
          <td colSpan={2}>
            <AttributeHeader
              attributeId={kIndexColumnKey}
              getDividerBounds={getDividerBounds}
              HeaderDivider={AttributeHeaderDivider}
              showUnits={false}
              onSetHeaderContentElt={handleSetHeaderContentElt}
            />
          </td>
        </tr>
        {collection && visibleAttrs.map((attr, index: number) => {
            return (
              <CaseAttrView
                key={isCollectionSummarized ? `${attr.id}-summary` : attr.id}
                caseId={caseItem?.__id__}
                collection={collection}
                attrId={attr.id}
                name={attr.name}
                cellValue={isCollectionSummarized ? summaryValues[index] : values[index]}
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
