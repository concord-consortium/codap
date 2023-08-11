import { Instance, types } from "mobx-state-tree"
import { typedId } from "../../utilities/js-utils"
import { canonicalizeExpression } from "./formula-utils"
import { getFormulaManager } from "./formula-manager"

export const Formula = types.model("Formula", {
  id: types.optional(types.identifier, () => typedId("FORMULA")),
  canonical: ""
})
.views(self => ({
  get valid() {
    return !!self.canonical && self.canonical.length > 0
  },
  get formulaManager() {
    // TODO: this is a current, draft version of the approach to get the formula manager
    return getFormulaManager()
    // Probably we should use code similar to the following:
    // const sharedModelManager = getSharedModelManager(self)
    // const sharedModels = sharedModelManager?.getSharedModelsByType(kFormulaManagerType)
    // return sharedModels?.[0] as IFormulaManager | undefined
  }
}))
.actions(self => ({
  setDisplayFormula(displayFormula: string) {
    const formulaManager = self.formulaManager
    const displayNameMap = formulaManager?.getDisplayNameMapForFormula(self.id)
    this.setCanonical(canonicalizeExpression(displayFormula, displayNameMap))
  },
  setCanonical(canonical: string) {
    self.canonical = canonical
  }
}))

export interface IFormula extends Instance<typeof Formula> {}
