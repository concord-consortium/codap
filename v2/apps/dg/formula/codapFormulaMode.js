/* Example definition of a simple mode that understands a subset of
 * JavaScript:
 */

sc_require('formula/formula');

/* global CodeMirror */
CodeMirror.defineSimpleMode("codapFormula", {
  // The start state contains the rules that are intially used
  start: [
    // The regex matches the token, the token property contains the type
    {regex: /(?:"(?:[^\\]|\\.)*?(?:"|$))|(?:'(?:[^\\]|\\.)*?(?:'|$))/, token: "string"},
    {regex: /true|false/, token: "atom"},
    {regex: /0x[a-f\d]+|[-+]?(?:\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/i, token: "number"},
    {regex: /[-+\/*=<>!^]+/, token: "operator"},
    {regex: DG.Formula.functionRegExp, token: "function"},
    {regex: DG.Formula.identifierRegExp, token: "variable"},
    {regex: /(?:`(?:[^\\]|\\.)*?(?:`|$))/, token: "variable"}
  ],
  // The meta property contains global information about the mode. It
  // can contain properties like lineComment, which are supported by
  // all modes, and also directives like dontIndentStates, which are
  // specific to simple modes.
  meta: {
    dontIndentStates: ["start"]
  }
});
