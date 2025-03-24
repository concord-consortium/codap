import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, { useMemo, useRef } from "react"
import { useCaseMetadata } from "../../hooks/use-case-metadata"
import { useCollectionContext, useParentCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { getDragAttributeInfo, useTileDroppable } from "../../hooks/use-drag-drop"
import { measureText } from "../../hooks/use-measure-text"
import { useVisibleAttributes } from "../../hooks/use-visible-attributes"
import { logMessageWithReplacement } from "../../lib/log-message"
import { IDataSet } from "../../models/data/data-set"
import { isAnyChildSelected } from "../../models/data/data-set-utils"
import { getStringCssVariable } from "../../utilities/css-utils"
import { preventAttributeMove, preventCollectionReorg } from "../../utilities/plugin-utils"
import { t } from "../../utilities/translation/translate"
import { kInputRowKey } from "./case-table-types"
import { CurvedSplineFill } from "./curved-spline-fill"
import { CurvedSplineStroke } from "./curved-spline-stroke"
import { useCollectionTableModel } from "./use-collection-table-model"

const kRelationDefaultFillColor = "#ffffff" // white
// these stroke color defaults are only used if the grid's CSS variables are not set
const kRelationDefaultStrokeColor = "#ddd" // light gray
const kRelationSelectedStrokeColor = "#66afe9" // blue
const kRelationStrokeWidth = 1
const kRelationSelectedStrokeWidth = 3

interface IProps {
  gridElt?: HTMLDivElement | null
  onDrop?: (dataSet: IDataSet, attrId: string) => void
  onWhiteSpaceClick?: () => void
}
export const CollectionTableSpacer = observer(function CollectionTableSpacer({
  gridElt, onDrop, onWhiteSpaceClick
}: IProps) {
  const data = useDataSetContext()
  const caseMetadata = useCaseMetadata()
  const parentCollectionId = useParentCollectionContext()
  const parentCollection = parentCollectionId ? data?.getCollection(parentCollectionId) : undefined
  const parentTableModel = useCollectionTableModel(parentCollectionId)
  const visibleParentAttributes = useVisibleAttributes(parentCollectionId)
  const parentScrollTop = parentTableModel?.scrollTop ?? 0
  const childCollectionId = useCollectionContext()
  const childTableModel = useCollectionTableModel()
  const parentMost = !parentCollection
  const preventCollectionDrop = preventCollectionReorg(data, childCollectionId)
  const { active, isOver, setNodeRef } = useTileDroppable(`new-collection-${childCollectionId}`, _active => {
    if (!preventCollectionDrop) {
      const { dataSet, attributeId: dragAttributeID } = getDragAttributeInfo(_active) || {}
      if (preventAttributeMove(dataSet, dragAttributeID)) return
      dataSet && dragAttributeID && onDrop?.(dataSet, dragAttributeID)
    }
  })

  const dragAttributeInfo = getDragAttributeInfo(active)
  const preventAttributeDrag = preventAttributeMove(data, dragAttributeInfo?.attributeId)
  const preventDrop = preventAttributeDrag || preventCollectionDrop
  const isOverAndCanDrop = isOver && !preventDrop

  const classes = clsx("collection-table-spacer",
    { active: !!dragAttributeInfo && !preventDrop, over: isOverAndCanDrop, parentMost })
  const dropMessage = t("DG.CaseTableDropTarget.dropMessage")
  const dropMessageWidth = useMemo(() => measureText(dropMessage, "12px sans-serif"), [dropMessage])
  const tableSpacerDivRef = useRef<HTMLElement | null>(null)
  const divHeight = tableSpacerDivRef.current?.getBoundingClientRect().height
  const kMargin = 10
  const msgStyle: React.CSSProperties =
    { bottom: divHeight && dropMessageWidth ? (divHeight - dropMessageWidth) / 2 - kMargin : undefined }
  const parentCases = parentCollection ? data?.getCasesForCollection(parentCollection.id) : []
  const indexRanges = useMemo(() => {
    const _indexRanges = childTableModel?.parentIndexRanges ?? []

    // Add curve information for the parent input row
    if (_indexRanges && parentTableModel?.inputRowIndex != null) {
      const parentInputRowIndex = parentTableModel.inputRowIndex
      if (parentInputRowIndex >= 0 && parentInputRowIndex < _indexRanges.length) {
        const { firstChildIndex } = _indexRanges[parentInputRowIndex]
        _indexRanges.splice(parentInputRowIndex, 0, {
          id: kInputRowKey, firstChildIndex, lastChildIndex: firstChildIndex - 1
        })
      }
    }

    return _indexRanges
  }, [childTableModel?.parentIndexRanges, parentTableModel?.inputRowIndex])

  const handleRef = (element: HTMLElement | null) => {
    tableSpacerDivRef.current = element
    setNodeRef(element)
  }

  if (!data || !parentCases) return null

  const everyCaseIsCollapsed = parentCases.every((value) => caseMetadata?.isCollapsed(value.__id__))

  // Keep for now in case of accessibility application (wider area of input)
  // function handleAreaClick(e: React.MouseEvent) {
  //   const parentGridBounds = parentGridRef.current?.getBoundingClientRect()
  //   const rowHeaderHeight = getNumericCssVariable(parentGridRef.current, "--rdg-header-row-height") ?? 30
  //   const rowHeight = getNumericCssVariable(parentGridRef.current, "--rdg-row-height") ?? 18
  //   // TODO: real buttons; handle scrolled table
  //   const clickedRow = Math.floor((e.clientY - (parentGridBounds?.top ?? 0) - rowHeaderHeight) / rowHeight)
  //   const cases = data && parentCollection ? data?.getCasesForCollection(parentCollection.id) : []
  //   const clickedCase = cases[clickedRow]
  //   if (caseMetadata && clickedCase) {
  //     const isCollapsed = caseMetadata.isCollapsed(clickedCase.__id__)
  //     caseMetadata.setIsCollapsed(clickedCase.__id__, !isCollapsed)
  //   }
  // }

  function handleExpandCollapseAllClick() {
    caseMetadata?.applyModelChange(() => {
      parentCases?.forEach((value) => caseMetadata?.setIsCollapsed(value.__id__, !everyCaseIsCollapsed))
    }, {
      log: logMessageWithReplacement("%@ all",
              { state: everyCaseIsCollapsed ? "Expand" : "Collapse" }, "table"),
      undoStringKey: "DG.Undo.caseTable.groupToggleExpandCollapseAll",
      redoStringKey: "DG.Redo.caseTable.groupToggleExpandCollapseAll"
    })
  }

  function handleExpandCollapseClick(parentCaseId: string) {
    // collapse the parent case
    caseMetadata?.applyModelChange(() => {
      caseMetadata?.setIsCollapsed(parentCaseId, !caseMetadata?.isCollapsed(parentCaseId))
    }, {
      undoStringKey: "DG.Undo.caseTable.expandCollapseOneCase",
      redoStringKey: "DG.Redo.caseTable.expandCollapseOneCase",
      log: logMessageWithReplacement("%@ case %@",
              { state: caseMetadata?.isCollapsed(parentCaseId) ? "Expand" : "Collapse", parentCaseId}, "table")
    })
    // scroll to the first expanded/collapsed child case (if necessary)
    const parentCase = data?.caseInfoMap.get(parentCaseId)
    const firstChildId = parentCase?.childCaseIds?.[0] || parentCase?.childItemIds?.[0]
    const rowIndex = (firstChildId ? childTableModel?.getRowIndexOfCase(firstChildId) : -1) ?? -1
    ;(rowIndex >= 0) && childTableModel?.scrollRowIntoView(rowIndex)
  }

  function handleBackgroundClick() {
    onWhiteSpaceClick?.()
  }

  const topTooltipKey = `DG.CaseTable.dividerView.${everyCaseIsCollapsed ? 'expandAllTooltip' : 'collapseAllTooltip'}`
  const topButtonTooltip = t(topTooltipKey)
  const relationSelectedFillColor = getStringCssVariable(gridElt, "--rdg-row-selected-background-color") ||
                                      kRelationDefaultFillColor
  const relationDefaultStrokeColor = getStringCssVariable(gridElt, "--rdg-border-color") ||
                                      kRelationDefaultStrokeColor
  const relationSelectedStrokeColor = getStringCssVariable(gridElt, "--rdg-selection-color") ||
                                      kRelationSelectedStrokeColor

  return (
    <div className={classes} ref={handleRef} onClick={handleBackgroundClick}>
      {parentCollectionId && parentTableModel && childTableModel && visibleParentAttributes.length > 0 &&
        <>
          <div className="spacer-top">
            {<ExpandCollapseButton isCollapsed={everyCaseIsCollapsed || false} onClick={handleExpandCollapseAllClick}
              title={topButtonTooltip} />}
          </div>
          <div className="spacer-mid">
            <svg className="spacer-mid-layer lower-layer">
              {/* Draw all fills */}
              {indexRanges?.map(({ id: parentCaseId, firstChildIndex, lastChildIndex }, index) => {
                const isCaseSelected = data.isCaseSelected(parentCaseId)
                const fillColor = isCaseSelected ? relationSelectedFillColor : kRelationDefaultFillColor
                return (
                  <CurvedSplineFill
                    key={`fill-${parentCaseId}-${index}`}
                    prevY1={parentTableModel.getTopOfRowModuloScroll(index)}
                    y1={parentTableModel.getBottomOfRowModuloScroll(index)}
                    prevY2={childTableModel.getTopOfRowModuloScroll(firstChildIndex)}
                    y2={childTableModel.getBottomOfRowModuloScroll(lastChildIndex)}
                    even={(index + 1) % 2 === 0}
                    fillColor={fillColor}
                  />
                )
              })}
              {/* Draw all strokes */}
              {indexRanges.map(({ id: parentCaseId, firstChildIndex, lastChildIndex }, parentIndex) => {
                const nextParentCaseId = parentIndex < indexRanges.length ? indexRanges[parentIndex + 1]?.id : undefined
                const nextParentHasSelectedChild = !!nextParentCaseId && isAnyChildSelected(data, nextParentCaseId)
                const hasSelectedChild = isAnyChildSelected(data, parentCaseId)
                const strokeColor = hasSelectedChild || nextParentHasSelectedChild
                                      ? relationSelectedStrokeColor : relationDefaultStrokeColor
                const strokeWidth = hasSelectedChild !== nextParentHasSelectedChild
                                      ? kRelationSelectedStrokeWidth : kRelationStrokeWidth
                const y1Bottom = parentTableModel.getBottomOfRowModuloScroll(parentIndex)
                let y2Bottom = childTableModel.getBottomOfRowModuloScroll(lastChildIndex)
                if (hasSelectedChild && !nextParentHasSelectedChild) {
                  // subtract one so the thicker relation lines line up with the bottom border of the cells
                  --y2Bottom
                }
                return (
                  <>
                    {parentIndex === 0 && hasSelectedChild
                      ? <CurvedSplineStroke
                          key={`stroke-${parentCaseId}-top`}
                          y1={parentTableModel.getTopOfRowModuloScroll(parentIndex)}
                          y2={childTableModel.getTopOfRowModuloScroll(firstChildIndex)}
                          strokeColor={strokeColor}
                          strokeWidth={kRelationStrokeWidth}
                        />
                      : null}
                    <CurvedSplineStroke
                      key={`stroke-${parentCaseId}-${parentIndex}`}
                      y1={y1Bottom}
                      y2={y2Bottom}
                      strokeColor={strokeColor}
                      strokeWidth={strokeWidth}
                    />
                  </>
                )
              })}
            </svg>
            <div className="spacer-mid-layer">
              {indexRanges?.map(({ id }, index) => {
                if (id !== kInputRowKey) {
                  return <ExpandCollapseButton key={id} isCollapsed={!!caseMetadata?.isCollapsed(id)}
                    onClick={() => handleExpandCollapseClick(id)}
                    styles={{ left: '3px', top: `${((index * childTableModel.rowHeight) - parentScrollTop) + 4}px`}}
                  />
                }
              })}
            </div>
          </div>
        </>
      }

      <div className="drop-message" style={msgStyle}>{isOverAndCanDrop ? dropMessage : ""}</div>
    </div>
  )
})

interface ExpandCollapseButtonProps {
  isCollapsed: boolean,
  onClick: () => void,
  styles?: {
    left?: string,
    top?: string,
  },
  title?: string,
}

function ExpandCollapseButton({ isCollapsed, onClick, styles, title }: ExpandCollapseButtonProps) {
  const tooltipKey = `DG.CaseTable.dividerView.${isCollapsed ? "expandGroupTooltip" : "collapseGroupTooltip"}`
  const tooltip = title ?? t(tooltipKey)
  return (
    <button type="button" className="expand-collapse-button" onClick={onClick} style={styles}>
      <img className={`expand-collapse-image ${isCollapsed ? 'closed' : 'open'}`} title={tooltip} />
    </button>
  )
}
