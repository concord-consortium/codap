import { Instance, types } from "mobx-state-tree"
import { parse } from "mathjs"
import { typedId } from "../../utilities/js-utils"
import { getFormulaManager } from "../tiles/tile-environment"
import { preprocessDisplayFormula } from "./utils/canonicalization-utils"
import { isRandomFunctionPresent } from "./utils/misc"

export const Formula = types.model("Formula", {
  id: types.optional(types.identifier, () => typedId("FORM")),
  display: ""
})
.volatile(self => ({
  canonical: ""
}))
.views(self => ({
  get formulaManager() {
    return getFormulaManager(self)
  },
  get empty() {
    return self.display.length === 0
  },
  get syntaxError() {
    try {
      parse(preprocessDisplayFormula(self.display))
    } catch (error: any) {
      return error.message
    }
    return null
  },
  get valid() {
    return !this.empty && !this.syntaxError
  },
  get isRandomFunctionPresent() {
    return isRandomFunctionPresent(self.canonical)
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
    self.formulaManager?.recalculateFormula(self.id)
  }
}))

export interface IFormula extends Instance<typeof Formula> {}
