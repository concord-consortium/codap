import {FormatLocaleDefinition, formatLocale} from "d3-format"

export const sqrtTwoPi = Math.sqrt(2 * Math.PI)

// locale which uses ASCII minus sign and ignores grouping and currency
const asciiLocale = formatLocale({ minus: "-" } as FormatLocaleDefinition)
const asciiFormat = asciiLocale.format

export function between(num: number, min: number, max: number) {
  return min < max ? (min <= num && num <= max) : (max <= num && num <= min)
}

// precision >= 0 is decimal places; precision < 0 is places to left of decimal, e.g., -2 rounds to hundreds place
export function roundToPrecision(num: number, precision: number) {
  const factor = Math.pow(10, precision)
  return Math.round(num * factor) / factor
}

  // Determines the number of significant digits/decimal places necessary to represent the specified value.
  // Converts to exponential notation and combines significant digits in mantissa and exponent.
  export function getPrecisionForValue(value?: number): number {
    if (!value) return 0

    // Convert to exponential notation to count significant digits
    const expStr = value.toExponential()
    // Format: "1.5e-1" or "2e+0" or "1.23e-2"

    // Extract mantissa and exponent
    const [mantissaStr, expStr2] = expStr.split('e')
    const exponent = parseInt(expStr2, 10)

    // Count decimal places in mantissa (e.g., "1.5" has 1, "1.23" has 2)
    const decimalIndex = mantissaStr.indexOf('.')
    const mantissaDecimals = decimalIndex === -1 ? 0 : mantissaStr.length - decimalIndex - 1

    // Precision = mantissa decimals - exponent
    // For 0.15: mantissa "1.5" (1 decimal), exponent -1 → 1 - (-1) = 2 ✓
    // For 0.2: mantissa "2" (0 decimals), exponent -1 → 0 - (-1) = 1 ✓
    // For 1000: mantissa "1" (0 decimals), exponent 3 → 0 - 3 = -3 ✓
    return mantissaDecimals - exponent
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

/* Given a n1 < n < n2, return a string representation of n with an appropriate precision. */
export function chooseDecimalPlaces(n: number, lower: number, upper: number) {
  if (n === Math.round(n)) {
    return n.toString()
  }
  // Calculate the span between lower and upper
  const span = upper - lower

  // Logic to choose decimal places based on n's position relative to lower and upper
  let decimalPlaces

  if (span > 10) {
    // Large span - fewer decimal places needed
    decimalPlaces = 0
  } else if (span > 1) {
    // Medium span - moderate precision
    decimalPlaces = 1
  } else if (span > 0.1) {
    // Smaller span - higher precision
    decimalPlaces = 2
  } else {
    // Very small span - highest precision
    decimalPlaces = 3
  }

  // Adjust for the position of n within the span
  if (Math.abs(n - lower) < span * 0.1 || Math.abs(n - upper) < span * 0.1) {
    // If n is very close to lower or upper, show more precision
    decimalPlaces += 1
  }

  // Format n with the chosen number of decimal places
  return n.toFixed(decimalPlaces)
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
 * Given an array of bin boundary values and an array of numbers, return a new array of significant digits
 * needed for each bin boundary value to distinguish it from the numbers on either side of it in the array.
 * Both the array of bin boundary values and the array of numbers is assumed to be sorted.
 */
export function neededSigDigitsArrayForBinBoundaries(binBoundaries: number[], values: number[]) {

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

  const lastBinBoundaryIndex = binBoundaries.length - 1,
    lastValuesIndex = values.length - 1
  return binBoundaries.map((boundaryValue, index) => {
    const
      leftValue = index === 0 ? boundaryValue
        : values.find((value, i) => {
          return i < lastValuesIndex && value < boundaryValue && values[i + 1] >= boundaryValue
        }),
      rightValue = index === lastBinBoundaryIndex ? boundaryValue
        : values.find((value, i) => {
          return i > 0 && value > boundaryValue && values[i - 1] <= boundaryValue
        })
    const
      leftDigits = leftValue !== undefined ? sigDigits(leftValue, boundaryValue,
        index === 0 ? '<=' : '<') : 0,
      rightDigits = rightValue !== undefined ? sigDigits(rightValue, boundaryValue,
        index === lastBinBoundaryIndex ? '>=' : '>') : 0
    return Math.max(leftDigits, rightDigits)
  })
}

export function isFiniteNumber(x: any): x is number {
  return x != null && Number.isFinite(x)
}

export const isValueEmpty = (value: any) => value == null || value === ""

export const isValueNonEmpty = (value: any) => !isValueEmpty(value)

// returns undefined for empty values, and the value itself for non-empty values
export const toNonEmptyValue = (value: any) => isValueEmpty(value) ? undefined : value

// Similar to isFiniteNumber, but looser.
// It allows for strings that can be converted to numbers and treats Infinity and -Infinity as valid numbers.
export const isNumber = (v: any) => isValueNonEmpty(v) && !isNaN(Number(v))

// returns whether the value can be interpreted as a number and if so, its value
// more efficient than isNumber(v) ? Number(v) : NaN because conversion is only performed once
export function checkNumber(value: any) : [false] | [true, number] {
  if (typeof value === "number") return [true, value]
  if (value == null || value === "") return [false]
  if (typeof value === "string" && value.trim() === "") return [false]
  const result = Number(value)
  return isNaN(result) ? [false] : [true, result]
}

export const extractNumeric = (v: any) => {
  if (!isValueNonEmpty(v)) {
    return null
  }

  const num = Number(v)
  if (!isNaN(num)) {
    return num
  }

  // Based on the V2 implementation for backward compatibility.
  if (typeof v === 'string') {
    const noNumberPattern = /[^.\d-]+/gm
    const firstNumericPattern = /(^-?\.?[\d]+(?:\.?[\d]*)?)/gm
    const firstPass = v.replace(noNumberPattern, '')
    const matches = firstPass.match(firstNumericPattern)
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

/**
 * Fits a gaussian to points by least squares using Levenberg–Marquardt.
 * Optimizes mu and sigma (sigma is constrained positive via logSigma).
 * The amplitude is assumed fixed.
 */
export function fitGaussianLM(points: {x:number, y:number}[], amp:number, mu0:number, sigma0:number) {
  if (!points.length) {
    return { mu: mu0, sigma: sigma0 }
  }

  // Normalize x for conditioning, and normalize y by amp (amp assumed fixed)
  const meanX = points.reduce((s, p) => s + p.x, 0) / points.length
  const varX = points.reduce((s, p) => {
    const dx = p.x - meanX
    return s + dx * dx
  }, 0) / points.length
  const scaleX = Math.sqrt(varX) || 1

  const normalizedPoints = points.map(p => ({
    x: (p.x - meanX) / scaleX,
    y: p.y / amp
  }))

  // Initial parameters in normalized space
  let mu = (mu0 - meanX) / scaleX
  let sigma = (sigma0 / scaleX)
  if (!Number.isFinite(sigma) || sigma <= 0) sigma = 1
  let logSigma = Math.log(sigma)

  const maxIterations = 50
  const tol = 1e-12
  let lambda = 1e-3

  function sse(mu1:number, logSigma1:number) {
    const sigma1 = Math.exp(logSigma1)
    return normalizedPoints.reduce((sum, p) => {
      const yhat = normal(p.x, 1, mu1, sigma1)
      const r = p.y - yhat
      return sum + r * r
    }, 0)
  }

  let prevSSE = sse(mu, logSigma)

  for (let iter = 0; iter < maxIterations; iter++) {
    const sigma1 = Math.exp(logSigma)

    // Build normal equations for 2 parameters: [mu, logSigma]
    let a11 = 0, a12 = 0, a22 = 0
    let b1 = 0, b2 = 0

    for (const p of normalizedPoints) {
      const dx = p.x - mu
      const invSigma2 = 1 / (sigma1 * sigma1)
      const g = Math.exp(-0.5 * dx * dx * invSigma2)
      const yhat = g // amp normalized to 1
      const r = p.y - yhat

      // df/dmu and df/dlogSigma (analytic)
      const df_dmu = yhat * (dx * invSigma2)
      const df_dlogSigma = yhat * (dx * dx * invSigma2)

      // Jacobian of residual is negative of df/dtheta
      const j1 = -df_dmu
      const j2 = -df_dlogSigma

      a11 += j1 * j1
      a12 += j1 * j2
      a22 += j2 * j2

      b1 += -j1 * r
      b2 += -j2 * r
    }

    // Levenberg–Marquardt damping
    const d11 = a11 + lambda
    const d22 = a22 + lambda
    const det = d11 * d22 - a12 * a12

    if (!Number.isFinite(det) || Math.abs(det) < 1e-18) {
      lambda *= 10
      continue
    }

    // Solve 2x2: [d11 a12; a12 d22] * [dMu; dLogSigma] = [b1; b2]
    const dMu = (b1 * d22 - b2 * a12) / det
    const dLogSigma = (d11 * b2 - a12 * b1) / det

    if (!Number.isFinite(dMu) || !Number.isFinite(dLogSigma)) {
      lambda *= 10
      continue
    }

    const trialMu = mu + dMu
    const trialLogSigma = logSigma + dLogSigma
    const trialSSE = sse(trialMu, trialLogSigma)

    if (trialSSE < prevSSE) {
      mu = trialMu
      logSigma = trialLogSigma

      const improvement = prevSSE - trialSSE
      prevSSE = trialSSE

      lambda = Math.max(lambda / 10, 1e-12)

      if (Math.abs(dMu) + Math.abs(dLogSigma) < tol || improvement < tol) {
        break
      }
    }
    else {
      lambda *= 10
    }
  }

  const sigmaOut = Math.exp(logSigma) * scaleX
  const muOut = mu * scaleX + meanX

  return { mu: muOut, sigma: sigmaOut }
}

