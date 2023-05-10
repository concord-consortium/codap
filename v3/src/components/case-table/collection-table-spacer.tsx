import { clsx } from "clsx"
import React, { useMemo, useRef } from "react"
import { useCaseMetadata } from "../../hooks/use-case-metadata"
import { useCollectionContext, useParentCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { getDragAttributeId, useTileDroppable } from "../../hooks/use-drag-drop"
import { measureText } from "../../hooks/use-measure-text"
// import { getNumericCssconstiable } from "../../utilities/css-utils"
import t from "../../utilities/translation/translate"
import { kChildMostTableCollectionId } from "./case-table-types"
import { getVisibleRange } from "./use-row-scrolling"
import { useRows } from "./use-rows"

const kDividerWidth = 48,
      kRelationParentMargin = 12,
      kRelationChildMargin = 4,
      kExpandCollapseIconSize = { width: 9, height: 9 },
      // The color of the lines bounding the relationship regions
      kRelationStrokeColor = '#808080', // middle gray
      // The color of the shaded area of the relationship regions
      kRelationFillColor = '#EEEEEE',   // pale gray
      kTouchMargin = 5

type ChildRange = {firstChildID: string, lastChildID: string, isCollapsed: boolean}

interface IProps {
  rowHeight: number
  onDrop?: (attrId: string) => void
}
export function CollectionTableSpacer({ rowHeight, onDrop }: IProps) {
  const data = useDataSetContext()
  const caseMetadata = useCaseMetadata()
  const parentCollection = useParentCollectionContext()
  const childCollection = useCollectionContext()
  const childCollectionId = childCollection?.id || kChildMostTableCollectionId
  const parentMost = !parentCollection
  const { active, isOver, setNodeRef } = useTileDroppable(`new-collection-${childCollectionId}`, _active => {
    const dragAttributeID = getDragAttributeId(_active)
    dragAttributeID && onDrop?.(dragAttributeID)
  })
  // console.log("parentCollection", parentCollection)
  // console.log("childCollection", childCollection)

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

  // console.log("parentGridRef.current", parentGridRef.current?.scrollTop)
  // console.log("childGridRef.current", childGridRef.current?.scrollTop)
  const parentVisibleRange = parentGridRef.current && getVisibleRange(parentGridRef.current as HTMLDivElement)
  const childVisibleRange = childGridRef.current && getVisibleRange(childGridRef.current as HTMLDivElement)
  // console.log("parentVisibleRange", parentVisibleRange)
  // console.log("childVisibleRange", childVisibleRange)
  const { rows } = useRows()
  // console.log("rows", rows)

  // const [rowTop, rowBottom] = getRowRange(rowIndex)

  // const parentViewPort = parentGridRef.current && useRowScrolling(parentGridRef.current as HTMLDivElement)
  // const childViewPort = childGridRef.current && useRowScrolling(childGridRef.current as HTMLDivElement)
  // console.log("parentViewPort", parentViewPort)

  if (!data) return null

  const parentScrollTop = (parentGridRef.current?.scrollTop) || 0,
        // rightAdapter = childCollection && childCollection.get('gridAdapter'),
        childScrollTop = (childGridRef && childGridRef.current?.scrollTop) || 0
        // leftAdapter = parentCollection && parentCollection.get('gridAdapter'),

  // const updateParentChildRelations = (ix: number, iParentRow: number, iParentID: string, iChildIDRange: ChildRange) => {
  //   // const isRightCollapsed = iChildIDRange.isCollapsed || iChildIDRange.isContained;
  //   const isChildCollapsed = iChildIDRange.isCollapsed
  //   const childVisibleRange = childGridRef.current && getVisibleRange(childGridRef.current as HTMLDivElement)
  //   const topChildRow = childVisibleRange[0]
  //   const bottomChildRow = childVisibleRange[1]
  //   // .getRowById(
  //   //       isChildCollapsed ? iParentID : iChildIDRange.firstChildID)
  //   // const bottomRightRow = rightAdapter.get('gridDataView').getRowById(
  //   //       isChildCollapsed ? iParentID : iChildIDRange.lastChildID)
  //   const rowBounds = getRowBounds(parentCollection, childCollection, iParentRow,
  //     topChildRow, bottomChildRow)
  //   // if (SC.none(rowBounds)) {
  //   //   return;
  //   // }
  //   const isFillRequired = iParentRow % 2
  //   const isBottomRequired = iChildIDRange.renderBottom
  //   const imageUrl = determineImageURL(iChildIDRange)
  //   const imagePos = {x: 3, y: rowBounds.leftTop - leftScrollTop + 5}
  //   const imageSize = kExpandCollapseIconSize
  //   const action = iChildIDRange.isContained? 'none': iChildIDRange.isCollapsed? 'expand': 'collapse'
  //   const imageTitle = (action === 'collapse')? "DG.CaseTable.dividerView.collapseGroupTooltip".loc()
  //       (action === 'expand')? "DG.CaseTable.dividerView.expandGroupTooltip".loc(): ''
  //   const touchPathStr = getImageTouchZonePath(imagePos, imageSize);
  //   const topPathStr = buildPathStr(rowBounds.leftTop - leftScrollTop,
  //         rowBounds.rightTop - rightScrollTop);
  //   const bottomPathStr = isBottomRequired? buildPathStr( rowBounds.leftBottom - leftScrollTop + 1,
  //       rowBounds.rightBottom - rightScrollTop + 1): '';
  //   const fillPathStr = isFillRequired ? buildFillPathStr(
  //         rowBounds.leftTop - leftScrollTop,
  //         rowBounds.rightTop - rightScrollTop,
  //         rowBounds.leftBottom - leftScrollTop + 1,
  //         rowBounds.rightBottom - rightScrollTop + 1) : '';

  //   // const relation = this_._parentChildRelationsMap[ix];data.pseudoCaseMap
  //   const relation = data?.pseudoCaseMap[ix]
  //   if (!relation) {
  //     // relation = data?.pseudoCaseMap[ix] = {}
  //     relation?.top = this_._paper.path(topPathStr).attr(
  //         {stroke: RDV_RELATION_STROKE_COLOR});
  //     relation?.bottom = this_._paper.path(bottomPathStr).attr(
  //         {stroke: RDV_RELATION_STROKE_COLOR});
  //     if (!isBottomRequired) {
  //       relation.bottom.hide();
  //     }
  //     relation.area = this_._paper.path(fillPathStr).attr(
  //           {fill: RDV_RELATION_FILL_COLOR, stroke: 'transparent'});
  //     if (!isFillRequired) relation.area.hide();
  //     // The touch object is a transparent rectangle which is larger than the
  //     // expand/collapse icon which responds to touch. This makes it easier to
  //     // hit the expand/collapse icon on touch platforms.
  //     // if ((SC.browser.os === SC.OS.ios) || (SC.browser.os === SC.OS.android)) {
  //     //   relation.touch = this_._paper.path(touchPathStr)
  //     //       .attr({fill: 'transparent', stroke: 'transparent'})
  //     //       .touchstart(function (iEvent) {
  //     //         SC.run(expandCollapseClickHandler.call(relation.icon,
  //     //             iEvent));
  //     //       });
  //     // }
  //     relation.icon = this_._paper
  //         .image(imageUrl, imagePos.x, imagePos.y, imageSize.width,
  //             imageSize.height)
  //         .setClass(action)
  //         .click(function (iEvent) {
  //           SC.run(expandCollapseClickHandler.call(this, iEvent));
  //         }).attr('title', imageTitle);
  //   } else {
  //     updatePathOrHide(relation.top, true, topPathStr);
  //     updatePathOrHide(relation.bottom, isBottomRequired, bottomPathStr);
  //     updatePathOrHide(relation.area, isFillRequired, fillPathStr);
  //     updatePathOrHide(relation.touch, true, touchPathStr);
  //     relation.icon.attr({src: imageUrl, x: imagePos.x, y: imagePos.y, title: imageTitle})
  //         .setClass(action)
  //         .show();
  //   }
  //   relation.icon.dgParentID = iParentID;
  //   relation.icon.dgChildIDRange = iChildIDRange;
  //   return relation;
  // }

  // function hideRelationshipElements(ix) {
  //   const relation = this_._parentChildRelationsMap[ix];
  //   if (relation) {
  //     updatePathOrHide(relation.icon, false, '');
  //     updatePathOrHide(relation.top, false, '');
  //     updatePathOrHide(relation.bottom, false, '');
  //     updatePathOrHide(relation.area, false, '');
  //     updatePathOrHide(relation.touch, false, '');
  //   }
  // }

  const updateRelationsLines = () => {
    // if (!parentCollection || !childCollection || parentGridRef.current?.clientWidth === 0 || childGridRef.current?.clientWidth === 0) {
    //   //DG.log('DoDraw called on RelationDividerView, but tables not ready.');
    //   return;
    // }

    // const leftViewport = leftTable.get('gridViewport');
    // const viewportCount = leftViewport.bottom - leftViewport.top;
    // const leftDataView = leftAdapter.get('gridDataView');
    // const rightDataView = rightAdapter.get('gridDataView');
    // const rightProtoCase = rightAdapter.getProtoCase();
    // const rightProtoCaseID = rightProtoCase && rightProtoCase.get('id');
    // const rightProtoCaseIndex = rightDataView && rightDataView.getRowById(rightProtoCaseID);
    // const protoCaseParentID = rightProtoCase && rightProtoCase.get('parentCaseID');
    // let ix: number;
    // const rowIx: number;
    // const parentID: string;
    // const parentCase;
    // const nextParentCase;
    // const lastParentCase;
    // const childIDRange;
    // const hasProtoCaseChild;
    // const firstChildID: string;
    // const firstChildIndex: number;
    // const lastChildID: string;
    // const lastChildIndex: number;

    // // DG.assert(leftViewport, 'leftViewport missing');
    // // DG.assert(leftDataView, 'leftDataView missing');

    // for (ix = 0; ix < viewportCount; ++ix) {
    //   const parentItem = leftDataView.getItem(leftViewport.top + ix);
    //   if (parentItem && !parentItem._isProtoCase)
    //     lastParentCase = parentItem;
    // }

    // // for each visible row in the left-hand table compute the relationship
    // // graphic
    // for (ix = 0; ix < viewportCount; ix += 1) {
    //   rowIx = ix + leftViewport.top;
    //   parentCase = leftDataView.getItem(rowIx);
    //   nextParentCase = leftDataView.getItem(rowIx + 1);

    //   // if we found a parent case, compute the extent of its children and
    //   // its state, then make the appropriate graphics. Otherwise, hide
    //   // whatever elements may already be present.
    //   if (parentCase && parentCase.children[0]) {
    //     parentID = parentCase.get('id');
    //     hasProtoCaseChild = (protoCaseParentID === parentID) ||
    //                           (!protoCaseParentID && (parentCase === lastParentCase));
    //     firstChildID = parentCase.children[0].get('id');
    //     firstChildIndex = rightDataView && rightDataView.getRowById(firstChildID);
    //     if (hasProtoCaseChild && (rightProtoCaseIndex < firstChildIndex)) {
    //       firstChildID = rightProtoCaseID;
    //     }
    //     lastChildID = parentCase.children[parentCase.children.length - 1].get('id');
    //     lastChildIndex = rightDataView && rightDataView.getRowById(lastChildID);
    //     if (hasProtoCaseChild && (rightProtoCaseIndex > lastChildIndex)) {
    //       lastChildID = rightProtoCaseID;
    //     }
    //     childIDRange = {
    //       firstChildID: firstChildID,
    //       lastChildID: lastChildID,
    //       isCollapsed: leftAdapter.model.isCollapsedNode(parentCase),
    //       isContained: (parentCase.get('collection').get('id') !==
    //                     leftAdapter.get('collection').get('id')),
    //       renderBottom: !nextParentCase || nextParentCase._isProtoCase
    //     };
    //     updateParentChildRelations(ix, rowIx, parentID, childIDRange);
    //   } else {
    //     hideRelationshipElements(ix);
    //   }
    // }
    // // if the viewport has shrunk, hide additional lines
    // for (ix = viewportCount; ix < data.pseudoCaseMap.length; ix += 1) {
    //   hideRelationshipElements(ix);
    // }
  }

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

  const parentCaseIds = Object.keys(data.pseudoCaseMap)
  const parentCases = parentCollection ? data.getCasesForCollection(parentCollection.id) : []
  const everyCaseIsCollapsed = parentCases.every((value) => caseMetadata?.isCollapsed(value.__id__))
  console.log("parentCases", parentCases)

  function handleTopClick() {
    parentCases.forEach((value) => caseMetadata?.setIsCollapsed(value.__id__, !everyCaseIsCollapsed))
  }

  const topTooltipKey = `DG.CaseTable.dividerView.${everyCaseIsCollapsed ? 'expandAllTooltip' : 'collapseAllTooltip'}`
  const topButtonTooltip = t(topTooltipKey)
  const bottomsArr: number[] = []
  const getRowTop = (rowIndex: number) => rowIndex >= 1 ? rowIndex * rowHeight : 0
  const getPreviousBottoms = (idx: number) => {
    return idx > 0 ? bottomsArr[idx-1] : 0
  }

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
                  return <CurvedSpline key={`${parentCaseId}-${index}`} y1={(index + 1) * 18} y2={rowBottom} numChildCases={numChildCases}/>
                })}
              </svg>
              <div className="spacer-mid-layer">
                {parentCases.map((value, index) => (
                  <ExpandCollapseButton key={value.__id__} isCollapsed={!!caseMetadata?.isCollapsed(value.__id__)}
                    onClick={() => caseMetadata?.setIsCollapsed(value.__id__, !caseMetadata?.isCollapsed(value.__id__))}
                    styles={{ left: '3px', top: `${(index * 18) + 4}px`}}
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
}

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
  numChildCases?: number;
}

function CurvedSpline({ y1, y2, numChildCases }: CurvedSplineProps) {
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
      // console.log("iEndY", iEndY)
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
        `M0,${startPoint.y} h${kRelationParentMargin} Q${controlPoint.x},${controlPoint.y} ${midPoint.x},${midPoint.y} T${endPoint.x},${endPoint.y} h${kRelationChildMargin}`
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
  const pathData = buildPathStr(y1, y2)
  const fillData = buildFillPathStr(y1, y2, y1+18, numChildCases || 1)
  // const pathData = `M0,${y1} H12 Q28,${y1},28,${y1 + 18} T44,${y2} H48`
  return (
    <>
      <path d={pathData} fill="none" stroke={kRelationStrokeColor} />
      {/* <path d={fillData} fill="none" stroke={kRelationFillColor} /> */}
    </>
  )
}
// Adjust the initial movement
