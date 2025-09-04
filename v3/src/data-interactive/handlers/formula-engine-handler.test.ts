import { t } from "../../utilities/translation/translate"
import { DIFunctionCategories } from "../data-interactive-types"
import { diFormulaEngineHandler } from "./formula-engine-handler"

// v2Values are based on the v2 response to get formulaEngine with a few changes:
// The k argument to combinations has been made optional (is this correct?)
// Optional filter argugments have been added to several functions
// The following functions have been moved from "Statistical Functions" to "Bivariate Statistical Functions":
//   correlation, rSquared, linRegrSlope, linRegrSESlope, linRegrIntercept, linRegrResidual, linRegrPredicted
import _v2Values from "../../assets/json/di-get-formula-engine-response.json5"
const v2Values = _v2Values as DIFunctionCategories

describe("formulaEngineHandler", () => {
  it("get works as expected", () => {
    const { success, values: _values } = diFormulaEngineHandler.get!({})
    expect(success).toBe(true)
    const values = _values as DIFunctionCategories
    expect(values).toBeDefined()

    Object.keys(v2Values).forEach(categoryName => {
      const v2Category = v2Values[categoryName]
      const category = values[categoryName]
      expect(category).toBeDefined()

      Object.keys(v2Category).forEach(funcName => {
        const v2Func = v2Category[funcName]
        const func = category[funcName]
        expect(func).toBeDefined()
        expect(func.name).toBe(v2Func.name)
        expect(func.displayName).toBe(v2Func.displayName)
        expect(func.description).toBe(v2Func.description)
        expect(func.examples).toEqual(v2Func.examples)
        expect(func.category).toBe(v2Func.category)
        expect(func.minArgs).toBe(v2Func.minArgs)
        expect(func.maxArgs).toBe(v2Func.maxArgs)
      })
    })
  })

  it("evaluates the formula when `evalExpression` is notified", () => {
    const kInvalidRecordString = t("V3.DI.Error.invalidEvaluationRecord")
    const kUndefinedSymbolA = "Error: Undefined symbol a"
    expect(diFormulaEngineHandler.notify?.({}).success).toBe(false)
    expect(diFormulaEngineHandler.notify?.({}, {}).success).toBe(false)
    expect(diFormulaEngineHandler.notify?.({}, { request: "evalExpression" }).success).toBe(false)
    expect(diFormulaEngineHandler.notify?.({}, { request: "evalExpression", source: "" }).success).toBe(false)
    expect(diFormulaEngineHandler.notify?.({}, { request: "evalExpression", source: "1" }).success).toBe(false)
    expect(diFormulaEngineHandler.notify?.({}, {
      request: "evalExpression", source: "1", records: {}
    }).success).toBe(false)
    expect(diFormulaEngineHandler.notify?.({}, {
      request: "evalExpression", source: "1 +", records: []
    }).success).toBe(false)
    expect(diFormulaEngineHandler.notify?.({}, {
      request: "evalExpression", source: "1", records: []
    })).toEqual({ success: true, values: [] })
    expect(diFormulaEngineHandler.notify?.({}, {
      request: "evalExpression", source: "1", records: [1]
    })).toEqual({ success: true, values: [kInvalidRecordString] })
    expect(diFormulaEngineHandler.notify?.({}, {
      request: "evalExpression", source: "1", records: [{}]
    })).toEqual({ success: true, values: [1] })
    expect(diFormulaEngineHandler.notify?.({}, {
      request: "evalExpression", source: "1", records: [{}, {}, {}]
    })).toEqual({ success: true, values: [1, 1, 1] })
    expect(diFormulaEngineHandler.notify?.({}, {
      request: "evalExpression", source: "1", records: [{}, {}, {}]
    })).toEqual({ success: true, values: [1, 1, 1] })
    expect(diFormulaEngineHandler.notify?.({}, {
      request: "evalExpression", source: "a + 1", records: [{}, {}, {}]
    })).toEqual({ success: true, values: [kUndefinedSymbolA, kUndefinedSymbolA, kUndefinedSymbolA] })
    expect(diFormulaEngineHandler.notify?.({}, {
      request: "evalExpression", source: "a + 1", records: [{ a: 1 }, { a: 2 }, { a: 3}]
    })).toEqual({ success: true, values: [2, 3, 4] })
    expect(diFormulaEngineHandler.notify?.({}, {
      request: "evalExpression", source: "floor(a + 1.5)", records: [{ a: 1 }, { a: 2 }, { a: 3}]
    })).toEqual({ success: true, values: [2, 3, 4] })
    expect((diFormulaEngineHandler.notify?.({}, {
      request: "evalExpression", source: "e / a", records: [{ a: Math.E }]
    }).values as any)?.[0]).toBeCloseTo(1)
    expect((diFormulaEngineHandler.notify?.({}, {
      request: "evalExpression", source: "pi / a", records: [{ a: Math.PI }]
    }).values as any)?.[0]).toBeCloseTo(1)
    expect((diFormulaEngineHandler.notify?.({}, {
      request: "evalExpression", source: "π / a", records: [{ a: Math.PI }]
    }).values as any)?.[0]).toBeCloseTo(1)

    // Make sure we're using our own custom functions (in mathjs, = is asignment, but we treat it as equality)
    expect((diFormulaEngineHandler.notify?.({}, {
      request: "evalExpression", source: "Sex = 'M'", records: [{ Sex: "F" }]
    }).values as any)?.[0]).toBe(false)
    expect((diFormulaEngineHandler.notify?.({}, {
      request: "evalExpression", source: "Sex = 'F'", records: [{ Sex: "F" }]
    }).values as any)?.[0]).toBe(true)
  })
})
