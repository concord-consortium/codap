import { Instance, types } from "mobx-state-tree"
import { typedId } from "../../utilities/js-utils"
import { canonicalizeExpression, isRandomFunctionPresent } from "./formula-utils"
import { getFormulaManager } from "../tiles/tile-environment"

export const Formula = types.model("Formula", {
  id: types.optional(types.identifier, () => typedId("FORMULA")),
  canonical: ""
})
.views(self => ({
  get valid() {
    return !!self.canonical && self.canonical.length > 0
  },
  get formulaManager() {
    return getFormulaManager(self)
  },
  get isRandomFunctionPresent() {
    return isRandomFunctionPresent(self.canonical)
  },
}))
.actions(self => ({
  setDisplayFormula(displayFormula: string) {
    if (!self.formulaManager) {
      return
    }
    const displayNameMap = self.formulaManager.getDisplayNameMapForFormula(self.id)
    this.setCanonical(canonicalizeExpression(displayFormula, displayNameMap))
  },
  setCanonical(canonical: string) {
    self.canonical = canonical
  },
  rerandomize() {
    if (!self.formulaManager) {
      return
    }
    self.formulaManager.recalculateFormula(self.id)
  }
}))

export interface IFormula extends Instance<typeof Formula> {}
