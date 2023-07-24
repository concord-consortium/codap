import {extent, format, select, timeout} from "d3"
import React from "react"
import {isInteger} from "lodash"
import {CaseData, DotsElt, selectCircles, selectDots} from "../d3-types"
import {IDotsRef, kGraphFont, Point, Rect, rTreeRect, transitionDuration} from "../graphing-types"
import {between} from "../../../utilities/math-utils"
import {IAxisModel, isNumericAxisModel} from "../../axis/models/axis-model"
import {ScaleNumericBaseType} from "../../axis/axis-types"
import {IDataSet} from "../../../models/data/data-set"
import {
  defaultSelectedColor,
  defaultSelectedStroke,
  defaultSelectedStrokeOpacity,
  defaultSelectedStrokeWidth,
  defaultStrokeOpacity,
  defaultStrokeWidth
} from "../../../utilities/color-utils"
import {IDataConfigurationModel} from "../models/data-configuration-model"
import {measureText} from "../../../hooks/use-measure-text"

/**
 * Utility routines having to do with graph entities
 */

export const startAnimation = (enableAnimation: React.MutableRefObject<boolean>) => {
  enableAnimation.current = true
  timeout(() => enableAnimation.current = false, 2000)
}

export const maxWidthOfStringsD3 = (strings: Iterable<string>) => {
  let maxWidth = 0
  for (const aString of strings) {
    maxWidth = Math.max(maxWidth, measureText(aString, kGraphFont))
  }
  return maxWidth
}

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
    // We move to base 10, so we can get rid of the power of ten.
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
  if (isNumericAxisModel(axisModel)) {
    const [minValue, maxValue] = extent(values, d => d) as [number, number]
    const {min: niceMin, max: niceMax} = computeNiceNumericBounds(minValue, maxValue)
    axisModel.setDomain(niceMin, niceMax)
  }
}

export function getPointTipText(caseID: string, attributeIDs: string[], dataset?: IDataSet) {
  const float = format('.3~f'),
    attrArray = (attributeIDs.map(attrID => {
      const attribute = dataset?.attrFromID(attrID),
        name = attribute?.name,
        numValue = dataset?.getNumeric(caseID, attrID),
        value = numValue != null && isFinite(numValue) ? float(numValue)
                  : dataset?.getValue(caseID, attrID)
      return value ? `${name}: ${value}` : ''
    }))
  // Caption attribute can also be one of the plotted attributes, so we remove dups and join into html string
  return Array.from(new Set(attrArray)).filter(anEntry => anEntry !== '').join('<br>')
}

export function handleClickOnDot(event: MouseEvent, caseID: string, dataset?: IDataSet) {
  const extendSelection = event.shiftKey,
    caseIsSelected = dataset?.isCaseSelected(caseID)
  if (!caseIsSelected) {
    if (extendSelection) { // case is not selected and Shift key is down => add case to selection
      dataset?.selectCases([caseID])
    } else { // case is not selected and Shift key is up => only this case should be selected
      dataset?.setSelectedCases([caseID])
    }
  } else if (extendSelection) { // case is selected and Shift key is down => deselect case
    dataset?.selectCases([caseID], false)
  }
}

export interface IMatchCirclesProps {
  dataConfiguration: IDataConfigurationModel
  dotsElement: DotsElt
  pointRadius: number
  pointColor: string
  pointStrokeColor: string
  enableAnimation: React.MutableRefObject<boolean>
  instanceId: string | undefined
}

