import {format} from "d3"

export function between(num: number, min: number, max: number) {
  return min < max ? (min <= num && num <= max) : (max <= num && num <= min)
}

/* Given two numbers, determine the least number of significant figures needed for their display to distinguish
* between them. */
export function neededSignificantDigits(num1: number, num2: number) {
  let significantDigits = 0,
    f: (n: (number | { valueOf(): number })) => string,
    done = false
  while (!done) {
    f = format(`.${significantDigits}r`)
    const num1str = f(num1),
      num2str = f(num2)
    done = num1str !== num2str
    if (!done) {
      significantDigits++
    }
  }
  return significantDigits
}

/**
 * Given an array of numbers, return a new array of significant digits needed for each number in the array to
 * distinguish it from the numbers on either side of it. For the first and last numbers, the number of significant
 * digits needed only need consider the second and second to last numbers, respectively. Use
 * `neededSignificantDigits` to determine the number of significant digits needed for each pair of numbers.
 */
export function neededSignificantDigitsArray(numbers: number[]) {
  return numbers.map((num, index) => {
    if (index === 0) {
      return neededSignificantDigits(numbers[1], num)
    } else if (index === numbers.length - 1) {
      return neededSignificantDigits(numbers[numbers.length - 2], num)
    } else {
      return Math.max(neededSignificantDigits(numbers[index - 1], num),
        neededSignificantDigits(numbers[index + 1], num))
    }
  })
}

/**
 * Given an array of quantile boundary values and an array of numbers, return a new array of significant digits
 * needed for each quantile boundary value to distinguish it from the numbers on either side of it in the array.
 * Both the array of quantile boundary values and the array of numbers is assumed to be sorted.
 */
export function neededSigDigitsArrayForQuantiles(quantiles: number[], values: number[]) {

  const sigDigits = (n1: number, n2: number, operator: '<' | '>' | '<=' | '>=') => {
    let significantDigits = 0,
      f: (n: (number | { valueOf(): number })) => string,
      done = false
    while (!done) {
      f = format(`.${significantDigits}r`)
      const n1AfterFormatting = Number(f(n1))
      switch (operator) {
        case '<':
          done = n1AfterFormatting < n2
          break
        case ">":
          done = n1AfterFormatting > n2
          break
        case "<=":
          done = n1AfterFormatting <= n2
          break
        case ">=":
          done = n1AfterFormatting >= n2
      }
      if (!done) {
        significantDigits++
      }
    }
    return significantDigits

  }

  const lastQuantileIndex = quantiles.length - 1,
    lastValuesIndex = values.length - 1
  return quantiles.map((boundaryValue, index) => {
    const
      leftValue = index === 0 ? boundaryValue
        : values.find((value, i) => {
          return i < lastValuesIndex && value < boundaryValue && values[i + 1] >= boundaryValue
        }),
      rightValue = index === lastQuantileIndex ? boundaryValue
        : values.find((value, i) => {
          return i > 0 && value > boundaryValue && values[i - 1] <= boundaryValue
        })
    const
      leftDigits = leftValue !== undefined ? sigDigits(leftValue, boundaryValue,
        index === 0 ? '<=' : '<') : 0,
      rightDigits = rightValue !== undefined ? sigDigits(rightValue, boundaryValue,
        index === lastQuantileIndex ? '>=' : '>') : 0
    return Math.max(leftDigits, rightDigits)
  })
}

export function isFiniteNonEmpty(val:any) {
  return typeof val === 'number' && isFinite(val)
}
