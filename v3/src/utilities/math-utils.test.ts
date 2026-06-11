import {FormatLocaleDefinition, format, formatLocale} from "d3-format"
import {
  between,
  binBoundaryDecimalPlaces,
  binBoundarySignificantFigures,
  checkNumber,
  chooseDecimalPlaces,
  equalFrequencyBins,
  extractNumeric,
  fitGaussianLM,
  isFiniteNumber,
  isNumber,
  isValueNonEmpty, normal
} from "./math-utils"

// default formatting except uses ASCII minus sign
const asciiLocale = formatLocale({ minus: "-" } as FormatLocaleDefinition)

describe("math-utils", () => {

  describe("d3-format", () => {
    const defaultFormat = format("")
    const asciiFormat = asciiLocale.format("")
    it("supports grouping by default but locale can be configured to ignore grouping", () => {
      const defaultGroupFormat = format(",~g")
      const asciiGroupFormat = asciiLocale.format(",~g")
      expect(defaultGroupFormat(1234)).toBe("1,234")
      expect(asciiGroupFormat(1234)).toBe("1234")
    })
    it("supports currency by default but locale can be configured to ignore currency", () => {
      const defaultCurrencyFormat = format("$~g")
      const asciiCurrencyFormat = asciiLocale.format("$~g")
      expect(defaultCurrencyFormat(123)).toBe("$123")
      expect(asciiCurrencyFormat(123)).toBe("123")
    })
    it("locale can be configured to use ASCII hyphen for minus sign", () => {
      expect(defaultFormat(-1)).not.toBe("-1")
      expect(asciiFormat(-1)).toBe("-1")
    })
  })

  describe("between", () => {
    it("should return true if the value is between the min and max values", () => {
      expect(between(1, 0, 2)).toBe(true)
      expect(between(0, 0, 2)).toBe(true)
      expect(between(2, 0, 2)).toBe(true)
    })
    it("should return false if the value is not between the min and max values", () => {
      expect(between(-1, 0, 2)).toBe(false)
      expect(between(3, 0, 2)).toBe(false)
      expect(between(NaN, 0, 2)).toBe(false)
      expect(between(Infinity, 0, 2)).toBe(false)
    })
  })

  describe("isFiniteNumber", () => {
    it("should return true for finite numbers and false for non-finite numbers", () => {
      expect(isFiniteNumber(1)).toBe(true)
      expect(isFiniteNumber(1.1)).toBe(true)
      expect(isFiniteNumber(0)).toBe(true)
      expect(isFiniteNumber(Infinity)).toBe(false)
      expect(isFiniteNumber(-Infinity)).toBe(false)
      expect(isFiniteNumber(NaN)).toBe(false)
    })
    it("should return false for non-numbers", () => {
      expect(isFiniteNumber("")).toBe(false)
      expect(isFiniteNumber("foo")).toBe(false)
      expect(isFiniteNumber({})).toBe(false)
      expect(isFiniteNumber([])).toBe(false)
      expect(isFiniteNumber(null)).toBe(false)
      expect(isFiniteNumber(undefined)).toBe(false)
      expect(isFiniteNumber(true)).toBe(false)
      expect(isFiniteNumber(false)).toBe(false)
      expect(isFiniteNumber(() => {})).toBe(false)
    })
  })

  describe("isValueNonEmpty", () => {
    it("should return false for empty values", () => {
      expect(isValueNonEmpty("")).toBe(false)
      expect(isValueNonEmpty(null)).toBe(false)
      expect(isValueNonEmpty(undefined)).toBe(false)
    })

    it("should return true for non-empty values", () => {
      expect(isValueNonEmpty("non-empty")).toBe(true)
      expect(isValueNonEmpty(0)).toBe(true)
      expect(isValueNonEmpty(false)).toBe(true)
    })
  })

  describe("isNumber", () => {
    it("should return true for numbers", () => {
      expect(isNumber(0)).toBe(true)
      expect(isNumber("0")).toBe(true)
      expect(isNumber(1.23)).toBe(true)
      expect(isNumber("1.23")).toBe(true)
    })

    it("should return false for non-numbers", () => {
      expect(isNumber("")).toBe(false)
      expect(isNumber("abc")).toBe(false)
      expect(isNumber(null)).toBe(false)
      expect(isNumber(undefined)).toBe(false)
    })
  })

  describe("checkNumber", () => {
    it("should return [true, number] for numbers", () => {
      expect(checkNumber(0)).toEqual([true, 0])
      expect(checkNumber("0")).toEqual([true, 0])
      expect(checkNumber(1.23)).toEqual([true, 1.23])
      expect(checkNumber("1.23")).toEqual([true, 1.23])
    })
    it("should return [false] for non-numbers", () => {
      expect(checkNumber("")).toEqual([false])
      expect(checkNumber(" ")).toEqual([false])
      expect(checkNumber("abc")).toEqual([false])
      expect(checkNumber(null)).toEqual([false])
      expect(checkNumber(undefined)).toEqual([false])
    })
  })

  describe("extractNumeric", () => {
    it("should return null for empty values", () => {
      expect(extractNumeric("")).toBe(null)
      expect(extractNumeric(null)).toBe(null)
      expect(extractNumeric(undefined)).toBe(null)
    })

    it("should return the number for non-empty values", () => {
      expect(extractNumeric("0")).toBe(0)
      expect(extractNumeric("1.23")).toBe(1.23)
      expect(extractNumeric(0)).toBe(0)
      expect(extractNumeric(1.23)).toBe(1.23)
      expect(extractNumeric(false)).toBe(0)
      expect(extractNumeric(true)).toBe(1)
      expect(extractNumeric("1e3")).toBe(1000)
      expect(extractNumeric("1e-3")).toBe(0.001)
      expect(extractNumeric("Infinity")).toBe(Infinity)
      expect(extractNumeric("-Infinity")).toBe(-Infinity)
      expect(extractNumeric("aa123bbb")).toBe(123)
      expect(extractNumeric("123aa456")).toBe(123456)
    })
  })

  describe("chooseDecimalPlaces", () => {
    it("should return no decimals for large spans", () => {
      expect(chooseDecimalPlaces(50.1, 0, 100)).toBe("50")
      expect(chooseDecimalPlaces(-45.9, -100, 10)).toBe("-46")
    })

    it("should return 1 decimal for medium spans", () => {
      expect(chooseDecimalPlaces(1.23, 0, 10)).toBe("1.2")
      expect(chooseDecimalPlaces(-1.23, -10, 0)).toBe("-1.2")
    })

    it("should return 2 decimals for small spans", () => {
      expect(chooseDecimalPlaces(0.123, 0, 1)).toBe("0.12")
      expect(chooseDecimalPlaces(-0.123, -1, 0)).toBe("-0.12")
    })

    it("should return 3 decimals for tiny spans", () => {
      expect(chooseDecimalPlaces(0.0123, 0, 0.1)).toBe("0.012")
      expect(chooseDecimalPlaces(-0.0123, -0.1, 0)).toBe("-0.012")
    })

    it("should return an extra decimal place when near a boundary", () => {
      expect(chooseDecimalPlaces(0.01234, 0, 1)).toBe("0.012")
      expect(chooseDecimalPlaces(0.91234, 0, 1)).toBe("0.912")
    })

  })

  describe("binBoundaryDecimalPlaces", () => {
    it("uses 0 decimals when integer boundaries are already distinct", () => {
      // the narrow-range legend case: boundaries 100..110 by 2 are distinct as integers
      expect(binBoundaryDecimalPlaces([100, 102, 104, 106, 108, 110])).toBe(0)
      expect(binBoundaryDecimalPlaces([0, 25, 50, 75, 100])).toBe(0)
    })

    it("adds just enough decimals to keep closely-spaced boundaries distinct", () => {
      expect(binBoundaryDecimalPlaces([0, 0.3, 0.6])).toBe(1)
      expect(binBoundaryDecimalPlaces([0, 0.01, 0.02])).toBe(2)
    })

    it("does not hang on duplicate adjacent boundaries", () => {
      expect(binBoundaryDecimalPlaces([100, 100, 110])).toBe(0)
    })

    it("respects the maxDecimals cap", () => {
      expect(binBoundaryDecimalPlaces([0, 1e-30], 6)).toBe(6)
    })
  })

  describe("binBoundarySignificantFigures", () => {
    it("returns the minimum uniform significant figures that keep adjacent boundaries distinct", () => {
      // ratio 10: 1 sig fig already distinguishes ("1", "1e+1", "1e+2")
      expect(binBoundarySignificantFigures([1, 10, 100])).toBe(1)
      // ratio 1.1: need 2 sig figs ("100","110","120") — 1 sig fig collapses all to "1e+2"
      expect(binBoundarySignificantFigures([100, 110, 121])).toBe(2)
    })

    it("ignores genuinely-equal adjacent boundaries", () => {
      expect(binBoundarySignificantFigures([5, 5, 10])).toBe(1)
    })

    it("respects the maxSigFigs cap", () => {
      expect(binBoundarySignificantFigures([1, 1.0000000001], 4)).toBe(4)
    })
  })
})

