import {ScaleLinear} from "d3"
import {AxisPlace} from "./axis-types"
import {measureText, measureTextExtent} from "../../hooks/use-measure-text"
import {kGraphFont} from "../graph/graphing-types"

export const getStringBounds = (s = 'Wy') => {
  return measureTextExtent(s, kGraphFont)
}

interface ICollisionProps {
  bandWidth: number
  categories: string[]
  centerCategoryLabels: boolean
}

/**
 * Compute the best number of ticks for a given linear scale to prevent tick label collisions.
 * The function iteratively adjusts the number of ticks to find an optimal value that avoids
 * overlapping labels while maintaining a reasonable distribution of ticks.
 *
 * @param {ScaleLinear<number, number>} scale - The D3 linear scale for which to compute the optimal number of ticks.
 * @returns {number} - The computed optimal number of ticks for the given scale.
 */
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

interface ILabelPlacement {
  translation?: string
  rotation?: string
  textAnchor: "start" | "middle" | "end"
}

type CenterOptions = "center" | "justify"
type CollisionOptions = "collision" | "fit"
type CenterCollisionPlacementMap = Record<CenterOptions, Record<CollisionOptions, ILabelPlacement>>

export const getCategoricalLabelPlacement = (
  axisPlace: AxisPlace, centerCategoryLabels: boolean, collision: boolean, bandWidth: number, textHeight: number) => {

  const rotation = 'rotate(-90)'  // the only rotation value we use
  const labelPlacementMap: Partial<Record<AxisPlace, CenterCollisionPlacementMap>> = {
    left: {
      center: {
        collision: {translation: `translate(0, ${-bandWidth / 2})`, textAnchor: 'end'},
        fit: {translation: `translate(${-textHeight / 2}, ${-bandWidth / 2})`, rotation, textAnchor: 'middle'}
      },
      justify: {
        collision: {translation: `translate(0, ${-textHeight / 2})`, textAnchor: 'end'},
        fit: {translation: `translate(${-textHeight / 2}, 0)`, rotation, textAnchor: 'start'}
      }
    },
    rightCat: {
      center: {
        collision: {translation: `translate(0, ${-bandWidth / 2})`, textAnchor: 'start'},
        fit: {translation: `translate(${textHeight / 2}, ${-bandWidth / 2})`, rotation, textAnchor: 'middle'}
      },
      justify: {
        collision: {translation: `translate(0, ${-textHeight / 2})`, textAnchor: 'end'},
        fit: {translation: `translate(${-textHeight / 2}, 0)`, rotation, textAnchor: 'start'}
      }
    },
    bottom: {
      center: {
        collision: {
          translation: `translate(${-bandWidth / 2 - textHeight / 2}, ${textHeight / 3})`, rotation, textAnchor: 'end'
        },
        fit: {translation: `translate(${-bandWidth / 2}, 0)`, textAnchor: 'middle'}
      },
      justify: {
        collision: {translation: `translate(${-bandWidth}, ${textHeight / 3})`, rotation, textAnchor: 'end'},
        fit: {translation: `translate(${-bandWidth}, ${textHeight / 3})`, textAnchor: 'start'}
      }
    },
    top: {
      center: {
        collision: {
          translation: `translate(${-bandWidth / 2 + textHeight / 2}, ${-textHeight / 3})`,
          rotation,
          textAnchor: 'start'
        },
        fit: {translation: `translate(${-bandWidth / 2}, 0)`, textAnchor: 'middle'}
      },
      justify: {
        collision: {translation: `translate(${-bandWidth}, ${textHeight / 3})`, rotation, textAnchor: 'end'},
        fit: {translation: `translate(${-bandWidth}, ${textHeight / 3})`, textAnchor: 'start'}
      }
    }
  }

  const centerOrJustify = centerCategoryLabels ? "center" : "justify"
  const collisionOrFit = collision ? "collision" : "fit"
  const labelPlacement = labelPlacementMap[axisPlace]?.[centerOrJustify][collisionOrFit]
  return {translation: '', rotation: '', textAnchor: 'none', ...labelPlacement}
}

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
