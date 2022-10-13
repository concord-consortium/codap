import {extent, format, select} from "d3"
import React from "react"
import {isInteger} from "lodash"
import {Point, Rect,  rTreeRect} from "../graphing-types"
import {between} from "./math-utils"
import {IDataSet} from "../../../data-model/data-set"
import {ScaleNumericBaseType} from "../models/graph-layout"
import {IAxisModel, INumericAxisModel} from "../models/axis-model"

/**
 * Utility routines having to do with graph entities
 */

export function ptInRect(pt: Point, iRect: Rect) {
  const tRight = iRect.x + iRect.width,
    tBottom = iRect.y + iRect.height
  return between(pt.x, iRect.x, tRight) && (pt.y !== undefined ? between(pt.y, iRect.y, tBottom) : false)
}

/**
 * This function closely follows V2's CellLinearAxisModel:_computeBoundsAndTickGap
 */
export function computeNiceNumericBounds(min: number, max: number): { min: number, max: number } {

  function computeTickGap(iMin: number, iMax: number) {
    const range = (iMin >= iMax) ? Math.abs(iMin) : iMax - iMin,
      gap = range / 5
    if (gap === 0) {
      return 1
    }
    // We move to base 10 so we can get rid of the power of ten.
    const logTrial = Math.log(gap) / Math.LN10,
      floor = Math.floor(logTrial),
      power = Math.pow(10.0, floor)

    // Whatever is left is in the range 1 to 10. Choose desired number
    let base = Math.pow(10.0, logTrial - floor)

    if (base < 2) base = 1
    else if (base < 5) base = 2
    else base = 5

    return Math.max(power * base, Number.MIN_VALUE)
  }

  const kAddend = 5,  // amount to extend scale
    kFactor = 2.5,
    bounds = {min, max}
  if (min === max && min === 0) {
    bounds.min = -10
    bounds.max = 10
  } else if (min === max && isInteger(min)) {
    bounds.min -= kAddend
    bounds.max += kAddend
  } else if (min === max) {
    bounds.min = bounds.min + 0.1 * Math.abs(bounds.min)
    bounds.max = bounds.max - 0.1 * Math.abs(bounds.max)
  } else if (min > 0 && max > 0 && min <= max / kFactor) {  // Snap to zero
    bounds.min = 0
  } else if (min < 0 && max < 0 && max >= min / kFactor) {  // Snap to zero
    bounds.max = 0
  }
  const tickGap = computeTickGap(bounds.min, bounds.max)
  if (tickGap !== 0) {
    bounds.min = (Math.floor(bounds.min / tickGap) - 0.5) * tickGap
    bounds.max = (Math.floor(bounds.max / tickGap) + 1.5) * tickGap
  } else {
    bounds.min -= 1
    bounds.max += 1
  }
  return bounds
}

export function setNiceDomain(values: number[], axisModel: IAxisModel) {
  if (axisModel.type === 'numeric') {
    const [minValue, maxValue] = extent(values, d => d) as [number, number]
    const {min: niceMin, max: niceMax} = computeNiceNumericBounds(minValue, maxValue);
    (axisModel as INumericAxisModel).setDomain(niceMin, niceMax)
  }
}

export function getPointTipText(dataset: IDataSet, caseID: string, attributeIDs: string[]) {
  const float = format('.3~f'),
    attrArray = (attributeIDs.map(attrID => {
      const attribute = dataset?.attrFromID(attrID),
        name = attribute?.name,
        isNumeric = attribute?.type === 'numeric',
        value = isNumeric ? float(dataset?.getNumeric(caseID, attrID) ?? 0) :
          dataset?.getValue(caseID, attrID)
      return (value && (isNumeric && isFinite(value)) || (!isNumeric && value !== '')) ? `${name}: ${value}` : ''
    }))
  // Caption attribute can also be one of the plotted attributes, so we remove dups and join into html string
  return Array.from(new Set(attrArray)).filter(anEntry => anEntry !== '').join('<br>')
}

export interface IMatchCirclesProps {
  caseIDs: string[]
  dotsElement: SVGGElement | null
  pointRadius:number
  enableAnimation: React.MutableRefObject<boolean>
  instanceId: string | undefined
}

export function matchCirclesToData(props: IMatchCirclesProps) {
  const {caseIDs, enableAnimation, instanceId, dotsElement, pointRadius} = props,
    keyFunc = (d: string) => d
  enableAnimation.current = true
  select(dotsElement)
    .selectAll('circle')
    .data(caseIDs, keyFunc)
    .join(
      // @ts-expect-error void => Selection
      (enter) => {
        enter.append('circle')
          .attr('class', 'graph-dot')
          .attr('r', pointRadius)
          .property('id', (anID: string) => `${instanceId}_${anID}`)
          .selection()
      }
    )
}

