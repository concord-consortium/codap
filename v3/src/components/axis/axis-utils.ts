import {ScaleContinuousNumeric, ScaleLinear} from "d3"
import {MutableRefObject, useEffect} from "react"
import { logMessageWithReplacement } from "../../lib/log-message"
import { IDataConfigurationModel } from "../data-display/models/data-configuration-model"
import { IDataDisplayContentModel } from "../data-display/models/data-display-content-model"
import { axisPlaceToAttrRole, kDataDisplayFont, transitionDuration } from "../data-display/data-display-types"
import {measureText, measureTextExtent} from "../../hooks/use-measure-text"
import { determineLevels } from "../../utilities/date-utils"
import { GraphLayout } from "../graph/models/graph-layout"
import { ITileModel } from "../../models/tiles/tile-model"
import { kAxisGap, kAxisTickLength, kDefaultFontHeight } from "./axis-constants"
import {AxisPlace} from "./axis-types"
import { updateAxisNotification } from "./models/axis-notifications"
import { IBaseNumericAxisModel } from "./models/base-numeric-axis-model"

import vars from "../vars.scss"

// Zoom factors for option-click zoom: 0.5 = zoom in (halve range), 2 = zoom out (double range)
export const kZoomInFactor = 0.5
export const kZoomOutFactor = 2

/**
 * Hook to update zoom cursor when modifier keys are pressed/released while hovering.
 * @param isHoveredRef - Ref tracking whether mouse is over the target element
 * @param updateCursor - Callback to update cursor based on alt/shift key state
 */
export function useZoomCursorKeyboardListener(
  isHoveredRef: MutableRefObject<boolean>,
  updateCursor: (altKey: boolean, shiftKey: boolean) => void
) {
  useEffect(function setupKeyboardListeners() {
    const handleKeyChange = (event: KeyboardEvent) => {
      if (isHoveredRef.current) {
        updateCursor(event.altKey, event.shiftKey)
      }
    }

    window.addEventListener('keydown', handleKeyChange)
    window.addEventListener('keyup', handleKeyChange)

    return () => {
      window.removeEventListener('keydown', handleKeyChange)
      window.removeEventListener('keyup', handleKeyChange)
    }
  }, [isHoveredRef, updateCursor])
}

export const getStringBounds = (s = 'Wy', font = kDataDisplayFont) => {
  return measureTextExtent(s, font)
}

export const elideStringToFit = (s: string, maxWidth: number, font = kDataDisplayFont) => {
  const bounds = measureTextExtent(s, font)
  if (bounds.width <= maxWidth) return s

  const ellipsis = '…'
  const ellipsisWidth = measureTextExtent(ellipsis, font).width
  const avgCharWidth = bounds.width / s.length
  const extraLength = 5 // extra chars so we don't cut off too early
  const estimatedLength = Math.floor((maxWidth - ellipsisWidth) / avgCharWidth) + extraLength

  let elidedString = s.slice(0, estimatedLength)
  let currentWidth = measureTextExtent(elidedString + ellipsis, font).width

  while (currentWidth > maxWidth && elidedString.length > 0) {
    elidedString = elidedString.slice(0, -1)
    currentWidth = measureTextExtent(elidedString + ellipsis, font).width
  }

  return elidedString + ellipsis
}

interface ICollisionProps {
  bandWidth: number
  categories: string[]
  centerCategoryLabels: boolean
}

export const collisionExists = (props: ICollisionProps) => {
  /* A collision occurs when two labels overlap.
   * This can occur when labels are centered on the tick, or when they are left-aligned.
   * The former requires computation of two adjacent label widths.
   */
  const {bandWidth, categories, centerCategoryLabels} = props,
    narrowedBandwidth = bandWidth - 5,
    labelWidths = categories.map(category => getStringBounds(category).width)
  return centerCategoryLabels ? labelWidths.some((width, i) => {
    return i > 0 && width / 2 + labelWidths[i - 1] / 2 > narrowedBandwidth
  }) : labelWidths.some(width => width > narrowedBandwidth)
}

/**
 * Having this utility function makes it possible to set the number of categories limit for a categorical
 * axis early in the process of treating an attribute as categorical so that, if there is a large number of categories,
 * we can limit the computation involved in figuring out which cases belong to which subplot.
 */
export const setNumberOfCategoriesLimit = (dataConfig: IDataConfigurationModel, axisPlace: AxisPlace,
                                           layout: GraphLayout) => {
  const axisLength = layout.getAxisLength(axisPlace),
    numCategoriesLimit = Math.floor(axisLength / kDefaultFontHeight)
  dataConfig?.setNumberOfCategoriesLimitForRole(axisPlaceToAttrRole[axisPlace], numCategoriesLimit)
}

interface ILabelPlacement {
  rotation?: string
  textAnchor: "start" | "middle" | "end"
}

type CenterOptions = "center" | "justify"
type CollisionOptions = "collision" | "fit"
type CenterCollisionPlacementMap = Record<CenterOptions, Record<CollisionOptions, ILabelPlacement>>

