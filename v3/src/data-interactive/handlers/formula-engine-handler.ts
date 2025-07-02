import { EvalFunction } from "mathjs"
import { math } from "../../models/formula/functions/math"
import { preprocessDisplayFormula } from "../../models/formula/utils/canonicalization-utils"
import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, diNotImplementedYet } from "../data-interactive-types"
import { errorResult, fieldRequiredResult, valuesRequiredResult } from "./di-results"

export const diFormulaEngineHandler: DIHandler = {
  get: diNotImplementedYet,

  notify: (_resources, values) => {
    if (!values || typeof values !== "object") {
      return valuesRequiredResult
    }
    if (!("request" in values) || values.request !== "evalExpression") {
      return fieldRequiredResult("notify", "formulaEngine", "values.request")
    }

    const formula = "source" in values && typeof values.source === "string" ? values.source : ""
    if (!formula) return fieldRequiredResult("notify", "formulaEngine", "values.source")

    let compiledFormula: EvalFunction
    try {
      const canonicalFormula = preprocessDisplayFormula(formula)
      compiledFormula = math.compile(canonicalFormula)
    }
    catch (e) {
      return errorResult(String(e))
    }

    const records = "records" in values && Array.isArray(values.records) ? values.records : undefined
    if (!records) return fieldRequiredResult("notify", "formulaEngine", "values.records")

    const resultValues = records.map(record => {
      if (record != null && typeof record === "object") {
        const scope = {
          // "e", "pi" are already defined in mathjs
          "π": Math.PI,
          ...record
        }
        try {
          return compiledFormula.evaluate(scope)
        }
        catch (e) {
          return String(e)
        }
      }
      return t("V3.DI.Error.invalidEvaluationRecord")
    })
    return { success: true, values: resultValues }
  }
}

registerDIHandler("formulaEngine", diFormulaEngineHandler)
