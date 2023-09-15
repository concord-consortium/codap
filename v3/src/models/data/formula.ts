import { Instance, types } from "mobx-state-tree"
import { parse } from "mathjs"
import { typedId } from "../../utilities/js-utils"
import { canonicalizeExpression, isRandomFunctionPresent } from "./formula-utils"
import { getFormulaManager } from "../tiles/tile-environment"

export const Formula = types.model("Formula", {
  id: types.optional(types.identifier, () => typedId("FORM")),
  display: ""
})
.views(self => ({
  get formulaManager() {
    return getFormulaManager(self)
  },
  get canonical() {
    if (!this.valid) {
      return ""
    }
    if (!this.formulaManager || !self.display) {
      return ""
    }
    const displayNameMap = this.formulaManager.getDisplayNameMapForFormula(self.id)
    return canonicalizeExpression(self.display, displayNameMap)
  },
  get empty() {
    return self.display.length === 0
  },
  get syntaxError() {
    try {
      parse(self.display)
    } catch (error: any) {
      return error.message
    }
    return null
  },
  get valid() {
    return !this.empty && !this.syntaxError
  },
  get isRandomFunctionPresent() {
    return isRandomFunctionPresent(this.canonical)
  },
}))
.actions(self => ({
  setDisplayFormula(displayFormula: string) {
    self.display = displayFormula
  },
  rerandomize() {
    self.formulaManager?.recalculateFormula(self.id)
  }
}))

export interface IFormula extends Instance<typeof Formula> {}
