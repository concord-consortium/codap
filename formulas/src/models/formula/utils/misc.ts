import { parse, MathNode, isFunctionNode } from "mathjs"
import { typedFnRegistry } from "../functions/math"
import { t } from "../../../utilities/translation/translate"

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
