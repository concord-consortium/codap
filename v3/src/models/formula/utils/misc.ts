import { parse, isFunctionNode } from "mathjs/number"
import type { MathNode } from "mathjs"
import { t } from "../../../utilities/translation/translate"
import { typedFnRegistry } from "../functions/math"

export const formulaError = (message: string, vars?: string[]) => `❌ ${t(message, { vars })}`

export const isRandomFunctionPresent = (formulaCanonical: string) => {
  const formulaTree = parse(formulaCanonical)
  let result = false
  const visitNode = (node: MathNode) => {
    if (isFunctionNode(node) && typedFnRegistry[node.fn.name]?.isRandomFunction) {
      result = true
    }
  }
  formulaTree.traverse(visitNode)
  return result
}
