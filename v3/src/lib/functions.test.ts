import { typedFnRegistry } from "../models/formula/functions/math"
import { fnDisplayToCanonical } from "../models/formula/utils/canonicalization-utils"
import { functionCategoryInfoArray } from "./functions"

// Every function documented in function-strings.json5 is exposed to users via the
// formula editor's "Functions" menu. This test guards against the kind of regression
// that originally hit CODAP-1273 (trig and string functions silently dropped after
// a mathjs bundle-trimming change): if a documented function is not registered in
// CODAP's fnRegistry, it cannot be evaluated in formulas, and the test fails.
describe("function-strings.json5 vs. fnRegistry", () => {
  const documentedFunctions = functionCategoryInfoArray.flatMap(category =>
    category.functions.map(fn => ({ category: category.category, name: fn.displayName }))
  )

  it.each(documentedFunctions)("registers $name (from $category)", ({ name }) => {
    // Some user-facing names are registered under a canonical alias to avoid colliding with
    // mathjs internals (e.g., "number" → "_number_"). Accept either form.
    const registryKey = fnDisplayToCanonical[name] ?? name
    expect(typedFnRegistry[registryKey]).toBeDefined()
  })
})
