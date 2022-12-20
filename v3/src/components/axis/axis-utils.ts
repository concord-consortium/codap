import {AxisPlace} from "./axis-types"


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
  }
  return {translation, rotation, textAnchor}
}
