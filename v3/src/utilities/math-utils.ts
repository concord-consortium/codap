import {FormatLocaleDefinition, formatLocale} from "d3-format"

export const sqrtTwoPi = Math.sqrt(2 * Math.PI)

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

export const isValueNonEmpty = (value: any) => value !== "" && value != null

// Similar to isFiniteNumber, but looser.
// It allows for strings that can be converted to numbers and treats Infinity and -Infinity as valid numbers.
export const isNumber = (v: any) => isValueNonEmpty(v) && !isNaN(Number(v))

export const extractNumeric = (v: any) => {
  if (!isValueNonEmpty(v)) {
    return null
  }

  const num = Number(v)
  if (!isNaN(num)) {
    return num
  }

  // Based on the V2 implementation for the backward compatibility.
  if (typeof v === 'string') {
    const noNumberPatt = /[^.\d-]+/gm
    const firstNumericPatt = /(^-?\.?[\d]+(?:\.?[\d]*)?)/gm
    const firstPass = v.replace(noNumberPatt, '')
    const matches = firstPass.match(firstNumericPatt)
    v = matches ? matches[0] : null
  }
  return isValueNonEmpty(v) ? Number(v) : null
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

// The normal distribution function. The amplitude is the height of the curve at the mean.
// The mean is the center of the curve. The sigma is the standard deviation of the curve.
// The formula for the normal distribution is:
// f(x) = amplitude * exp(-(x - mean)^2 / (2 * sigma^2))
export function normal(x: number, amp: number, mu: number, sigma: number) {
  const exponent = -(Math.pow(x - mu, 2) / (2 * Math.pow(sigma, 2)))
  return amp * Math.exp(exponent)
}

/**
 * Get the quantile
 * sortedArray is an array of finite numeric values (no non-numeric or missing values allowed)
 * quantile [0.0-1.0] to calculate, e.g. first quartile = 0.25
 * return quantile value or undefined if ioArray has no elements
 */
export function quantileOfSortedArray (sortedArray:number[], quantile:number) {
  const lastIndex = sortedArray.length - 1,
    i = lastIndex * quantile, // quantile's numeric-real index in 0-(n-1) array
    i1 = Math.floor(i),
    i2 = Math.ceil(i),
    fraction = i - i1
  if (i < 0) {
    return undefined // length === 0, or quantile < 0.0
  } else if (i >= lastIndex) {
    return sortedArray[lastIndex] // quantile >= 1.0
  } else if (i === i1) {
    return sortedArray[i1] // quantile falls on data value exactly
  } else {
    // quantile between two data values
    // note that quantile algorithms vary on method used to get value here, there is no fixed standard.
    return (sortedArray[i2] * fraction + sortedArray[i1] * (1.0 - fraction))
  }
}



type XYToNumberFunction = (x: number, y: number) => number

/**
 * Gradient descent algorithm that fits a gaussian to points that are typically the top-middles of
 * a histogram by least squares optimizing mu and sigma. The amplitude is assumed to be fixed.
 */
export function fitGaussianGradientDescent(points: {x:number, y:number}[], amp:number, mu0:number, sigma0:number) {

  function sumOfSquares(points1: {x:number, y:number}[], amp1:number, mu1:number, sigma1:number) {
    return points1.reduce(function(sum, p) {
      return sum + Math.pow(p.y - normal(p.x, amp1, mu1, sigma1), 2)
    }, 0)
  }

  // Function to compute the gradient of f at (x, y)
  function gradient(f:XYToNumberFunction, x:number, y:number, h?:number) {
    h = h || 1e-3
    const fxPlus = f(x + h, y),
      fxMinus = f(x - h, y),
      dfdx = (fxPlus - fxMinus) / (2 * h),
      fyPlus = f(x, y + h),
      fyMinus = f(x, y - h),
      dfdy = (fyPlus - fyMinus) / (2 * h)
    return [dfdx, dfdy]
  }

  // Gradient Descent function to find local minimum of f(x, y)
  function gradientDescent(f:XYToNumberFunction, x0:number, y0:number, numericRange:number) {

    const learningRate = 0.001,
      iterations = 1000,
      tolerance = 1e-5
    let x = x0, y = y0, prevValue = f(x, y)/*,
         logInterval = iterations / 10*/

    for (let i = 0; i < iterations; i++) {
      const gradient_ = gradient(f, x, y, numericRange / 100),
        dfdx = gradient_[0],
        dfdy = gradient_[1]

      // Update x and y
      x -= learningRate * dfdx
      y -= learningRate * dfdy

      const newValue = f(x, y)
      if (Math.abs(newValue - prevValue) < tolerance) {
        break
      }
      prevValue = newValue
    }

    return [x, y]
  }

  /**
   * We define this function to pass to gradientDescent, which expects a function of two variables.
   */
  function fToMinimize(mu:number, sigma:number) {
    return sumOfSquares(points, amp, mu, sigma)
  }

  const muSigma = gradientDescent(fToMinimize, mu0, sigma0, sigma0)

  return { mu: muSigma[0], sigma: muSigma[1] }
}

