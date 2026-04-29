import { numericFnFactory, numericMultiArgsFnFactory } from "./arithmetic-functions"

// Trig functions are not in the minimal mathjs evaluate/parse/compile dependency set, so they must be
// defined here and registered through CODAP's fnRegistry. The numericFnFactory wrappers ensure
// non-numeric attribute values (empty strings, etc.) propagate as UNDEF_RESULT rather than throwing
// or returning NaN. Set matches v2's documented trig functions (apps/dg/formula/basic_functions.js).
export const trigFunctions = {
  acos: {
    numOfRequiredArguments: 1,
    evaluate: numericFnFactory(Math.acos)
  },

  asin: {
    numOfRequiredArguments: 1,
    evaluate: numericFnFactory(Math.asin)
  },

  atan: {
    numOfRequiredArguments: 1,
    evaluate: numericFnFactory(Math.atan)
  },

  atan2: {
    numOfRequiredArguments: 2,
    evaluate: numericMultiArgsFnFactory(Math.atan2, { numOfRequiredArgs: 2 })
  },

  cos: {
    numOfRequiredArguments: 1,
    evaluate: numericFnFactory(Math.cos)
  },

  sin: {
    numOfRequiredArguments: 1,
    evaluate: numericFnFactory(Math.sin)
  },

  tan: {
    numOfRequiredArguments: 1,
    evaluate: numericFnFactory(Math.tan)
  },
}
