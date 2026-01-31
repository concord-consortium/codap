import {measureText} from "../../hooks/use-measure-text"
import {IDataSet} from "../../models/data/data-set"
import { selectCases, setOrExtendSelection } from "../../models/data/data-set-utils"
import {
  defaultSelectedColor, defaultSelectedStroke, defaultSelectedStrokeOpacity, defaultSelectedStrokeWidth,
  defaultStrokeOpacity, defaultStrokeWidth
} from "../../utilities/color-utils"
import {between} from "../../utilities/math-utils"
import { IBarCover } from "../graph/graphing-types"
import {isGraphDataConfigurationModel} from "../graph/models/graph-data-configuration-model"
import {ISetPointSelection} from "../graph/utilities/graph-utils"
import {
  hoverRadiusFactor, kDataDisplayFont, Point, PointDisplayType, pointRadiusLogBase, pointRadiusMax, pointRadiusMin,
  pointRadiusSelectionAddend, Rect, rTreeRect
} from "./data-display-types"
import {IDataConfigurationModel } from "./models/data-configuration-model"
import {CaseDataWithSubPlot} from "./d3-types"
import { getRendererForEvent, IPointStyle, PointRendererBase } from "./renderer"

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

export function handleClickOnCase(event: PointerEvent, caseID: string, dataset?: IDataSet) {
  // click occurred on a point, so don't deselect
  const renderer = getRendererForEvent(event)
  renderer?.cancelAnimationFrame("deselectAll")

  const extendSelection = event.shiftKey,
    caseIsSelected = dataset?.isCaseSelected(caseID)

  if (!caseIsSelected) {
    setOrExtendSelection([caseID], dataset, extendSelection)
  } else if (extendSelection) { // case is selected and Shift key is down => deselect case
    selectCases([caseID], dataset, false)
  }
}

interface IHandleClickOnBarProps {
  event: PointerEvent
  dataConfig: IDataConfigurationModel
  barCover: IBarCover
}

export const handleClickOnBar = ({ event, dataConfig, barCover }: IHandleClickOnBarProps) => {
  const extendSelection = event.shiftKey
  setOrExtendSelection(barCover.caseIDs, dataConfig.dataset, extendSelection)
}

export interface IMatchCirclesProps {
  dataConfiguration: IDataConfigurationModel
  pointRadius: number
  pointColor: string
  pointDisplayType?: PointDisplayType
  pointsFusedIntoBars?: boolean
  pointStrokeColor: string
  startAnimation: () => void
  instanceId: string | undefined
  renderer: PointRendererBase
}

export function matchCirclesToData(props: IMatchCirclesProps) {
  const { dataConfiguration, renderer, startAnimation, pointRadius, pointColor, pointStrokeColor,
          pointDisplayType = "points" } = props
  // TODO: eliminate dependence on GraphDataConfigurationModel
  const allCaseData: CaseDataWithSubPlot[] = isGraphDataConfigurationModel(dataConfiguration)
    ? dataConfiguration.caseDataWithSubPlot
    : dataConfiguration.joinedCaseDataArrays

  startAnimation()

  renderer?.matchPointsToData(dataConfiguration.dataset?.id ?? '', allCaseData, pointDisplayType, {
    radius: pointRadius,
    fill: pointColor,
    stroke: pointStrokeColor,
    strokeWidth: defaultStrokeWidth
  })

  dataConfiguration.setPointsNeedUpdating(false)
}

export function setPointSelection(props: ISetPointSelection) {
  const { renderer, dataConfiguration, pointRadius, selectedPointRadius,
    pointColor, pointStrokeColor, getPointColorAtIndex, pointsFusedIntoBars } = props
  const dataset = dataConfiguration.dataset
  const legendID = dataConfiguration.attributeID('legend')
  if (!renderer) {
    return
  }
  renderer.forEachPoint((point, metadata) => {
    const { caseID, plotNum } = metadata
    const isSelected = !!dataset?.isCaseSelected(caseID)
    // Determine fill color based on legend or plotNum, preserving original color when selected
    let fill: string
    if (legendID) {
      fill = dataConfiguration?.getLegendColorForCase(caseID)
    } else {
      fill = plotNum && getPointColorAtIndex ? getPointColorAtIndex(plotNum) : pointColor
    }
    const style: Partial<IPointStyle> = {
      fill,
      radius: isSelected ? selectedPointRadius : pointRadius,
      stroke: isSelected
        ? (pointsFusedIntoBars ? defaultSelectedColor : defaultSelectedStroke)
        : pointStrokeColor,
      strokeWidth: isSelected ? defaultSelectedStrokeWidth : defaultStrokeWidth,
      strokeOpacity: isSelected ? defaultSelectedStrokeOpacity : defaultStrokeOpacity
    }
    renderer.setPointStyle(point, style)
    renderer.setPointRaised(point, isSelected)
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