//  Return the two points in logical coordinates where the line with the given
//  iSlope and iIntercept intersects the rectangle defined by the upper and lower
//  bounds of the two axes.
export interface IAxisIntercepts {
  pt1: Point,
  pt2: Point
}

export function lineToAxisIntercepts(iSlope: number, iIntercept: number,
                                     xDomain: readonly number[], yDomain: readonly number[]): IAxisIntercepts {
  let tX1, tY1, tX2, tY2
  const tLogicalBounds = {
    left: xDomain[0],
    top: yDomain[1],
    right: xDomain[1],
    bottom: yDomain[0]
  }
  if (!isFinite(iSlope)) {
    tX1 = tX2 = iIntercept
    tY1 = tLogicalBounds.bottom
    tY2 = tLogicalBounds.top
  }
    // Things can get hairy for nearly horizontal or nearly vertical lines.
  // This conditional takes care of that.
  else if (Math.abs(iSlope) > 1) {
    tY1 = tLogicalBounds.bottom
    tX1 = (tY1 - iIntercept) / iSlope
    if (tX1 < tLogicalBounds.left) {
      tX1 = tLogicalBounds.left
      tY1 = iSlope * tX1 + iIntercept
    } else if (tX1 > tLogicalBounds.right) {
      tX1 = tLogicalBounds.right
      tY1 = iSlope * tX1 + iIntercept
    }

    tY2 = tLogicalBounds.top
    tX2 = (tY2 - iIntercept) / iSlope
    if (tX2 > tLogicalBounds.right) {
      tX2 = tLogicalBounds.right
      tY2 = iSlope * tX2 + iIntercept
    } else if (tX2 < tLogicalBounds.left) {
      tX2 = tLogicalBounds.left
      tY2 = iSlope * tX2 + iIntercept
    }
  } else {
    tX1 = tLogicalBounds.left
    tY1 = iSlope * tX1 + iIntercept
    if (tY1 < tLogicalBounds.bottom) {
      tY1 = tLogicalBounds.bottom
      tX1 = (tY1 - iIntercept) / iSlope
    } else if (tY1 > tLogicalBounds.top) {
      tY1 = tLogicalBounds.top
      tX1 = (tY1 - iIntercept) / iSlope
    }

    tX2 = tLogicalBounds.right
    tY2 = iSlope * tX2 + iIntercept
    if (tY2 > tLogicalBounds.top) {
      tY2 = tLogicalBounds.top
      tX2 = (tY2 - iIntercept) / iSlope
    } else if (tY2 < tLogicalBounds.bottom) {
      tY2 = tLogicalBounds.bottom
      tX2 = (tY2 - iIntercept) / iSlope
    }
  }

  // It is helpful to keep x1 < x2
  if (tX1 > tX2) {
    let tmp = tX1
    tX1 = tX2
    tX2 = tmp

    tmp = tY1
    tY1 = tY2
    tY2 = tmp
  }
  return {
    pt1: {x: tX1, y: tY1},
    pt2: {x: tX2, y: tY2}
  }
}

export function equationString(slope: number, intercept: number) {
  const float = format('.4~r')
  const kSlopeIntercept = `<p style="color:#4782B4"><i>y</i> = ${float(slope)} <i>x</i> + ${float(intercept)}</p>`/*,
  // color,y,slope,x,signInt,Int
    kInfiniteSlope = '<p style = "color:%@"><i>%@</i> = %@ %@</p>', // x,constant,unit
    kSlopeOnly = '<p style = "color:%@">%@ = %@ %@</p>' // color, left side, numeric slope, slope unit*/
  return kSlopeIntercept
}

export function valueLabelString(value: number) {
  const float = format('.4~r')
  return `<div style="color:blue">${float(value)}</div>`
}

export function rectNormalize(iRect: rTreeRect) {
  return {
    x: iRect.x + (iRect.w < 0 ? iRect.w : 0),
    y: iRect.y + (iRect.h < 0 ? iRect.h : 0),
    w: Math.abs(iRect.w),
    h: Math.abs(iRect.h)
  }
}

/**
 * Returns the intersection of the two rectangles. Zero area intersections
 * (adjacencies) are handled as if they were not intersections.
 *
 */
