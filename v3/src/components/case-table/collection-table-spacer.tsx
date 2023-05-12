import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, { useMemo, useRef } from "react"
import { useCaseMetadata } from "../../hooks/use-case-metadata"
import { useCollectionContext, useParentCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { getDragAttributeId, useTileDroppable } from "../../hooks/use-drag-drop"
import { measureText } from "../../hooks/use-measure-text"
// import { getNumericCssconstiable } from "../../utilities/css-utils"
import t from "../../utilities/translation/translate"
import { ICaseTableModel } from "./case-table-model"
import { kChildMostTableCollectionId } from "./case-table-types"
import { useRows } from "./use-rows"

const kDividerWidth = 48,
      kRelationParentMargin = 12,
      kRelationChildMargin = 4,
      // The color of the lines bounding the relationship regions
      kRelationStrokeColor = '#808080', // middle gray
      // The color of the shaded area of the relationship regions
      kRelationFillColor = '#EEEEEE',   // pale gray
      kTouchMargin = 5

interface IProps {
  tableModel?: ICaseTableModel
  rowHeight: number
  onDrop?: (attrId: string) => void
}
export const CollectionTableSpacer = observer(function CollectionTableSpacer(props: IProps) {
  const { tableModel, rowHeight, onDrop } = props
  const data = useDataSetContext()
  const { rows } = useRows()
  const caseMetadata = useCaseMetadata()
  const parentCollection = useParentCollectionContext()
  const parentCollectionId = parentCollection?.id
  const childCollection = useCollectionContext()
  const childCollectionId = childCollection?.id || kChildMostTableCollectionId
  const parentMost = !parentCollection
  const { active, isOver, setNodeRef } = useTileDroppable(`new-collection-${childCollectionId}`, _active => {
    const dragAttributeID = getDragAttributeId(_active)
    dragAttributeID && onDrop?.(dragAttributeID)
  })
  const classes = clsx("collection-table-spacer", { active: !!getDragAttributeId(active), over: isOver, parentMost })
  const dropMessage = t("DG.CaseTableDropTarget.dropMessage")
  const dropMessageWidth = useMemo(() => measureText(dropMessage, "12px sans-serif"), [dropMessage])
  const parentGridRef = useRef<HTMLElement | null>(null)
  const childGridRef = useRef<HTMLElement | null>(null)
  const tableSpacerDivRef = useRef<HTMLElement | null>(null)
  const divHeight = tableSpacerDivRef.current?.getBoundingClientRect().height
  const kMargin = 10
  const msgStyle: React.CSSProperties =
    { bottom: divHeight && dropMessageWidth ? (divHeight - dropMessageWidth) / 2 - kMargin : undefined }
  const parentScrollTop = parentCollectionId && tableModel?.scrollTopMap.get(parentCollectionId) || 0
  const childScrollTop = childCollectionId && tableModel?.scrollTopMap.get(childCollectionId) || 0

  const handleRef = (element: HTMLElement | null) => {
    const tableContent = element?.closest(".case-table-content") ?? null

    if (parentCollection && tableContent) {
      parentGridRef.current = tableContent.querySelector(`.collection-${parentCollection.id} .rdg`) ?? null
    }
    if (childCollection && tableContent) {
      childGridRef.current = tableContent.querySelector(`.collection-${childCollection.id} .rdg`) ?? null
    }
    tableSpacerDivRef.current = element
    setNodeRef(element)
  }

  if (!data) return null

  // Keep for now in case of accessibility application (wider area of input)
  // function handleAreaClick(e: React.MouseEvent) {
  //   console.log('handleAreaClick')
  //   const parentGridBounds = parentGridRef.current?.getBoundingClientRect()
  //   const rowHeaderHeight = getNumericCssconstiable(parentGridRef.current, "--rdg-header-row-height") ?? 30
  //   const rowHeight = getNumericCssconstiable(parentGridRef.current, "--rdg-row-height") ?? 18
  //   // TODO: real buttons; handle scrolled table
  //   const clickedRow = Math.floor((e.clientY - (parentGridBounds?.top ?? 0) - rowHeaderHeight) / rowHeight)
  //   const cases = data && parentCollection ? data?.getCasesForCollection(parentCollection.id) : []
  //   const clickedCase = cases[clickedRow]
  //   if (caseMetadata && clickedCase) {
  //     const isCollapsed = caseMetadata.isCollapsed(clickedCase.__id__)
  //     caseMetadata.setIsCollapsed(clickedCase.__id__, !isCollapsed)
  //   }
  // }

  const parentCases = parentCollection ? data.getCasesForCollection(parentCollection.id) : []
  const everyCaseIsCollapsed = parentCases.every((value) => caseMetadata?.isCollapsed(value.__id__))

  function handleTopClick() {
    parentCases.forEach((value) => caseMetadata?.setIsCollapsed(value.__id__, !everyCaseIsCollapsed))
  }

  const topTooltipKey = `DG.CaseTable.dividerView.${everyCaseIsCollapsed ? 'expandAllTooltip' : 'collapseAllTooltip'}`
  const topButtonTooltip = t(topTooltipKey)
  const bottomsArr: number[] = []
  const getRowTop = (rowIndex: number) => rowIndex >= 1 ? rowIndex * rowHeight : 0
  const getPreviousBottoms = (idx: number) => idx > 0 ? bottomsArr[idx-1] : 0

  return (
    <>
      <div className="collection-table-spacer-divider" />
      <div className={classes} ref={handleRef}>
        <div className="spacer-top">
          {!parentMost && <ExpandCollapseButton isCollapsed={everyCaseIsCollapsed} onClick={handleTopClick}
            title={topButtonTooltip} />}
        </div>
        {!parentMost &&
            <div className="spacer-mid">
              <svg className="spacer-mid-layer lower-layer">
                {parentCases.map((parentCase, index) => {
                  const parentCaseId = parentCase.__id__
                  const numChildCases = data.pseudoCaseMap[parentCaseId]?.childPseudoCaseIds?.length ??
                                        data.pseudoCaseMap[parentCaseId]?.childCaseIds.length
                  const lastChildCaseOfParent = data.pseudoCaseMap[parentCaseId]?.childPseudoCaseIds
                                                  ? data.pseudoCaseMap[parentCaseId]?.childPseudoCaseIds?.slice(-1)
                                                  : data.pseudoCaseMap[parentCaseId]?.childCaseIds.slice(-1)
                  const rowOfLastChild = lastChildCaseOfParent &&
                                            rows.find(row => row.__id__ === lastChildCaseOfParent[0])
                  const rowIndexOfLastChild = rowOfLastChild && rows.indexOf(rowOfLastChild)
                  const rowBottom = rowIndexOfLastChild
                                      ? getRowTop(rowIndexOfLastChild + 1)
                                      : getPreviousBottoms(index) + rowHeight
                  bottomsArr.push(rowBottom)
                  return <CurvedSpline key={`${parentCaseId}-${index}`}
                                        y1={((index + 1) * rowHeight) - parentScrollTop}
                                        y2={rowBottom - childScrollTop}
                                        numChildCases={numChildCases}
                                        even={(index + 1) % 2 === 0}
                                        rowHeight={rowHeight}
                                        isCollapsed={caseMetadata?.isCollapsed(parentCaseId)}
                         />
                })}
              </svg>
              <div className="spacer-mid-layer">
                {parentCases.map((value, index) => (
                  <ExpandCollapseButton key={value.__id__} isCollapsed={!!caseMetadata?.isCollapsed(value.__id__)}
                    onClick={() => caseMetadata?.setIsCollapsed(value.__id__, !caseMetadata?.isCollapsed(value.__id__))}
                    styles={{ left: '3px', top: `${((index * rowHeight) - parentScrollTop) + 4}px`}}
                  />
                ))}
              </div>
            </div>
        }

        <div className="drop-message" style={msgStyle}>{isOver ? dropMessage : ""}</div>
      </div>
      <div className="collection-table-spacer-divider" />
    </>
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

interface CurvedSplineProps {
  y1: number;
  y2: number;
  numChildCases: number;
  even: boolean;
  rowHeight: number;
  isCollapsed: string | boolean | undefined;
}

function CurvedSpline({ y1, y2, numChildCases, even, rowHeight, isCollapsed }: CurvedSplineProps) {
  /**
    Builds the SVG path string which renders from the specified Y coordinate
    on the left table (iStartY) to the specified Y coordinate on the right
    table (iEndY). The path consists of a short horizontal segment (width
    specified by RDV_RELATION_MARGINs) on each side and a Bezier curve
    which connects them.
    @param    {Number}  iStartY   The Y coordinate on the left table where the path should start
    @param    {Number}  iEndY     The Y coordinate on the right table where the path should end
    @returns  {String}            The SVG path string
  */
    const buildPathStr = (iStartY: number, iEndY: number) => {
      // All we need is a horizontal line
      if (iStartY === iEndY) {
        return `M0, ${iStartY} h${kDividerWidth}`
      }
      // startPoint, endPoint, midPoint, controlPoint relate to the Bezier portion of the path
      const startPoint = { x: kRelationParentMargin, y: iStartY },
          endPoint = { x: kDividerWidth - kRelationChildMargin, y: iEndY },
          midPoint = { x: (startPoint.x + endPoint.x) / 2,
                        y: (startPoint.y + endPoint.y) / 2 },
          controlPoint = { x: midPoint.x, y: startPoint.y }
      // startPoint.y: Start point,
      // kRelationParentMargin: Horizontal segment,
      // controlPoint.x, controlPoint.y: Bezier control point,
      // midPoint.x, midPoint.y: Midpoint of curve (endpoint of first Bezier curve),
      // endPoint.x, endPoint.y: Endpoint of second Bezier curve (assumes reflected control point),
      // kRelationChildMargin: Horizontal segment
      // console.log("startPoint", startPoint, "endPoint", endPoint, "midPoint", midPoint, "controlPoint", controlPoint)
      // M0,${y1} H12 Q28,${y1},28,${y1 + 18} T44,${y2} H48

      return (
        `M0,${startPoint.y} h${kRelationParentMargin} Q${controlPoint.x},${controlPoint.y} ${midPoint.x},${midPoint.y}
          T${endPoint.x},${endPoint.y} h${kRelationChildMargin}`
      )
    }

    /**
      Builds the SVG path string which defines the boundary of the area to be
      shaded when shading the area between a parent row in the left table and
      its child rows in the right table. The area is bounded on the top and
      bottom by the same Bezier curves used to draw the paths and on the left
      and right by the edge of the corresponding table.
      @param    {Number}  iStartY1  The Y coordinate on the left table where the path should start
      @param    {Number}  iEndY1    The Y coordinate on the right table where the path should end
      @param    {Number}  iStartY2  The Y coordinate on the left table where the path should start
      @param    {Number}  iEndY2    The Y coordinate on the right table where the path should end
      @returns  {String}            The SVG path string
      */
    const  buildFillPathStr = (iStartY1: number, iEndY1: number, iStartY2: number, iEndY2: number) => {
          // startPoint, endPoint relate to the Bezier portion of the path
      const startPoint2 = { x: kRelationParentMargin, y: iStartY2 },
            endPoint2 = { x: kDividerWidth - kRelationChildMargin, y: iEndY2 },
            midPoint2 = { x: (startPoint2.x + endPoint2.x) / 2,
                          y: (startPoint2.y + endPoint2.y) / 2 },
            controlPoint2 = { x: midPoint2.x, y: endPoint2.y }
      // Use existing function for the first section buildPathStr( iStartY1, iEndY1),
      // vertical line (V) endPoint2.y,
      // horizontal line (h) - kRelationChildMargin,
      // Quadratic Bezier curve (Q) controlPoint2.x, controlPoint2.y,
      // Midpoint midPoint2.x, midPoint2.y,
      // Shorthand quadratic Bezier curve (T) (assumes reflected control point) startPoint2.x, startPoint2.y,
      // horizontal line (h) - kRelationParentMargin
      // close path (Z)
      return (
        `${buildPathStr(iStartY1, iEndY1)} V${endPoint2.y} h${- kRelationChildMargin} Q${controlPoint2.x},${controlPoint2.y} ${midPoint2.x},${midPoint2.y} T${startPoint2.x},${startPoint2.y} h${- kRelationParentMargin} Z`
      )
    }
  const collapsedCaseHeight = isCollapsed ? rowHeight : numChildCases * rowHeight
  const pathData = buildPathStr(y1, y2)
  const fillData = buildFillPathStr((y1 - rowHeight), y2 - collapsedCaseHeight, y1, y2 || rowHeight)
  return (
    even
      ? <>
          <path d={fillData} fill={kRelationFillColor} stroke ="none" />
          <path d={pathData} fill="none" stroke={kRelationStrokeColor} />
        </>
      : <path d={pathData} fill="none" stroke={kRelationStrokeColor} />
  )
}
// Adjust the initial movement
