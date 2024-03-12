import {format} from "d3"
import {measureText} from "../../hooks/use-measure-text"
import {between} from "../../utilities/math-utils"
import {
  defaultSelectedColor, defaultSelectedStroke, defaultSelectedStrokeOpacity, defaultSelectedStrokeWidth,
  defaultStrokeOpacity, defaultStrokeWidth
} from "../../utilities/color-utils"
import {IDataSet} from "../../models/data/data-set"
import {IDataConfigurationModel } from "./models/data-configuration-model"
import {
  hoverRadiusFactor, kDataDisplayFont, Point, pointRadiusLogBase, pointRadiusMax, pointRadiusMin,
  pointRadiusSelectionAddend, Rect, rTreeRect
} from "./data-display-types"
import {ISetPointSelection} from "../graph/utilities/graph-utils"
import {IPixiPointStyle, PixiPoints} from "../graph/utilities/pixi-points"
import { PointDisplayType } from "../graph/graphing-types"

export const maxWidthOfStringsD3 = (strings: Iterable<string>) => {
  let maxWidth = 0
  for (const aString of strings) {
    maxWidth = Math.max(maxWidth, measureText(aString, kDataDisplayFont))
  }
  return maxWidth
}

export function ptInRect(pt: Point, iRect: Rect) {
  const tRight = iRect.x + iRect.width,
    tBottom = iRect.y + iRect.height
  return between(pt.x, iRect.x, tRight) && (pt.y !== undefined ? between(pt.y, iRect.y, tBottom) : false)
}

export const computePointRadius = (numPoints: number, pointSizeMultiplier: number,
  use: 'normal' | 'hover-drag' | 'select' = 'normal') => {
  let r = pointRadiusMax
  // for loop is fast equivalent to radius = max( minSize, maxSize - floor( log( logBase, max( dataLength, 1 )))
  for (let i = pointRadiusLogBase; i <= numPoints; i = i * pointRadiusLogBase) {
    --r
    if (r <= pointRadiusMin) break
  }
  const result = r * pointSizeMultiplier
  switch (use) {
    case "normal":
      return result
    case "hover-drag":
      return result * hoverRadiusFactor
    case "select":
      return result + pointRadiusSelectionAddend
  }
}

export function getCaseTipText(caseID: string, attributeIDs: string[], dataset?: IDataSet) {
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

export function handleClickOnCase(event: PointerEvent, caseID: string, dataset?: IDataSet) {
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
  pointRadius: number
  pointColor: string
  pointDisplayType?: PointDisplayType
  pointStrokeColor: string
  startAnimation: () => void
  instanceId: string | undefined
  pixiPoints: PixiPoints
}

export function matchCirclesToData(props: IMatchCirclesProps) {
  const { dataConfiguration, pixiPoints, startAnimation, pointRadius, pointColor, pointStrokeColor,
          pointDisplayType = "points" } = props
  const allCaseData = dataConfiguration.joinedCaseDataArrays

  startAnimation()

  pixiPoints?.matchPointsToData(allCaseData, pointDisplayType, {
    radius: pointRadius,
    fill: pointColor,
    stroke: pointStrokeColor,
    strokeWidth: defaultStrokeWidth
  })

  dataConfiguration.setPointsNeedUpdating(false)
}

export function setPointSelection(props: ISetPointSelection) {
  const { pixiPoints, dataConfiguration, pointRadius, selectedPointRadius,
    pointColor, pointStrokeColor, getPointColorAtIndex } = props
  const dataset = dataConfiguration.dataset
  const legendID = dataConfiguration.attributeID('legend')
  if (!pixiPoints) {
    return
  }
  pixiPoints.forEachPoint((point, metadata) => {
    const { caseID, plotNum } = metadata
    const isSelected = !!dataset?.isCaseSelected(caseID)
    const isSelectedAndLegendIsPresent = isSelected && legendID
    // This `fill` logic is directly translated from the old D3 code.
    let fill: string
    if (isSelected && !legendID) {
      fill = defaultSelectedColor
    } else if (legendID) {
      fill = dataConfiguration?.getLegendColorForCase(caseID)
    } else {
      fill = plotNum && getPointColorAtIndex ? getPointColorAtIndex(plotNum) : pointColor
    }
    const style: Partial<IPixiPointStyle> = {
      fill,
      radius: isSelected ? selectedPointRadius : pointRadius,
      stroke: isSelectedAndLegendIsPresent ? defaultSelectedStroke : pointStrokeColor,
      strokeWidth: isSelectedAndLegendIsPresent ? defaultSelectedStrokeWidth : defaultStrokeWidth,
      strokeOpacity: isSelectedAndLegendIsPresent ? defaultSelectedStrokeOpacity : defaultStrokeOpacity
    }
    pixiPoints.setPointStyle(point, style)
    pixiPoints.setPointRaised(point, isSelected)
  })
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