export function rectangleIntersect(iA: rTreeRect, iB: rTreeRect) {
  const left = Math.max(iA.x, iB.x),
    right = Math.min(iA.x + iA.w, iB.x + iB.w),
    top = Math.max(iA.y, iB.y),
    bottom = Math.min(iA.y + iA.h, iB.y + iB.h)

  if (right - left <= 0 || bottom - top <= 0) return null
  return {x: left, y: top, w: right - left, h: bottom - top}
}

/**
 * Returns an array of zero, one, or more rectangles that represent the
 * remainder of the first rectangle after the intersection with the second
 * rectangle is removed. If the rectangles do not intersect, then the whole of
 * the first rectangle is returned.
 *
 */
export function rectangleSubtract(iA: rTreeRect, iB: rTreeRect) {
  const intersectRect = rectangleIntersect(iA, iB),
    result = []
  let intersectLR,
    rectangleALR

  if (intersectRect) {
    intersectLR = {x: intersectRect.x + intersectRect.w, y: intersectRect.y + intersectRect.h}
    rectangleALR = {x: iA.x + iA.w, y: iA.y + iA.h}
    if (iA.x < intersectRect.x) {
      result.push({
        x: iA.x, y: iA.y, w: intersectRect.x - iA.x, h: iA.h
      })
    }
    if (intersectLR.x < rectangleALR.x) {
      result.push({
        x: intersectLR.x, y: iA.y, w: rectangleALR.x - intersectLR.x, h: iA.h
      })
    }
    if (iA.y < intersectRect.y) {
      result.push({
        x: intersectRect.x, y: iA.y, w: intersectRect.w, h: intersectRect.y - iA.y
      })
    }
    if (intersectLR.y < rectangleALR.y) {
      result.push({
        x: intersectRect.x, y: intersectLR.y, w: intersectRect.w, h: rectangleALR.y - intersectLR.y
      })
    }
  } else {
    result.push(iA)
  }

  return result
}

export function rectToTreeRect(rect: Rect) {
  return {
    x: rect.x,
    y: rect.y,
    w: rect.width,
    h: rect.height
  }
}

export function getScreenCoord(dataSet: IDataSet | undefined, id: string,
                               attrID: string, scale: ScaleNumericBaseType) {
  const value = dataSet?.getNumeric(id, attrID)
  return value != null && !isNaN(value) ? Math.round(100 * scale(value)) / 100 : null
}

export interface ISetPointSelection {
  dotsRef: React.RefObject<SVGSVGElement>
  dataset?: IDataSet
  pointRadius:number,
  selectedPointRadius:number
}

export function setPointSelection(props: ISetPointSelection) {
  const
    {dotsRef, dataset, pointRadius, selectedPointRadius} = props,
    dotsSvgElement = dotsRef.current,
    dots = select(dotsSvgElement)
  dots.selectAll('circle')
    .classed('graph-dot-highlighted',
      (anID: string) => !!(dataset?.isCaseSelected(anID)))
    .attr('r', (anID:string) => dataset?.isCaseSelected(anID) ? selectedPointRadius : pointRadius)
  dots.selectAll('.graph-dot-highlighted')
    .raise()
}

export interface ISetPointCoordinates {
  dataset?: IDataSet
  dotsRef: React.RefObject<SVGSVGElement>
  selectedOnly?: boolean
  pointRadius: number
  selectedPointRadius: number
  getScreenX: ((anID: string) => number | null)
  getScreenY: ((anID: string) => number | null)
  duration?: number
  onComplete?: () => void
}

export function setPointCoordinates(props: ISetPointCoordinates) {
  const
    {dataset, dotsRef, selectedOnly = false, pointRadius, selectedPointRadius,
      getScreenX, getScreenY, duration = 0, onComplete} = props,
    selection = select(dotsRef.current).selectAll(selectedOnly ? '.graph-dot-highlighted' : '.graph-dot')
  if (duration > 0) {
    selection
      .transition()
      .duration(duration)
      .on('end', (id, i) => (i === selection.size() - 1) && onComplete?.())
      .attr('cx', (anID: string) => getScreenX(anID))
      .attr('cy', (anID: string) => getScreenY(anID))
      .attr('r', (id:string) => dataset?.isCaseSelected(id) ? selectedPointRadius : pointRadius)
  } else if (selection.size() > 0) {
    selection
      .attr('cx', (anID: string) => getScreenX(anID))
      .attr('cy', (anID: string) => getScreenY(anID))
      .attr('r', (id:string) => dataset?.isCaseSelected(id) ? selectedPointRadius : pointRadius)
  }
}
