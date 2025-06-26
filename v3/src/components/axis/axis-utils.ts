import {ScaleLinear} from "d3"
import {MutableRefObject} from "react"
import { determineLevels } from "../../utilities/date-utils"
import {measureText, measureTextExtent} from "../../hooks/use-measure-text"
import {ICategorySet} from "../../models/data/category-set"
import { kAxisGap, kAxisTickLength, kDefaultFontHeight } from "./axis-constants"
import { axisPlaceToAttrRole, kDataDisplayFont } from "../data-display/data-display-types"
import { IDataConfigurationModel } from "../data-display/models/data-configuration-model"
import {AxisPlace} from "./axis-types"
import { GraphLayout } from "../graph/models/graph-layout"

export const getStringBounds = (s = 'Wy', font = kDataDisplayFont) => {
  return measureTextExtent(s, font)
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
  categorySet?: ICategorySet
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
    labelTextHeight = getStringBounds('12px sans-serif').height,
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
 * Compute the best number of ticks for a given linear scale to prevent tick label collisions.
 * The function iteratively adjusts the number of ticks to find an optimal value that avoids
 * overlapping labels while maintaining a reasonable distribution of ticks.
 *
 * @param {ScaleLinear<number, number>} scale - The D3 linear scale for which to compute the optimal number of ticks.
 * @returns {number} - The computed optimal number of ticks for the given scale.
 */
export const computeBestNumberOfTicks = (scale: ScaleLinear<number, number>): number => {
  const formatter = scale.tickFormat()

  // Helper function to detect collisions between tick labels
  const hasCollision = (values: number[]) => {
    return values.some((value, i) => {
      if (i === values.length - 1) return false
      const delta = scale(values[i + 1]) - scale(values[i])
      const length = (measureText(formatter(values[i])) + measureText(formatter(values[i + 1]))) / 2
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
