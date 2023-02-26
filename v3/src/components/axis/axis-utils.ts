import {AxisPlace} from "./axis-types"
import {measureTextExtent} from "../../hooks/use-measure-text"
import {kGraphFont} from "../graph/graphing-types"

export const getStringBounds = (s = 'Wy') => {
  return measureTextExtent(s, kGraphFont)
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

export const getCategoricalLabelPlacement = (
  axisPlace: AxisPlace, centerCategoryLabels: boolean, collision: boolean, bandWidth: number, textHeight: number) => {
  let translation = '', rotation = '', textAnchor = 'none'
  switch (axisPlace) {
    case 'left':
      switch (centerCategoryLabels) {
        case true:
          switch (collision) {
            case true:
              translation = `translate(0, ${-bandWidth / 2})`
              textAnchor = 'end'
              break
            case false:
              translation = `translate(${-textHeight / 2}, ${-bandWidth / 2})`
              rotation = `rotate(-90)`
              textAnchor = 'middle'
              break
          }
          break
        case false:
          switch (collision) {
            case true:
              translation = `translate(0, ${-textHeight / 2})`
              textAnchor = 'end'
              break
            case false:
              translation = `translate(${-textHeight / 2}, 0)`
              rotation = `rotate(-90)`
              textAnchor = 'start'
              break
          }
          break
      }
      break
    case 'rightCat':
      switch (centerCategoryLabels) {
        case true:
          switch (collision) {
            case true:
              translation = `translate(0, ${-bandWidth / 2})`
              textAnchor = 'start'
              break
            case false:
              translation = `translate(${textHeight / 2}, ${-bandWidth / 2})`
              rotation = `rotate(-90)`
              textAnchor = 'middle'
              break
          }
          break
        case false:
          switch (collision) {
            case true:
              translation = `translate(0, ${-textHeight / 2})`
              textAnchor = 'end'
              break
            case false:
              translation = `translate(${-textHeight / 2}, 0)`
              rotation = `rotate(-90)`
              textAnchor = 'start'
              break
          }
          break
      }
      break
    case 'bottom':
      switch (centerCategoryLabels) {
        case true:
          switch (collision) {
            case true:
              translation = `translate(${-bandWidth / 2 - textHeight / 2}, ${textHeight / 3})`
              rotation = `rotate(-90)`
              textAnchor = 'end'
              break
            case false:
              translation = `translate(${-bandWidth / 2}, 0)`
              textAnchor = 'middle'
              break
          }
          break
        case false:
          translation = `translate(${-bandWidth}, ${textHeight / 3})`
          switch (collision) {
            case true:
              rotation = `rotate(-90)`
              textAnchor = 'end'
              break
            case false:
              textAnchor = 'start'
              break
          }
          break
      }
      break
    case 'top':
      switch (centerCategoryLabels) {
        case true:
          switch (collision) {
            case true:
              translation = `translate(${-bandWidth / 2 + textHeight / 2}, ${-textHeight / 3})`
              rotation = `rotate(-90)`
              textAnchor = 'start'
              break
            case false:
              translation = `translate(${-bandWidth / 2}, 0)`
              textAnchor = 'middle'
              break
          }
          break
        case false:
          translation = `translate(${-bandWidth}, ${textHeight / 3})`
          switch (collision) {
            case true:
              rotation = `rotate(-90)`
              textAnchor = 'end'
              break
            case false:
              textAnchor = 'start'
              break
          }
          break
      }
      break
  }
  return {translation, rotation, textAnchor}
}
