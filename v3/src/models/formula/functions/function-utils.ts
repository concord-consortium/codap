import { MathNode } from "mathjs"
import { FormulaMathJsScope } from "../formula-mathjs-scope"
import { isValueNonEmpty } from "../../../utilities/math-utils"
export { isNumber, isValueNonEmpty } from "../../../utilities/math-utils"

export const UNDEF_RESULT = ""

// CODAP formulas assume that 0 is a truthy value, which is different from default JS behavior. So that, for instance,
// count(attribute) will return a count of valid data values, since 0 is a valid numeric value.
export const isValueTruthy = (value: any) => isValueNonEmpty(value) && value !== false

export const
equal = (a: any, b: any): boolean => {
  // Checks below might seem redundant once the data set cases start using typed values, but they are not.
  // Note that user might still compare a string with a number unintentionally, and it makes sense to try to cast
  // values when possible, so that the comparison can be performed without forcing users to think about types.
  // Also, there's more ifs than needed, but it lets us avoid unnecessary casts.
  if (typeof a === "boolean" && typeof b !== "boolean") {
    return a === (b === "true")
  }
  if (typeof a !== "boolean" && typeof b === "boolean") {
    return (a === "true") === b
  }
  if (typeof a === "number" && typeof b !== "number") {
    return a === Number(b)
  }
  if (typeof a !== "number" && typeof b === "number") {
    return Number(a) === b
  }
  return a === b
}

export const evaluateNode = (node: MathNode, scope?: FormulaMathJsScope) => {
  return node.compile().evaluate(scope)
}