export const getCategoricalLabelPlacement = (
  axisPlace: AxisPlace, centerCategoryLabels: boolean, collision: boolean) => {

  const rotation = 'rotate(-90)'  // the only rotation value we use
  const labelPlacementMap: Partial<Record<AxisPlace, CenterCollisionPlacementMap>> = {
    left: {
      center: {
        collision: {textAnchor: 'end'},
        fit: {rotation, textAnchor: 'middle'}
      },
      justify: {
        collision: {textAnchor: 'end'},
        fit: {rotation, textAnchor: 'start'}
      }
    },
    rightCat: {
      center: {
        collision: {textAnchor: 'start'},
        fit: {rotation, textAnchor: 'middle'}
      },
      justify: {
        collision: {textAnchor: 'end'},
        fit: {rotation, textAnchor: 'start'}
      }
    },
    bottom: {
      center: {
        collision: {
          rotation, textAnchor: 'end'
        },
        fit: {textAnchor: 'middle'}
      },
      justify: {
        collision: {rotation, textAnchor: 'end'},
        fit: {textAnchor: 'start'}
      }
    },
    top: {
      center: {
        collision: {
          rotation,
          textAnchor: 'start'
        },
        fit: {textAnchor: 'middle'}
      },
      justify: {
        collision: {rotation, textAnchor: 'end'},
        fit: {textAnchor: 'start'}
      }
    }
  }

  const centerOrJustify = centerCategoryLabels ? "center" : "justify"
  const collisionOrFit = collision ? "collision" : "fit"
  const labelPlacement = labelPlacementMap[axisPlace]?.[centerOrJustify][collisionOrFit]
  return {rotation: '', textAnchor: 'none', ...labelPlacement}
}

export interface DragInfo {
  initialIndexOfCategory: number
  indexOfCategory: number
  catName: string
  initialOffset: number
  currentOffset: number
  currentDragPosition: number
  currentDragPositionCatName: string
  categories: string[]
  bandwidth: number
  axisOrientation: 'horizontal' | 'vertical'
  labelOrientation: 'horizontal' | 'vertical'
  isOther: boolean
}

export interface IGetCoordFunctionsProps {
  numCategories: number
  centerCategoryLabels: boolean
  collision: boolean
  axisIsVertical: boolean
  rangeMin: number
  rangeMax: number
  subAxisLength: number
  isRightCat: boolean
  isTop: boolean
  dragInfo: MutableRefObject<DragInfo>
}

interface ICoordFunctions {
  getTickX: (i: number) => number
  getTickY: (i: number) => number
  getDividerX: (i: number) => number
  getDividerY: (i: number) => number
  getLabelX: (i: number) => number
  getLabelY: (i: number) => number
}

export const getCoordFunctions = (props: IGetCoordFunctionsProps): ICoordFunctions => {
  const {numCategories, centerCategoryLabels, collision,
    axisIsVertical,
    rangeMin, rangeMax, subAxisLength,
    isRightCat, isTop, dragInfo} = props,
    bandWidth = subAxisLength / numCategories,
    labelTextHeight = getStringBounds(vars.labelFont).height,
    indexOffset = centerCategoryLabels ? 0.5 : 0/*(axisIsVertical ? 1 : 0)*/,
    dI = dragInfo.current
  let labelXOffset = 0, labelYOffset = 0
  const getTickCoord = (i: number, rangeVal:number, sign: 1 | -1) => {
      return i === dI.indexOfCategory ? dI.currentDragPosition
        : rangeVal + sign * (i + indexOffset) * bandWidth
  },
    getTickX = (i: number) => {
      return getTickCoord(i, rangeMin, 1)
    },
    getTickY = (i: number) => {
      return getTickCoord(i, rangeMax, -1)
    }
  switch (axisIsVertical) {
    case true:
      labelXOffset = collision ? 0 : 0.25 * labelTextHeight
      return { getTickX: () => 0,
      getTickY,
      getDividerX: () => 0,
      getDividerY: (i) => rangeMax - (i + 1) * bandWidth,
      getLabelX: () => (isRightCat ? 1.5 : -1) * (kAxisTickLength + kAxisGap + labelXOffset),
      getLabelY: (i) =>
        (getTickY ? getTickY(i) : 0) + (collision ? 0.25 * labelTextHeight : 0)
    }
    case false:
      labelYOffset = collision ? 0 : (isTop ? -0.15 : 0.75) * labelTextHeight
    return {
      getTickX,
      getTickY: () => 0,
      getDividerX: (i) => rangeMin + i * bandWidth,
      getDividerY: () => 0,
      getLabelX: (i) => (getTickX ? getTickX(i) : 0) +
        (collision ? 0.25 * labelTextHeight : 0),
      getLabelY: () => (isTop ? -1 : 1) * (kAxisTickLength + kAxisGap) + labelYOffset
    }
  }
}

