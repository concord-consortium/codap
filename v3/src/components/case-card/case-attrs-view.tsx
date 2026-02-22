import React, { useCallback, useMemo, useRef, useState } from "react"
import { observer } from "mobx-react-lite"
import { clsx } from "clsx"
import { useResizeDetector } from "react-resize-detector"
import { IAttribute } from "../../models/data/attribute"
import { IGroupedCase } from "../../models/data/data-set-types"
import { ICollectionModel } from "../../models/data/collection"
import { getCollectionAttrs } from "../../models/data/data-set-utils"
import { AttributeHeader } from "../case-tile-common/attribute-header"
import { kIndexColumnKey } from "../case-tile-common/case-tile-types"
import { If } from "../common/if"
import { ICaseCardModel } from "./case-card-model"
import { CaseAttrView } from "./case-attr-view"
import { ColumnResizeHandle } from "./column-resize-handle"
import { useCaseCardModel } from "./use-case-card-model"

import "./case-attrs-view.scss"

const kDefaultColumnWidthPct = 0.5
const kMinColumnWidth = 60
// Must match $margin-left and $xMarginOffset in case-attrs-view.scss
const kTableMarginLeft = 5
const kTableMarginOffset = 10

interface ICaseAttrsViewProps {
  caseItem?: IGroupedCase
  collection?: ICollectionModel
  onResizeColumn?: (collectionId: string, widthPct: number, isComplete?: boolean) => void
}

function getDividerBounds(containerBounds: DOMRect, cellBounds: DOMRect) {
  return {
    top: cellBounds.bottom - containerBounds.top,
    left: cellBounds.left - containerBounds.left,
    width: cellBounds.right - cellBounds.left,
    height: 6
  }
}

function getVisibleAttrs(collection?: ICollectionModel, model?: ICaseCardModel): IAttribute[] {
  const attrs = collection ? getCollectionAttrs(collection, model?.data) : []
  return attrs ? attrs.filter(attr => attr && !model?.metadata?.isHidden(attr.id)) : []
}

function getEditableAttrs(collection?: ICollectionModel, model?: ICaseCardModel): IAttribute[] {
  const visibleAttrs = getVisibleAttrs(collection, model)
  return visibleAttrs.filter(attr => !model?.metadata || model.metadata.isEditable(attr.id))
}

function getPrevAttrId(attrs: readonly IAttribute[], currentAttrId: string): Maybe<string> {
  for (let i = 1; i < attrs.length; i++) {
    const prevAttr = attrs[i - 1]
    const thisAttr = attrs[i]
    if (thisAttr.id === currentAttrId) {
      return prevAttr.id
    }
  }
}

function getNextAttrId(attrs: readonly IAttribute[], currentAttrId: string): Maybe<string> {
  for (let i = 1; i < attrs.length; i++) {
    const prevAttr = attrs[i - 1]
    const thisAttr = attrs[i]
    if (prevAttr.id === currentAttrId) {
      return thisAttr.id
    }
  }
}

export const CaseAttrsView = observer(function CaseAttrsView(
  { caseItem, collection, onResizeColumn }: ICaseAttrsViewProps
) {
  const cardModel = useCaseCardModel()
  const isCollectionSummarized = !!collection?.cases && collection.cases.length > 0 &&
                                 !!cardModel?.summarizedCollections.has(collection.id)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const [, setCellElt] = useState<HTMLElement | null>(null)
  // map from attrId => function to begin editing the cell with that attrId
  const beginEditingFns = useMemo<Map<string, () => void>>(() => new Map(), [])

  // Track live resize width during drag (percentage, 0-1)
  const [liveResizeWidthPct, setLiveResizeWidthPct] = useState<number | undefined>(undefined)

  const { width: containerWidth, ref: resizeRef } = useResizeDetector()

  const collectionId = collection?.id ?? ""
  const modelWidthPct = cardModel?.attributeColumnWidth(collectionId)
  const columnWidthPct = liveResizeWidthPct ?? modelWidthPct ?? kDefaultColumnWidthPct

  const handleSetBeginEditingFn = useCallback((attrId: string, beginEditingFn: () => void) => {
    beginEditingFns.set(attrId, beginEditingFn)
  }, [beginEditingFns])

  const handleSetHeaderContentElt = useCallback((contentElt: HTMLDivElement | null) => {
    contentRef.current = contentElt
    const _cellElt: HTMLElement | null = contentRef.current?.closest(".case-card-attr") ?? null
    setCellElt(_cellElt)
    return _cellElt
  }, [])

  const handleAttrKeyDown = useCallback((event: React.KeyboardEvent, attrId: string) => {
    // Enter key or up/down arrows in editable cell moves to next or previous editable cell
    if (cardModel && collection && ["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) {
      const isUp = event.key === "ArrowUp" || (event.key === "Enter" && event.shiftKey)
      const editableAttrs = getEditableAttrs(collection, cardModel)
      const nextAttrId = isUp
                          ? getPrevAttrId(editableAttrs, attrId)
                          : getNextAttrId(editableAttrs, attrId)
      if (nextAttrId) {
        // wait until current event has been fully processed before editing the next cell
        setTimeout(() => beginEditingFns.get(nextAttrId)?.())
      }
    }
  }, [beginEditingFns, cardModel, collection])

  const handleResize = useCallback((newWidthPx: number, isComplete?: boolean) => {
    if (!containerWidth) return
    const tableWidth = containerWidth - kTableMarginOffset
    const newPct = (newWidthPx - kTableMarginLeft) / tableWidth
    if (isComplete) {
      setLiveResizeWidthPct(undefined)
      onResizeColumn?.(collectionId, newPct, true)
    } else {
      setLiveResizeWidthPct(newPct)
    }
  }, [collectionId, containerWidth, onResizeColumn])

  const tableClassName = clsx("case-card-attrs", "fadeIn", {"summary-view": isCollectionSummarized})
  const visibleAttrs = getVisibleAttrs(collection, cardModel)
  const tableWidth = (containerWidth ?? 0) - kTableMarginOffset
  const resizeWidthPx = kTableMarginLeft + tableWidth * columnWidthPct
  const colWidthStyle = `${(columnWidthPct * 100).toFixed(1)}%`

  return (
    <div className="case-card-attrs-wrapper" ref={resizeRef}>
      <table className={tableClassName} data-testid="case-card-attrs">
        <colgroup>
          <col style={{ width: colWidthStyle }} />
          <col />
        </colgroup>
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
                  onAttrKeyDown={handleAttrKeyDown}
                  onSetContentElt={handleSetHeaderContentElt}
                  onSetBeginEditingFn={handleSetBeginEditingFn}
                />
              )
            })
          }
        </tbody>
      </table>
      <If condition={containerWidth != null && containerWidth > 0}>
        <ColumnResizeHandle
          resizeWidth={resizeWidthPx}
          minLeft={kTableMarginLeft + kMinColumnWidth}
          maxLeft={kTableMarginLeft + tableWidth - kMinColumnWidth}
          onResize={handleResize}
        />
      </If>
    </div>
  )
})