describe("fitGaussianLM", () => {
  test("recovers mu and sigma from exact Gaussian points", () => {
    const amp = 10
    const mu = 5
    const sigma = 2

    const points = [
      { x: mu - 2 * sigma, y: normal(mu - 2 * sigma, amp, mu, sigma) },
      { x: mu - sigma,     y: normal(mu - sigma,     amp, mu, sigma) },
      { x: mu,             y: normal(mu,             amp, mu, sigma) },
      { x: mu + sigma,     y: normal(mu + sigma,     amp, mu, sigma) },
      { x: mu + 2 * sigma, y: normal(mu + 2 * sigma, amp, mu, sigma) }
    ]

    const result = fitGaussianLM(points, amp, mu + 1, sigma * 1.5)

    expect(result.mu).toBeCloseTo(mu, 6)
    expect(result.sigma).toBeCloseTo(sigma, 6)
  })
})

describe("equalFrequencyBins", () => {
  it("reduces to equal-count quantile groups when there are no ties", () => {
    const bins = equalFrequencyBins([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 3)
    expect(bins).toEqual([
      { min: 1, max: 4, count: 4 },
      { min: 5, max: 8, count: 4 },
      { min: 9, max: 12, count: 4 }
    ])
  })

  it("keeps a dominant tie in its own bin so distinct values stay distinct", () => {
    // eight 1s, one 2, one 3 -> {1}{2}{3}, counts (8,1,1)
    const bins = equalFrequencyBins([1, 1, 1, 1, 1, 1, 1, 1, 2, 3], 3)
    expect(bins).toEqual([
      { min: 1, max: 1, count: 8 },
      { min: 2, max: 2, count: 1 },
      { min: 3, max: 3, count: 1 }
    ])
  })

  it("balances the remainder after a dominant tie anchors the first bin", () => {
    // eight 1s, then 2,3,4,5 -> {1}{2,3}{4,5}, counts (8,2,2)
    const bins = equalFrequencyBins([1, 1, 1, 1, 1, 1, 1, 1, 2, 3, 4, 5], 3)
    expect(bins).toEqual([
      { min: 1, max: 1, count: 8 },
      { min: 2, max: 3, count: 2 },
      { min: 4, max: 5, count: 2 }
    ])
  })

  it("balances a top-heavy tie symmetrically (not the lopsided greedy result)", () => {
    // 1,2,3,4 then eight 5s -> {1,2}{3,4}{5x8}, counts (2,2,8). A bottom-up greedy would
    // over-merge the early bins to (3,1,8); the most-equal partition keeps it balanced.
    const bins = equalFrequencyBins([1, 2, 3, 4, 5, 5, 5, 5, 5, 5, 5, 5], 3)
    expect(bins).toEqual([
      { min: 1, max: 2, count: 2 },
      { min: 3, max: 4, count: 2 },
      { min: 5, max: 5, count: 8 }
    ])
  })

  it("sorts unsorted input before binning", () => {
    const bins = equalFrequencyBins([3, 1, 2, 1, 1], 2)
    // sorted [1,1,1,2,3]; most-equal partition is {1,1,1}{2,3}
    expect(bins).toEqual([
      { min: 1, max: 1, count: 3 },
      { min: 2, max: 3, count: 2 }
    ])
  })

  it("returns at most one bin per distinct value when asked for more bins than exist", () => {
    // [1,1,1,2] has 2 distinct values; asking for 5 bins yields 2 (no crash)
    const bins = equalFrequencyBins([1, 1, 1, 2], 5)
    expect(bins).toEqual([
      { min: 1, max: 1, count: 3 },
      { min: 2, max: 2, count: 1 }
    ])
  })

  it("returns an empty array for empty input", () => {
    expect(equalFrequencyBins([], 3)).toEqual([])
  })

  it("matches the brute-force optimal cost on random tie-heavy inputs", () => {
    // Independent O(nBins * D^2) reference for the minimal sum of squared bin counts.
    const bruteOptimalCost = (values: number[], nBins: number) => {
      const sorted = [...values].sort((a, b) => a - b)
      const counts: number[] = []
      let prev: number | undefined
      for (const v of sorted) {
        if (v === prev) {
          counts[counts.length - 1]++
        } else {
          counts.push(1)
          prev = v
        }
      }
      const m = counts.length
      const n = Math.min(nBins, m)
      if (n <= 0) return 0
      const p = [0]
      for (let k = 0; k < m; k++) p.push(p[k] + counts[k])
      const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(Infinity))
      dp[0][0] = 0
      for (let k = 1; k <= n; k++) {
        for (let i = k; i <= m; i++) {
          for (let j = k - 1; j < i; j++) {
            if (dp[k - 1][j] === Infinity) continue
            const seg = p[i] - p[j]
            dp[k][i] = Math.min(dp[k][i], dp[k - 1][j] + seg * seg)
          }
        }
      }
      return dp[n][m]
    }
    const costOf = (bins: Array<{ count: number }>) => bins.reduce((sum, b) => sum + b.count * b.count, 0)

    // Deterministic LCG (Numerical Recipes constants) so any failure is reproducible. State stays
    // below 2^32 and state*1664525 stays within Number.MAX_SAFE_INTEGER, so no bitwise ops needed.
    let state = 123456789
    const rand = () => {
      state = (state * 1664525 + 1013904223) % 4294967296
      return state / 4294967296
    }

    for (let trial = 0; trial < 300; trial++) {
      const len = 1 + Math.floor(rand() * 40)
      // small value range => lots of ties (the degenerate regime this helper targets)
      const values = Array.from({ length: len }, () => Math.floor(rand() * 8))
      const nBins = 1 + Math.floor(rand() * 6)
      const bins = equalFrequencyBins(values, nBins)
      // total count is preserved and the partition is cost-optimal
      expect(costOf(bins)).toBe(bruteOptimalCost(values, nBins))
      expect(bins.reduce((sum, b) => sum + b.count, 0)).toBe(values.length)
    }
  })
})
