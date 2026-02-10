import type { MathNode } from "mathjs"
import { checkDate } from "../../../utilities/date-utils"
import { isValueNonEmpty } from "../../../utilities/math-utils"
import { FormulaMathJsScope } from "../formula-mathjs-scope"
import { CurrentScope, MathJSPartitionedMap } from "../formula-types"
export { isNumber, isValueNonEmpty } from "../../../utilities/math-utils"

export const UNDEF_RESULT = ""

// CODAP formulas assume that 0 is a truthy value, which is different from default JS behavior. So that, for instance,
// count(attribute) will return a count of valid data values, since 0 is a valid numeric value.
export const isValueTruthy = (value: any) => isValueNonEmpty(value) && value !== false

export const
equal = (a: any, b: any): boolean => {
  // Date objects are compared numerically as seconds
    const [isADate, aDate] = checkDate(a)
    const [isBDate, bDate] = checkDate(b)
    if (isADate) a = aDate.valueOf() / 1000
    if (isBDate) b = bDate.valueOf() / 1000
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

// This function is used to get the root scope (an instance of our FormulaMathJSScope) within custom MathJS functions.
// When the formula expression is executed, the initially passed scope can be wrapped in MathJS's PartitionedMap, which
// is used to store temporary values. This function retrieves the root scope from the PartitionedMap.
// This approach has been recommended by the MathJS maintainer. For more details, see:
// https://github.com/josdejong/mathjs/pull/3150#issuecomment-2248101774
export const getRootScope = (currentScope: CurrentScope): FormulaMathJsScope => {
  return isPartitionedMap(currentScope) ? getRootScope(currentScope.a) : currentScope
}

export const isPartitionedMap = (map: any): map is MathJSPartitionedMap => {
  // We could also check isMap(map.a), but that makes tests and mocking more difficult.
  // The current check is probably specific enough to be safe.
  return map && typeof map.a === "object" && isMap(map.b)
}

export const isMap = (map: any) => {
  const requiredMapMethods = ['get', 'set', 'has', 'delete', 'entries']
  return map && typeof map === 'object' && requiredMapMethods.every(method => typeof map[method] === 'function')
}
