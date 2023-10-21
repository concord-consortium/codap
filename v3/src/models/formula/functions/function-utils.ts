import { MathNode } from "mathjs"
import { FormulaMathJsScope } from "../formula-mathjs-scope"

export const UNDEF_RESULT = ""

export const isValueNonEmpty = (value: any) => value !== "" && value !== null && value !== undefined

// `isNumber` should be consistent within all formula functions. If more advanced parsing is necessary, MathJS
// provides its own `number` helper might be worth considering. However, besides hex number parsing, I haven't found
// any other benefits of using it (and hex numbers support doesn't seem to be necessary).
export const isNumber = (v: any) => isValueNonEmpty(v) && !isNaN(Number(v))

// CODAP formulas assume that 0 is a truthy value, which is different from default JS behavior. So that, for instance,
// count(attribute) will return a count of valid data values, since 0 is a valid numeric value.
export const isValueTruthy = (value: any) => isValueNonEmpty(value) && value !== false

export const equal = (a: any, b: any): boolean | boolean[] => {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.map((v, i) => equal(v, b[i])) as boolean[]
  }
  if (Array.isArray(a) && !Array.isArray(b)) {
    return a.map((v) => equal(v, b)) as boolean[]
  }
  if (!Array.isArray(a) && Array.isArray(b)) {
    return b.map((v) => equal(v, a)) as boolean[]
  }
  // Checks below might seem redundant once the data set cases start using typed values, but they are not.
  // Note that user might still compare a string with a number unintentionally, and it makes sense to try to cast
  // values when possible, so that the comparison can be performed without forcing users to think about types.
  // Also, there's more ifs than needed, but it lets us avoid unnecessary casts.
  if (typeof a === "number" && typeof b !== "number") {
    return a === Number(b)
  }
  if (typeof a !== "number" && typeof b === "number") {
    return Number(a) === b
  }
  if (typeof a === "boolean" && typeof b !== "boolean") {
    return a === (b === "true")
  }
  if (typeof a !== "boolean" && typeof b === "boolean") {
    return (a === "true") === b
  }
  return a === b
}

export const evaluateNode = (node: MathNode, scope?: FormulaMathJsScope) => {
  return node.compile().evaluate(scope)
}
