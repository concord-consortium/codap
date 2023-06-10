import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useCaseMetadata } from "../../hooks/use-case-metadata"
import { useCollectionContext, useParentCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { getDragAttributeInfo, useTileDroppable } from "../../hooks/use-drag-drop"
import { measureText } from "../../hooks/use-measure-text"
import { IDataSet } from "../../models/data/data-set"
// import { getNumericCssVariable } from "../../utilities/css-utils"
import t from "../../utilities/translation/translate"
import { kChildMostTableCollectionId, TRow } from "./case-table-types"
import { useCaseTableModel } from "./use-case-table-model"
import { useRowScrolling } from "./use-row-scrolling"
import styles from "./case-table-shared.scss"

const kDividerWidth = 48,
      kRelationParentMargin = 12,
      kRelationChildMargin = 4,
      // The color of the lines bounding the relationship regions
      kRelationStrokeColor = '#808080', // middle gray
      // The color of the shaded area of the relationship regions
      kRelationFillColor = '#EEEEEE'    // pale gray

interface IProps {
  rows: TRow[]
  rowHeight: number
  onDrop?: (dataSet: IDataSet, attrId: string) => void
}
export const CollectionTableSpacer = observer(function CollectionTableSpacer(props: IProps) {
  const { rows, rowHeight, onDrop } = props
  const tableModel = useCaseTableModel()
  const data = useDataSetContext()
  const caseMetadata = useCaseMetadata()
  const parentCollection = useParentCollectionContext()
  const parentCollectionId = parentCollection?.id
  const childCollection = useCollectionContext()
  const childCollectionId = childCollection?.id || kChildMostTableCollectionId
  const parentMost = !parentCollection
  const { active, isOver, setNodeRef } = useTileDroppable(`new-collection-${childCollectionId}`, _active => {
    const { dataSet, attributeId: dragAttributeID } = getDragAttributeInfo(_active) || {}
    dataSet && dragAttributeID && onDrop?.(dataSet, dragAttributeID)
  })
  const classes = clsx("collection-table-spacer", { active: !!getDragAttributeInfo(active), over: isOver, parentMost })
  const dropMessage = t("DG.CaseTableDropTarget.dropMessage")
  const dropMessageWidth = useMemo(() => measureText(dropMessage, "12px sans-serif"), [dropMessage])
  const parentGridRef = useRef<HTMLDivElement | null>(null)
  const childGridRef = useRef<HTMLDivElement | null>(null)
  const tableSpacerDivRef = useRef<HTMLElement | null>(null)
  const divHeight = tableSpacerDivRef.current?.getBoundingClientRect().height
  const childGridHeight = childGridRef.current?.clientHeight
  const { scrollRowToTop } = useRowScrolling(childGridRef.current)
  const kMargin = 10
  const msgStyle: React.CSSProperties =
    { bottom: divHeight && dropMessageWidth ? (divHeight - dropMessageWidth) / 2 - kMargin : undefined }
  const parentScrollTop = parentCollectionId && tableModel?.scrollTopMap.get(parentCollectionId) || 0
  const childScrollTop = childCollectionId && tableModel?.scrollTopMap.get(childCollectionId) || 0
  const isParentScrollable = parentGridRef.current &&
                              (parentGridRef.current.scrollHeight > parentGridRef.current.clientHeight)
  const isChildScrollable = childGridRef.current &&
                              (childGridRef.current.scrollHeight > childGridRef.current.clientHeight)
  // console.log("parentGridRef.current.scrollHeight ", parentGridRef.current?.scrollHeight)
  // console.log("childGridRef.current.scrollHeight ", childGridRef.current?.scrollHeight)
  const parentCases = parentCollection ? data?.getCasesForCollection(parentCollection.id) : []
  const bottomsOfLastChildRowOfParent: number[] = []
  const parentToChildrenMap: Record<string, string[] | undefined> = {}
  const parentToChildrenRowIndicesMap: Record<string, number[]> = {}
  const [childY, setChildY] = useState(childGridRef.current?.scrollTop)
  const [parentY, setParentY] = useState(parentGridRef.current?.scrollTop)
  let numTotalChildCases = 0

  // Creates a map of parent to children row indices, and creates an array of row bottoms for each parent
  const getPrevRowBottom = (idx: number) => {
    if (idx > 0 && bottomsOfLastChildRowOfParent[idx-1] >= 0)  { return bottomsOfLastChildRowOfParent[idx-1] }
    else if (idx > 0)  { return bottomsOfLastChildRowOfParent[idx-1] - childScrollTop }
    else if (idx === 0 && isChildScrollable) { return -childScrollTop }
    else { return 0 }
  }

  parentCases?.map((parentCase, index: number) => {
    const childrenIndicesArr: number[] = []
    const parentCaseId = parentCase.__id__
    const parentCaseGroup = data?.pseudoCaseMap[parentCaseId]
    parentToChildrenMap[parentCaseId] = parentCaseGroup?.childPseudoCaseIds || parentCaseGroup?.childCaseIds
    parentToChildrenMap[parentCaseId]?.forEach((child) => {
      const childRow = rows.find(row => row.__id__ === child)
      childRow && childrenIndicesArr.push(rows.indexOf(childRow))
    })
    const lastChildCaseOfParent = parentCaseGroup?.childPseudoCaseIds?.at(-1) ||
                                    parentCaseGroup?.childCaseIds.at(-1)
    const rowOfLastChild = lastChildCaseOfParent &&
                              rows.find(row => row.__id__ === lastChildCaseOfParent)
    const rowIndexOfLastChild = rowOfLastChild && rows.indexOf(rowOfLastChild)
    const rowBottom = rowIndexOfLastChild
                        ? ((rowIndexOfLastChild + 1) * rowHeight) - childScrollTop
                        : getPrevRowBottom(index) + rowHeight
    bottomsOfLastChildRowOfParent.push(rowBottom)
    parentToChildrenRowIndicesMap[parentCaseId] = childrenIndicesArr
    numTotalChildCases = numTotalChildCases + childrenIndicesArr.length
  })

  const handleChildScroll = useCallback(() => {
    console.log("in handleChildScroll")
    const getParent = (topChildCaseId: string) => {
      const topChildRow = rows.find(row => row.__id__ === topChildCaseId)
      console.log("topChildRow", topChildRow)
    }

    if (childY != null && childGridRef.current?.scrollTop) {
      const childCaseIndexAtTop = Math.round(childY/rowHeight)
      const childAtTop = rows[childCaseIndexAtTop]
      const childIdAtTop = childAtTop?.__id__
      const calcBottomChildCaseIndex = Math.floor(
        Math.max(0, Math.min((childY - rowHeight + childGridRef.current?.clientHeight)/rowHeight, childGridRef.current?.clientHeight))) - 1
      const childCaseIndexAtBottom = numTotalChildCases > calcBottomChildCaseIndex ? calcBottomChildCaseIndex : numTotalChildCases - 1
      const childCaseVisibleRange = childCaseIndexAtBottom - childCaseIndexAtTop
    }


      // if (childY != null && childGridRef.current?.scrollTop) {
      //   // console.log("in if handleChildScroll childY", childY, childGridRef.current?.scrollTop)
      //   if (childY > childGridRef.current?.scrollTop) {
      //     // console.log("scrolling up")
      //     // setScrollDirection("up")
      //   } else if (childY < childGridRef.current?.scrollTop) {
      //     // console.log("scrolling down")
      //     // setScrollDirection("down")
      //   }
      //   setChildY(childGridRef.current?.scrollTop)
      // }
    }, [childY]
  )
  // console.log("rows", rows)
  // console.log("bottomsOfLastChildRowOfParent", bottomsOfLastChildRowOfParent)
  const handleParentScroll = useCallback(() => {

    if (parentY != null && parentGridRef.current?.scrollTop && parentCases) {
      const parentCaseIndexAtTop = Math.floor(parentY/rowHeight)
      const parentAtTop = parentCases[parentCaseIndexAtTop]
      const parentIdAtTop = parentAtTop?.__id__
      const topChildRowId = parentIdAtTop && parentToChildrenMap[parentIdAtTop]?.at(0)
      const topChildRow = rows.find(row => row.__id__ === topChildRowId)
      const topChildRowIndex = topChildRow && rows.indexOf(topChildRow)
      // const parentCaseIndexAtBottom = Math.floor((parentY - rowHeight + parentGridRef.current?.clientHeight)/rowHeight)
      // const calcBottomParentCaseIndex = Math.ceil(
      //   Math.max(0, Math.min((parentY - rowHeight + parentGridRef.current?.clientHeight)/rowHeight, parentGridRef.current?.clientHeight))) - 1
      const calcBottomParentCaseIndex = Math.ceil((parentGridRef.current.scrollTop + parentGridRef.current.clientHeight)/rowHeight)
      const parentCaseIndexAtBottom = parentCases.length > calcBottomParentCaseIndex ? calcBottomParentCaseIndex : parentCases.length - 1
      const parentIdAtBottom = parentCases?.[parentCaseIndexAtBottom].__id__
      // console.log("parentCases?.[parentCaseIndexAtBottom]", parentCases?.[parentCaseIndexAtBottom])
      const bottomChildRowId = parentIdAtBottom && parentToChildrenMap[parentIdAtBottom]?.at(-1)
      const bottomChildRow = rows.find(row => row.__id__ === bottomChildRowId)
      const bottomChildRowIndex = bottomChildRow && rows.indexOf(bottomChildRow)
      // console.log("parentCaseIndexAtBottom", parentCaseIndexAtBottom)
      const currentChildCaseIndexAtTop: number | undefined = childY && Math.round(childY/rowHeight)
      const calcChildCaseIndexAtBottom = (childY && childGridHeight) && Math.floor(
        Math.max(0, Math.min((childY - rowHeight + childGridHeight)/rowHeight, childGridHeight)))
      const currentChildCaseIndexAtBottom = calcChildCaseIndexAtBottom &&
          (numTotalChildCases > calcChildCaseIndexAtBottom) ? calcChildCaseIndexAtBottom : numTotalChildCases - 1
      // console.log("calcChildCaseIndexAtBottom", calcChildCaseIndexAtBottom, "numTotalChildCases", numTotalChildCases)
      const indexRange = parentCaseIndexAtBottom - parentCaseIndexAtTop -1

      const getChildCollectionRange = (topParentId: string) => {
        const children = parentToChildrenMap[topParentId]
        const firstChildIdOfParent = children?.[0]
        const firstChildRowOfParent = rows.find(row => row.__id__ === firstChildIdOfParent)
        const firstChildRowIndexOfParent = firstChildRowOfParent && rows.indexOf(firstChildRowOfParent)
        const lastChildIdOfParent = children?.at(-1)
        const lastChildRowOfParent = rows.find(row => row.__id__ === lastChildIdOfParent)
        const lastChildRowIndexOfParent = lastChildRowOfParent && rows.indexOf(lastChildRowOfParent)
        // console.log("lastChildRowIndexOfParent", lastChildRowIndexOfParent)

        let range
        if (firstChildRowIndexOfParent !== undefined && caseMetadata?.isCollapsed(topParentId)) {
          range = {first: firstChildRowIndexOfParent, last: firstChildRowIndexOfParent}
        } else if (firstChildRowIndexOfParent !== undefined) {
          range = {first: (firstChildRowIndexOfParent - 1), last: lastChildRowIndexOfParent}
        }
        // console.log("range", range)
        return range
      }

      const topChildRange = parentIdAtTop && getChildCollectionRange(parentIdAtTop)
      const bottomChildRange = parentIdAtBottom && getChildCollectionRange(parentIdAtBottom)
        // console.log("bottomChildRange", bottomChildRange, bottomChildRowIndex)
      if (!!topChildRange && currentChildCaseIndexAtTop != null) {
        // console.log("in if topChildRange")
        if (topChildRange.first && (topChildRange.first > currentChildCaseIndexAtTop)) {
          scrollRowToTop(topChildRange.first)
        }
      } else {
          // console.log("in else", !!bottomChildRange, currentChildCaseIndexAtBottom)
          if (!!bottomChildRange && currentChildCaseIndexAtBottom != null) {
          // console.log("in if bottomChildRange.last", bottomChildRange.last)
          if ((bottomChildRange.last && indexRange) && (bottomChildRange.last < currentChildCaseIndexAtBottom)) {
            // console.log("in if ", bottomChildRange.last, currentChildCaseIndexAtBottom)
            scrollRowToTop(bottomChildRange.last - indexRange)
          }
          }
      }

      // console.log("in if handleParentScroll parentY", parentY, parentGridRef.current?.scrollTop)
      // if (parentY > parentGridRef.current?.scrollTop) {
      //   console.log("parent scrolling up")
      //   // console.log("parentGridRef.current?.clientHeight", parentGridRef.current?.clientHeight)
      //   const parentCaseIndexAtBottom = Math.floor((parentY - rowHeight + parentGridRef.current?.clientHeight)/rowHeight)
      //   // console.log("parentCaseIndexAtBottom", parentCaseIndexAtBottom)
      //   // console.log("parentCaseAtBottom", parentCases?.[parentCaseIndexAtBottom])
      //   const parentIdAtBottom = parentCases?.[parentCaseIndexAtBottom-1].__id__
      //   const bottomChildRowId = parentIdAtBottom && parentToChildrenMap[parentIdAtBottom]?.at(-1)
      //   const bottomChildRow = rows.find(row => row.__id__ === bottomChildRowId)
      //   const bottomChildRowIndex = bottomChildRow && rows.indexOf(bottomChildRow)
      //   console.log("bottomChildRow", bottomChildRow, "bottomChildRowIndex", bottomChildRowIndex)
      //   if (childGridRef.current && bottomChildRowIndex != null) {
      //     childGridRef.current.scrollTop =
      //       (bottomChildRowIndex * rowHeight) - (childGridRef.current?.clientHeight - +styles.headerRowHeight - rowHeight)
      //   }
      // } else if (parentY < parentGridRef.current?.scrollTop) {
      //   console.log("parent scrolling down")
      //   const parentCaseIndexAtTop = Math.round(parentY/rowHeight)
      //   const parentIdAtTop = parentCases?.[parentCaseIndexAtTop].__id__
      //   const topChildRowId = parentIdAtTop && parentToChildrenMap[parentIdAtTop]?.at(0)
      //   const topChildRow = rows.find(row => row.__id__ === topChildRowId)
      //   const topChildRowIndex = topChildRow && rows.indexOf(topChildRow)
      //   if (childGridRef.current && topChildRowIndex != null) {
      //     // scrollRowToTop(topChildRowIndex - 1)
      //     childGridRef.current.scrollTop = topChildRowIndex * rowHeight
      //   }
      // }
      // setParentY(parentGridRef.current?.scrollTop)
    }
  }, [parentY, parentCases, rowHeight]
)

  useEffect(() => {
    setChildY(childGridRef.current?.scrollTop)
    setParentY(parentGridRef.current?.scrollTop)
    childGridRef.current?.addEventListener("scroll", handleChildScroll)
    parentGridRef.current?.addEventListener("scroll", handleParentScroll)
    return () => {
      childGridRef.current?.removeEventListener("scroll", handleChildScroll)
      parentGridRef.current?.addEventListener("scroll", handleParentScroll)
    }
  }, [handleChildScroll, handleParentScroll, parentCollectionId])

  // const getPrevRowBottom = (idx: number) => {
  //   if (idx > 0 && bottomsOfLastChildRowOfParent[idx-1] >= 0)  { return bottomsOfLastChildRowOfParent[idx-1] }
  //   else if (idx > 0)  { return bottomsOfLastChildRowOfParent[idx-1] - childScrollTop }
  //   else if (idx === 0 && isChildScrollable) { return -childScrollTop }
  //   else { return 0 }
  // }
  // const parentRange = parentGridRef.current && getVisibleRange(parentGridRef.current)
  // const firstVisibleParentIndex = parentRange && Math.round(parentRange[0]/rowHeight)
  // const lastVisibleParentIndex = parentRange && Math.floor(parentRange[1]/rowHeight)
  // // firstVisibleParentIndex && console.log("firstVisibleParentIndex", firstVisibleParentIndex,parentCases?.[firstVisibleParentIndex])
  // // lastVisibleParentIndex && console.log("lastVisibleParentIndex", lastVisibleParentIndex,parentCases?.[lastVisibleParentIndex])
  // // Creates a map of parent to children row indices, and creates an array of row bottoms for each parent
  // parentCases?.map((parentCase, index: number) => {
  //   const childrenIndicesArr: number[] = []
  //   const parentCaseId = parentCase.__id__
  //   const parentCaseGroup = data?.pseudoCaseMap[parentCaseId]
  //   parentToChildrenMap[parentCaseId] = parentCaseGroup?.childPseudoCaseIds || parentCaseGroup?.childCaseIds
  //   parentToChildrenMap[parentCaseId]?.forEach((child) => {
  //     const childRow = rows.find(row => row.__id__ === child)
  //     childRow && childrenIndicesArr.push(rows.indexOf(childRow))
  //   })
  //   const lastChildCaseOfParent = parentCaseGroup?.childPseudoCaseIds?.at(-1) ||
  //                                   parentCaseGroup?.childCaseIds.at(-1)
  //   const rowOfLastChild = lastChildCaseOfParent &&
  //                             rows.find(row => row.__id__ === lastChildCaseOfParent)
  //   const rowIndexOfLastChild = rowOfLastChild && rows.indexOf(rowOfLastChild)
  //   const rowBottom = rowIndexOfLastChild
  //                       ? ((rowIndexOfLastChild + 1) * rowHeight) - childScrollTop
  //                       : getPrevRowBottom(index) + rowHeight
  //   bottomsOfLastChildRowOfParent.push(rowBottom)
  // })

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

  if (!data || !parentCases) return null

  const everyCaseIsCollapsed = parentCases.every((value) => caseMetadata?.isCollapsed(value.__id__))

  // Keep for now in case of accessibility application (wider area of input)
  // function handleAreaClick(e: React.MouseEvent) {
  //   console.log('handleAreaClick')
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

  function handleTopClick() {
    parentCases?.forEach((value) => caseMetadata?.setIsCollapsed(value.__id__, !everyCaseIsCollapsed))
  }

  const topTooltipKey = `DG.CaseTable.dividerView.${everyCaseIsCollapsed ? 'expandAllTooltip' : 'collapseAllTooltip'}`
  const topButtonTooltip = t(topTooltipKey)

  return (
    <div className="collection-table-spacer">
      <div className="collection-table-spacer-divider" />
      <div className={classes} ref={handleRef}>
        <div className="spacer-top">
          {!parentMost && <ExpandCollapseButton isCollapsed={everyCaseIsCollapsed || false} onClick={handleTopClick}
            title={topButtonTooltip} />}
        </div>
        {!parentMost &&
            <div className="spacer-mid">
              <svg className="spacer-mid-layer lower-layer">
                {parentCases?.map((parentCase, index) => {
                  const parentCaseId = parentCase.__id__
                  return <CurvedSpline key={`${parentCaseId}-${index}`}
                                        y1={((index + 1) * rowHeight) - parentScrollTop}
                                        y2={bottomsOfLastChildRowOfParent[index]}
                                        even={(index + 1) % 2 === 0}
                                        rowHeight={rowHeight}
                                        prevRowBottom={bottomsOfLastChildRowOfParent[index-1]}
                         />
                })}
              </svg>
              <div className="spacer-mid-layer">
                {parentCases?.map((value, index) => (
                  <ExpandCollapseButton key={value.__id__} isCollapsed={!!caseMetadata?.isCollapsed(value.__id__)}
                    onClick={() => caseMetadata?.setIsCollapsed(value.__id__, !caseMetadata?.isCollapsed(value.__id__))}
                    expandCollapseStyle={{ left: '3px', top: `${((index * rowHeight) - parentScrollTop) + 4}px`}}
                  />
                ))}
              </div>
            </div>
        }

        <div className="drop-message" style={msgStyle}>{isOver ? dropMessage : ""}</div>
      </div>
      <div className="collection-table-spacer-divider" />
    </div>
  )
})

interface ExpandCollapseButtonProps {
  isCollapsed: boolean,
  onClick: () => void,
  expandCollapseStyle?: {
    left?: string,
    top?: string,
  },
  title?: string,
}

function ExpandCollapseButton({ isCollapsed, onClick, expandCollapseStyle, title }: ExpandCollapseButtonProps) {
  const tooltipKey = `DG.CaseTable.dividerView.${isCollapsed ? "expandGroupTooltip" : "collapseGroupTooltip"}`
  const tooltip = title ?? t(tooltipKey)
  return (
    <button type="button" className="expand-collapse-button" onClick={onClick} style={expandCollapseStyle}>
      <img className={`expand-collapse-image ${isCollapsed ? 'closed' : 'open'}`} title={tooltip} />
    </button>
  )
}

interface CurvedSplineProps {
  y1: number;
  y2: number;
  even: boolean;
  rowHeight: number;
  prevRowBottom: number
}

function CurvedSpline({ y1, y2, even, rowHeight, prevRowBottom }: CurvedSplineProps) {
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
        // eslint-disable-next-line max-len
        `${buildPathStr(iStartY1, iEndY1)} V${endPoint2.y} h${- kRelationChildMargin} Q${controlPoint2.x},${controlPoint2.y} ${midPoint2.x},${midPoint2.y} T${startPoint2.x},${startPoint2.y} h${- kRelationParentMargin} Z`
      )
    }

  const pathData = buildPathStr(y1, y2)
  const fillData = buildFillPathStr((y1 - rowHeight), prevRowBottom, y1, y2)
  return (
    even
      ? <>
          <path d={fillData} fill={kRelationFillColor} stroke ="none" />
          <path d={pathData} fill="none" stroke={kRelationStrokeColor} />
        </>
      : <path d={pathData} fill="none" stroke={kRelationStrokeColor} />
  )
}
