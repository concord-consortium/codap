import { getDisplayNameMap } from "@concord-consortium/codap-formulas/models/formula/utils/name-mapping-utils"
import { displayToCanonical } from "@concord-consortium/codap-formulas/models/formula/utils/canonicalization-utils"
import { FormulaMathJsScope } from "../formula-mathjs-scope"
import { evaluate, evaluateForAllCases, getFormulaTestEnv } from "../test-utils/formula-test-utils"
import { UNDEF_RESULT } from "./function-utils"
import { math } from "./math"

describe("local lookup functions", () => {

  describe("first", () => {
    it("returns correct value", () => {
      expect(evaluate("first(Order)")).toBe("Proboscidae")
      expect(evaluate("first(LifeSpan)")).toBe(70)
    })

    it("supports filter expression", () => {
      expect(evaluate("first(Order, Diet = 'plants')")).toBe("Proboscidae")
      expect(evaluate("first(Order, Diet = 'meat')")).toBe("Chiroptera")
      expect(evaluate("first(Order, Diet = 'both')")).toBe("Primate")
      expect(evaluate("first(LifeSpan, Diet = 'plants')")).toBe(70)
      expect(evaluate("first(LifeSpan, Diet = 'meat')")).toBe(19)
      expect(evaluate("first(LifeSpan, Diet = 'both')")).toBe(40)
    })

    it("supports single value argument", () => {
      expect(evaluate("first(1, true)")).toEqual(1)
      expect(evaluate("first(1, false)")).toEqual(UNDEF_RESULT)
    })
  })

  describe("last", () => {
    it("returns correct value", () => {
      expect(evaluate("last(Order)")).toBe("Carnivora")
      expect(evaluate("last(LifeSpan)")).toBe(25)
    })

    it("supports filter expression", () => {
      expect(evaluate("last(Order, Diet = 'plants')")).toBe("Lagomorpha")
      expect(evaluate("last(Order, Diet = 'meat')")).toBe("Carnivora")
      expect(evaluate("last(Order, Diet = 'both')")).toBe("Carnivora")
      expect(evaluate("last(LifeSpan, Diet = 'plants')")).toBe(5)
      expect(evaluate("last(LifeSpan, Diet = 'meat')")).toBe(25)
      expect(evaluate("last(LifeSpan, Diet = 'both')")).toBe(7)
    })

    it("supports single value argument", () => {
      expect(evaluate("last(1, true)")).toEqual(1)
      expect(evaluate("last(1, false)")).toEqual(UNDEF_RESULT)
    })
  })

  describe("prev", () => {
    it("should returns the prev value", () => {
      expect(evaluate("prev(LifeSpan)", 0)).toBe("")
      expect(evaluate("prev(LifeSpan)", 1)).toBe(70)
      expect(evaluate("prev(LifeSpan)", 2)).toBe(70)
      expect(evaluate("prev(LifeSpan)", 3)).toBe(19)
      expect(evaluate("prev(LifeSpan)", 4)).toBe(25)
    })

    it("supports the default value", () => {
      expect(evaluate("prev(LifeSpan, 123)", 0)).toBe(123) // first case
      expect(evaluate("prev(LifeSpan, 123, Diet = 'does not exist')", 12)).toBe(123) // no matching filter
    })

    it("supports the filter argument", () => {
      // When prev is evaluated with filter, it needs to be evaluated for each case using the same scope.
      // That's why evaluateForAllCases is used here.
      expect(evaluateForAllCases("prev(LifeSpan, 0, Diet = 'both')")).toEqual([
        0, 0, 0, 0, 0, 0, 40, 40, 40, 40, 40, 40, 9, 9, 3, 80, 80, 80, 80, 5, 5, 12,
        20, 10, 10, 10, 7
      ])
    })

    it("supports recursive calls", () => {
      expect(evaluateForAllCases("prev(prev(LifeSpan))")).toEqual([
        "", "", 70, 70, 19, 25, 14, 40, 16, 40, 25, 16, 30, 9, 25, 3, 80, 20, 50,
        15, 5, 10, 12, 20, 10, 10, 5
      ])
    })

    it("supports self reference and recursion", () => {
      // Fibonacci sequence
      const options = { formulaAttrName: "LifeSpan" }
      expect(evaluateForAllCases("prev(LifeSpan, 1) + prev(prev(LifeSpan, 0))", options)).toEqual([
        1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765, 10946, 17711, 28657,
        46368, 75025, 121393, 196418
      ])
    })

    it("implements caching that ensures O(n) complexity", () => {
      const { dataSetsByName, dataSets, globalValueManager } = getFormulaTestEnv()
      const localDataSet = dataSetsByName.Mammals
      const caseIds = localDataSet.items.map(c => c.__id__)
      const scope = new FormulaMathJsScope({
        localDataSet,
        dataSets,
        globalValueManager,
        caseIds,
        childMostCollectionCaseIds: caseIds,
      })
      scope.getLocalValue = jest.fn(scope.getLocalValue)

      const displayNameMap = getDisplayNameMap({
        localDataSet,
        dataSets,
        globalValueManager,
      })
      const formula = displayToCanonical("prev(LifeSpan, 0, caseIndex = 1)", displayNameMap)
      const compiledFormula = math.compile(formula)

      const result = caseIds.map((caseId, idx) => {
        scope.setCasePointer(idx)
        const formulaValue = compiledFormula.evaluate(scope)
        scope.savePreviousResult(formulaValue)
        return formulaValue
      })

      const expectedResult = new Array(27).fill(70)
      expectedResult[0] = 0 // default value
      expect(result).toEqual(expectedResult)

      // Local values should be called 54 times (2 times for each case). This is a proof that prev() is evaluated
      // in O(n) time. If it was evaluated in O(n^2) time, it would be called ~729 times (27^2).
      expect(scope.getLocalValue).toHaveBeenCalledTimes(27 * 2)
    })
  })

  describe("next", () => {
    it("should returns the next value", () => {
      expect(evaluate("next(LifeSpan)", 0)).toBe(70)
      expect(evaluate("next(LifeSpan)", 1)).toBe(19)
      expect(evaluate("next(LifeSpan)", 2)).toBe(25)
      expect(evaluate("next(LifeSpan)", 25)).toBe(25)
      expect(evaluate("next(LifeSpan)", 26)).toBe("") // last case
    })

    it("supports the default value", () => {
      expect(evaluate("next(LifeSpan, 123)", 26)).toBe(123) // last case
      expect(evaluate("next(LifeSpan, 123, Diet = 'does not exist')", 12)).toBe(123) // no matching filter
    })

    it("supports the filter argument", () => {
      expect(evaluate("next(LifeSpan, 0, Diet = 'both')", 0)).toBe(40)
      expect(evaluate("next(LifeSpan, 0, Diet = 'both')", 1)).toBe(40)
      expect(evaluate("next(LifeSpan, 0, Diet = 'both')", 5)).toBe(9)
      expect(evaluate("next(LifeSpan, 0, Diet = 'both')", 6)).toBe(9)
      expect(evaluate("next(LifeSpan, 0, Diet = 'both')", 11)).toBe(3)
      expect(evaluate("next(LifeSpan, 0, Diet = 'both')", 12)).toBe(3)
    })

    it("supports recursive calls", () => {
      expect(evaluateForAllCases("next(next(LifeSpan))")).toEqual([
        19, 25, 14, 40, 16, 40, 25, 16, 30, 9, 25, 3, 80, 20, 50, 15, 5, 10, 12,
        20, 10, 10, 5, 7, 25, "", ""
      ])
    })
  })

  it("implements caching that ensures O(n) complexity", () => {
    const { dataSetsByName, dataSets, globalValueManager } = getFormulaTestEnv()
    const localDataSet = dataSetsByName.Mammals
    const caseIds = localDataSet.items.map(c => c.__id__)
    const scope = new FormulaMathJsScope({
      localDataSet,
      dataSets,
      globalValueManager,
      caseIds,
      childMostCollectionCaseIds: caseIds,
    })
    scope.getLocalValue = jest.fn(scope.getLocalValue)

    const displayNameMap = getDisplayNameMap({
      localDataSet,
      dataSets,
      globalValueManager,
    })
    const formula = displayToCanonical("next(LifeSpan, 0, caseIndex = 27)", displayNameMap)
    const compiledFormula = math.compile(formula)

    const result = caseIds.map((caseId, idx) => {
      scope.setCasePointer(idx)
      const formulaValue = compiledFormula.evaluate(scope)
      scope.savePreviousResult(formulaValue)
      return formulaValue
    })

    const expectedResult = new Array(27).fill(25)
    expectedResult[26] = 0 // default value
    expect(result).toEqual(expectedResult)

    // Local values should be called 54 times (2 times for each case). This is a proof that next() is evaluated
    // in O(n) time. If it was evaluated in O(n^2) time, it would be called ~729 times (27^2).
    expect(scope.getLocalValue).toHaveBeenCalledTimes(27 * 2)
  })
})
