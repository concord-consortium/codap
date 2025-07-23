import React, { useCallback, useRef, useState } from "react"
import { observer } from "mobx-react-lite"
import { clsx } from "clsx"
import { IGroupedCase } from "../../models/data/data-set-types"
import { ICollectionModel } from "../../models/data/collection"
import { getCollectionAttrs } from "../../models/data/data-set-utils"
import { AttributeHeader } from "../case-tile-common/attribute-header"
import { kIndexColumnKey } from "../case-tile-common/case-tile-types"
import { CaseAttrView } from "./case-attr-view"
import { useCaseCardModel } from "./use-case-card-model"

import "./case-attrs-view.scss"

interface ICaseAttrsViewProps {
  caseItem?: IGroupedCase
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

export const CaseAttrsView = observer(function CaseAttrsView({ caseItem, collection }: ICaseAttrsViewProps) {
  const cardModel = useCaseCardModel()
  const data = cardModel?.data
  const metadata = cardModel?.metadata
  const isCollectionSummarized = !!collection?.cases && collection.cases.length > 0 &&
                                 !!cardModel?.summarizedCollections.find(cid => cid === collection?.id)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const [, setCellElt] = useState<HTMLElement | null>(null)
  const handleSetHeaderContentElt = useCallback((contentElt: HTMLDivElement | null) => {
    contentRef.current = contentElt
    const _cellElt: HTMLElement | null = contentRef.current?.closest(".case-card-attr") ?? null
    setCellElt(_cellElt)
    return _cellElt
  }, [])

  const tableClassName = clsx("case-card-attrs", "fadeIn", {"summary-view": isCollectionSummarized})
  const attrs = collection ? getCollectionAttrs(collection, data) : []
  const visibleAttrs = attrs ? attrs.filter(attr => attr && !metadata?.isHidden(attr.id)) : []
  return (
    <table className={tableClassName} data-testid="case-card-attrs">
      <tbody>
        <tr className="case-card-attr index-row">
          <td colSpan={2}>
            <AttributeHeader
              attributeId={kIndexColumnKey}
              disableTooltip={true}
              draggable={false}
              getDividerBounds={getDividerBounds}
              showUnits={false}
              onSetHeaderContentElt={handleSetHeaderContentElt}
            />
          </td>
        </tr>
        {collection && visibleAttrs.map(attr => {
            return (
              <CaseAttrView
                key={`${attr.id}-${isCollectionSummarized ? "summary" : caseItem?.__id__}`}
                attr={attr}
                collection={collection}
                getDividerBounds={getDividerBounds}
                groupedCase={caseItem}
                isCollectionSummarized={isCollectionSummarized}
                onSetContentElt={handleSetHeaderContentElt}
              />
            )
          })
        }
      </tbody>
    </table>
  )
})
