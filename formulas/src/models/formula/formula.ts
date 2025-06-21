import { getEnv, hasEnv, IAnyStateTreeNode, Instance, SnapshotIn, types } from "mobx-state-tree"
import { typedId } from "@concord-consortium/codap-utilities/js-utils"
import { IFormulaManager } from "./formula-manager-types"

export interface IFormulaManagerEnvironment
{
  formulaManager?: IFormulaManager
}

export function getFormulaManager(node?: IAnyStateTreeNode) {
  return node && hasEnv(node) ? getEnv<IFormulaManagerEnvironment | undefined>(node)?.formulaManager : undefined
}

export const Formula = types.model("Formula", {
  id: types.optional(types.identifier, () => typedId("FORM")),
  display: ""
})
.volatile(self => ({
  canonical: ""
}))
.views(self => ({
  get formulaManager() {
    const manager = getFormulaManager(self)
    if (!manager) {
      throw new Error("Using the Formula model requires a FormulaManger")
    }
    return manager
  },
  get empty() {
    return self.display.length === 0
  },
}))
.views(self => ({
  get syntaxError() {
    return self.formulaManager.getSyntaxError(self.display)
  },
  get valid() {
    return !self.empty && !this.syntaxError
  },
  get isRandomFunctionPresent() {
    return self.formulaManager.isRandomFunctionPresent(self.canonical)
  },
}))
.actions(self => ({
  setDisplayExpression(displayExpression: string) {
    self.display = displayExpression
  },
  setCanonicalExpression(canonicalExpression: string) {
    self.canonical = canonicalExpression
  },
  rerandomize() {
    self.formulaManager.rerandomize(self.id)
  }
}))

export interface IFormula extends Instance<typeof Formula> {}
export interface IFormulaSnapshot extends SnapshotIn<typeof Formula> {}
