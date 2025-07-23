// cf. https://codemirror.net/examples/lang-package/
import { HighlightStyle, LanguageSupport, LRLanguage, syntaxHighlighting } from "@codemirror/language"
import { tags as t } from "@lezer/highlight"
import { jsHighlight } from "./highlight"
import { parser } from "./parser"

import "./formula-highlight.scss"

const parserWithMetadata = parser.configure({
  props: [jsHighlight]
})

const formulaLRLanguage = LRLanguage.define({
  parser: parserWithMetadata
})

export function formulaLanguage() {
  return new LanguageSupport(formulaLRLanguage)
}

export const formulaHighlighter = HighlightStyle.define([
  { tag: t.bool, class: "cm-boolean" },
  { tag: t.variableName, class: "cm-variable" },
  { tag: t.function(t.variableName), class: "cm-function" },
  { tag: t.lineComment, class: "cm-comment" },
  { tag: t.blockComment, class: "cm-comment" },
  { tag: t.number, class: "cm-number" },
  { tag: t.string, class: "cm-string" },
  { tag: t.escape, class: "cm-string" },
  { tag: t.arithmeticOperator, class: "cm-operator" },
  { tag: t.logicOperator, class: "cm-operator" },
  { tag: t.compareOperator, class: "cm-operator" }
])

export const formulaLanguageWithHighlighting = [
  formulaLanguage(),
  syntaxHighlighting(formulaHighlighter)
]