/**
 * Compute the real world width for a given pixel width on the specified scale.
 *
 * @param {number} pixels - The pixel width for which to compute the domain extent.
 * @param {ScaleContinuousNumeric<number, number>} scale - The D3 scale for which to compute the extent.
 * @returns {number} - The computed domain extent for the given pixel width on the given scale.
 */
export function getDomainExtentForPixelWidth(pixels: number, scale: Maybe<ScaleContinuousNumeric<number, number>>) {
  return scale ? scale.invert(pixels) - scale.invert(0) : 0
}

/**
 * Compute the best number of ticks for a given linear scale to prevent tick label collisions.
 * The function iteratively adjusts the number of ticks to find an optimal value that avoids
 * overlapping labels while maintaining a reasonable distribution of ticks.
 *
 * @param {ScaleLinear<number, number>} scale - The D3 linear scale for which to compute the optimal number of ticks.
 * @returns {number} - The computed optimal number of ticks for the given scale.
 */
export const computeBestNumberOfTicks = (scale: ScaleLinear<number, number>): number => {
  const formatter = scale.tickFormat()
  const kLabelGap = 4 // Minimum gap between labels in pixels

  // Helper function to detect collisions between tick labels
  const hasCollision = (values: number[]) => {
    return values.some((value, i) => {
      if (i === values.length - 1) return false
      const delta = scale(values[i + 1]) - scale(values[i])
      const length = (measureText(formatter(values[i])) + measureText(formatter(values[i + 1]))) / 2 + kLabelGap
      return length > delta
    })
  }

  let tickValues = scale.ticks(),
    n1 = tickValues.length,
    n2 = n1,
    done = false,
    firstTime = true,
    currentNumber = n1

  // Find the best number of ticks iteratively
  while (!done) {
    const colliding = hasCollision(tickValues)
    if (colliding) {
      n2 = n1
      n1 = Math.floor(n1 / 2)
      currentNumber = n1
    } else if (firstTime) {
      n2 *= 2
      currentNumber = n2
    } else {
      currentNumber = n1 + Math.floor((n2 - n1) / 2)
      done = currentNumber === n1 || currentNumber === n2
      if (hasCollision(tickValues)) {
        n2 = currentNumber
      } else {
        n1 = currentNumber
      }
    }
    tickValues = scale.ticks(currentNumber)
    firstTime = false
  }

  return Math.max(2, currentNumber)
}

export const computeBestNumberOfVerticalAxisTicks = (scale: ScaleLinear<number, number>): number => {
  const numberHeight = measureTextExtent('0', kDataDisplayFont).height
  const axisLength = Math.abs(scale.range()[1] - scale.range()[0])
  // The following computation is a heuristic that results in good spacing and never just one tick
  return Math.max(3, Math.floor(axisLength / (numberHeight * 1.5)))
}

export const isScaleLinear = (scale: any): scale is ScaleLinear<number, number> => {
  return (scale as ScaleLinear<number, number>).interpolate !== undefined
}

export const getNumberOfLevelsForDateAxis = (minDateInSecs: number, maxDateInSecs: number) => {
  const levels = determineLevels(1000 * minDateInSecs, 1000 * maxDateInSecs)
  return levels.outerLevel !== levels.innerLevel ? 2 : 1
}

/**
 * Zoom an axis by a given factor, centered on a fixed value.
 * Uses the dilation formula: newBound = fixedValue + (currentBound - fixedValue) * factor
 *
 * @param axisModel - The numeric axis model to zoom
 * @param fixedValue - The data coordinate to keep fixed (center of zoom)
 * @param factor - The zoom factor (0.5 = zoom in/halve range, 2 = zoom out/double range)
 * @param displayModel - Optional display model to trigger animation
 * @param tileModel - Optional tile model for notifications
 */
export function zoomAxis(
  axisModel: IBaseNumericAxisModel,
  fixedValue: number,
  factor: number,
  displayModel?: IDataDisplayContentModel,
  tileModel?: ITileModel
) {
  const [lower, upper] = axisModel.domain

  // Apply dilation formula, respecting lockZero constraint
  const newLower = axisModel.lockZero && lower === 0
    ? 0
    : fixedValue + (lower - fixedValue) * factor
  const newUpper = axisModel.lockZero && upper === 0
    ? 0
    : fixedValue + (upper - fixedValue) * factor

  // Ensure the range doesn't invert or collapse
  if (newLower >= newUpper) return

  // Allow the range to shrink (zoom in) or grow (zoom out)
  axisModel.setAllowRangeToShrink(true)

  // Enable animation for the zoom
  axisModel.setTransitionDuration(transitionDuration)
  displayModel?.startAnimation()

  axisModel.applyModelChange(
    () => axisModel.setDomain(newLower, newUpper),
    {
      notify: tileModel
        ? updateAxisNotification("change axis bounds", [newLower, newUpper], tileModel)
        : undefined,
      undoStringKey: "DG.Undo.axisDilate",
      redoStringKey: "DG.Redo.axisDilate",
      log: logMessageWithReplacement("Axis zoom: lower: %@, upper: %@",
        {lower: newLower, upper: newUpper}, "plot")
    }
  )
}