export function matchCirclesToData(props: IMatchCirclesProps) {

  const {dataConfiguration, enableAnimation, instanceId,
      dotsElement, pointRadius, pointColor, pointStrokeColor} = props,
    allCaseData = dataConfiguration.joinedCaseDataArrays,
    caseDataKeyFunc = (d: CaseData) => `${d.plotNum}-${d.caseID}`,
    circles = selectCircles(dotsElement)
  if (!circles) return
  startAnimation(enableAnimation)
  circles
    .data(allCaseData, caseDataKeyFunc)
    .join(
      (enter) =>
        enter.append('circle')
          .attr('class', 'graph-dot')
          .property('id', (d: CaseData) => `${instanceId}_${d.caseID}`),
      (update) =>
        update.attr('r', pointRadius)
          .style('fill', pointColor)
          .style('stroke', pointStrokeColor)
          .style('stroke-width', defaultStrokeWidth)
    )
  dotsElement && select(dotsElement).on('click',
    (event: MouseEvent) => {
      const target = select(event.target as SVGSVGElement)
      if (target.node()?.nodeName === 'circle') {
        handleClickOnDot(event, (target.datum() as CaseData).caseID, dataConfiguration.dataset)
      }
    })
  dataConfiguration.setPointsNeedUpdating(false)
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

export function equationString(slope: number, intercept: number, attrNames: {x: string, y: string}) {
  const float = format('.4~r')
  if (isFinite(slope) && slope !== 0) {
    return `<em>${attrNames.y}</em> = ${float(slope)} <em>${attrNames.x}</em> + ${float(intercept)}`
  } else {
    return `<em>${slope === 0 ? attrNames.y : attrNames.x}</em> = ${float(intercept)}`
  }
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
  return value != null && !isNaN(value) ? scale(value) : null
}

export interface ISetPointSelection {
  dotsRef: IDotsRef
  dataConfiguration: IDataConfigurationModel
  pointRadius: number,
  selectedPointRadius: number,
  pointColor: string,
  pointStrokeColor: string,
  getPointColorAtIndex?: (index: number) => string
}

export function setPointSelection(props: ISetPointSelection) {
  const
    {dotsRef, dataConfiguration, pointRadius, selectedPointRadius,
      pointColor, pointStrokeColor, getPointColorAtIndex} = props,
    dataset = dataConfiguration.dataset,
    dots = selectCircles(dotsRef.current),
    legendID = dataConfiguration.attributeID('legend')

  if (!(dotsRef.current && dots)) return

  // First set the class based on selection
  dots
    .classed('graph-dot-highlighted', (aCaseData: CaseData) => !!dataset?.isCaseSelected(aCaseData.caseID))
    // Then set properties to defaults w/o selection
    .attr('r', pointRadius)
    .style('stroke', pointStrokeColor)
    .style('fill', (aCaseData:CaseData) => {
      return legendID
        ? dataConfiguration?.getLegendColorForCase(aCaseData.caseID)
        : aCaseData.plotNum && getPointColorAtIndex
          ? getPointColorAtIndex(aCaseData.plotNum) : pointColor
    })
    .style('stroke-width', defaultStrokeWidth)
    .style('stroke-opacity', defaultStrokeOpacity)

  const selectedDots = selectDots(dotsRef.current, true)
  // How we deal with this depends on whether there is a legend or not
  if (legendID) {
    selectedDots?.style('stroke', defaultSelectedStroke)
      .style('stroke-width', defaultSelectedStrokeWidth)
      .style('stroke-opacity', defaultSelectedStrokeOpacity)
  } else {
    selectedDots?.style('fill', defaultSelectedColor)
  }
  selectedDots?.attr('r', selectedPointRadius)
    .raise()
}

export interface ISetPointCoordinates {
  dataset?: IDataSet
  dotsRef: IDotsRef
  selectedOnly?: boolean
  pointRadius: number
  selectedPointRadius: number
  pointColor: string
  pointStrokeColor: string
  getPointColorAtIndex?: (index: number) => string
  getScreenX: ((anID: string) => number | null)
  getScreenY: ((anID: string, plotNum?:number) => number | null)
  getLegendColor?: ((anID: string) => string)
  enableAnimation: React.MutableRefObject<boolean>
}

export function setPointCoordinates(props: ISetPointCoordinates) {

  const lookupLegendColor = (aCaseData: CaseData) => {
      const id = aCaseData.caseID,
        isSelected = dataset?.isCaseSelected(id),
        legendColor = getLegendColor ? getLegendColor(id) : ''
      return legendColor !== '' ? legendColor
        : isSelected ? defaultSelectedColor
          : aCaseData.plotNum && getPointColorAtIndex
            ? getPointColorAtIndex(aCaseData.plotNum) : pointColor
    },

    setPoints = () => {

      if (theSelection?.size()) {
        theSelection
          .transition()
          .duration(duration)
          .attr('cx', (aCaseData: CaseData) => getScreenX(aCaseData.caseID))
          .attr('cy', (aCaseData: CaseData) => {
            return getScreenY(aCaseData.caseID, aCaseData.plotNum)
          })
          .attr('r', (aCaseData: CaseData) => dataset?.isCaseSelected(aCaseData.caseID)
            ? selectedPointRadius : pointRadius)
          .style('fill', (aCaseData: CaseData) => lookupLegendColor(aCaseData))
          .style('stroke', (aCaseData: CaseData) =>
            (getLegendColor && dataset?.isCaseSelected(aCaseData.caseID))
            ? defaultSelectedStroke : pointStrokeColor)
          .style('stroke-width', (aCaseData: CaseData) =>
            (getLegendColor && dataset?.isCaseSelected(aCaseData.caseID))
            ? defaultSelectedStrokeWidth : defaultStrokeWidth)
      }
    }

  const
    {
      dataset, dotsRef, selectedOnly = false, pointRadius, selectedPointRadius,
      pointStrokeColor, pointColor, getPointColorAtIndex,
      getScreenX, getScreenY, getLegendColor, enableAnimation
    } = props,
    duration = enableAnimation.current ? transitionDuration : 0,

    theSelection = selectDots(dotsRef.current, selectedOnly)
  setPoints()
}


/**
 Use the bounds of the given axes to compute slope and intercept.
*/
export function computeSlopeAndIntercept(xAxis?: IAxisModel, yAxis?: IAxisModel) {
  const xLower = xAxis && isNumericAxisModel(xAxis) ? xAxis.min : 0,
    xUpper = xAxis && isNumericAxisModel(xAxis) ? xAxis.max : 0,
    yLower = yAxis && isNumericAxisModel(yAxis) ? yAxis.min : 0,
    yUpper = yAxis && isNumericAxisModel(yAxis) ? yAxis.max : 0

  // Make the default a bit steeper so it's less likely to look like
  // it fits a typical set of points
  const adjustedXUpper = xLower + (xUpper - xLower) / 2,
    slope = (yUpper - yLower) / (adjustedXUpper - xLower),
    intercept = yLower - slope * xLower

  return {slope, intercept}
}
