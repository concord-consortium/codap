import {FormatLocaleDefinition, formatLocale} from "d3-format"

// locale which uses ASCII minus sign and ignores grouping and currency
const asciiLocale = formatLocale({ minus: "-" } as FormatLocaleDefinition)
const asciiFormat = asciiLocale.format

export function between(num: number, min: number, max: number) {
  return min < max ? (min <= num && num <= max) : (max <= num && num <= min)
}

/* Given two numbers, determine the least number of significant figures needed for their display to distinguish
* between them. */
export function neededSignificantDigits(num1: number, num2: number) {
  let significantDigits = 0,
    f: ReturnType<typeof asciiFormat>,
    done = false
  while (!done) {
    f = asciiFormat(`.${significantDigits}r`)
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
      f: ReturnType<typeof asciiFormat>,
      done = false
    while (!done) {
      f = asciiFormat(`.${significantDigits}r`)
      const n1String = f(n1),
        n1AfterFormatting = Number(n1String)
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

export function isFiniteNumber(x: any): x is number {
  return x != null && Number.isFinite(x)
}

export function goodTickValue(iMin: number, iMax: number) {
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

export function normal(x: number, amp: number, mu: number, sigma: number) {
  const exponent = -(Math.pow(x - mu, 2) / (2 * Math.pow(sigma, 2)))
  return amp * Math.exp(exponent)
}


