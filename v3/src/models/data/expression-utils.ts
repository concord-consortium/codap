import escapeStringRegexp from "escape-string-regexp"
import { Parser } from "expr-eval"

/*
 * Note that this module currently uses the `expr-eval` npm package for parsing and evaluating
 * expressions because that is what CLUE is currently using. It is anticipated that CODAP's needs
 * will be more sophisticated and so we'll probably end up switching to something like `math.js`.
 */

export const kSerializedXKey = "__x__"
export const kSerializedXKeyRegEx = /__x__/g

export const getEditableExpression = (
  rawExpression: string | undefined, canonicalExpression: string, xName: string
) => {
  // Raw expressions are cleared when x attribute is renamed, in which case
  // we regenerate the "raw" expression from the canonical expression.
  return rawExpression || prettifyExpression(canonicalExpression, xName)
}

export const canonicalizeExpression = (displayExpression: string, xName: string) => {
  if (!displayExpression || !xName) return displayExpression
  let canonicalExpression = displayExpression.replace(new RegExp(escapeStringRegexp(xName), "g"), kSerializedXKey)
  try {
    const parser = new Parser()
    canonicalExpression = parser.parse(canonicalExpression).toString()
  }
  catch (e) {
    // nop
  }
  return canonicalExpression
}

export const prettifyExpression = (canonicalExpression: string | undefined, xName: string) => {
  return canonicalExpression && xName
          ? canonicalExpression.replace(kSerializedXKeyRegEx, xName)
          : canonicalExpression
}

export const validateDisplayExpression = (displayExpression: string, xName: string) => {
  if (!displayExpression || !xName) return
  const canonicalExpression = canonicalizeExpression(displayExpression, xName)
  const parser = new Parser()
  try {
    const parsed = parser.parse(canonicalExpression)
    const unknownVar = parsed.variables().find(variable => variable !== kSerializedXKey)
    if (unknownVar) {
      return `Unrecognized variable "${unknownVar}" in expression.`
    }
    // Attempt an evaluation to check for errors e.g. invalid function names
    parsed.evaluate({[kSerializedXKey]: 1})
  } catch {
    return "Could not understand expression. Make sure you supply all operands " +
    "and use a multiplication sign where necessary, e.g. 3 * x + 4 instead of 3x + 4."
  }
}
