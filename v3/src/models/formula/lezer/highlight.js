import {styleTags, tags as t} from "@lezer/highlight"

// based on https://github.com/lezer-parser/javascript/blob/34e5de4cb57fe3ef3d8d278c231a634b1f2bad9f/src/highlight.js

// https://lezer.codemirror.net/docs/ref/#highlight.styleTags
export const jsHighlight = styleTags({
  BooleanLiteral: t.bool,
  VariableName: t.variableName,
  "CallExpression/FunctionName": t.function(t.variableName),
  "LineComment Hashbang": t.lineComment,
  BlockComment: t.blockComment,
  Number: t.number,
  String: t.string,
  Escape: t.escape,
  ArithOp: t.arithmeticOperator,
  LogicOp: t.logicOperator,
  CompareOp: t.compareOperator,
  "( )": t.paren
})
