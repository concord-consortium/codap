import { t } from "../../utilities/translation/translate"
import { diFormulaEngineHandler } from "./formula-engine-handler"

describe("formulaEngineHandler", () => {
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
