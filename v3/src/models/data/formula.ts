import { Instance, types } from "mobx-state-tree"
import { parse } from "mathjs"
import { typedId } from "../../utilities/js-utils"
import { getFormulaManager } from "../tiles/tile-environment"
import {
  canonicalToDisplay, displayToCanonical, isRandomFunctionPresent, preprocessDisplayFormula
} from "./formula-utils"

export const Formula = types.model("Formula", {
  id: types.optional(types.identifier, () => typedId("FORM")),
  display: "",
  canonical: ""
})
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
  setDisplayFormula(displayFormula: string) {
    self.display = displayFormula
    self.canonical = "" // reset canonical formula immediately, in case of errors that are handled below
    if (self.empty || !self.valid || !self.formulaManager) {
      return
    }
    const displayNameMap = self.formulaManager.getDisplayNameMapForFormula(self.id)
    self.canonical = displayToCanonical(self.display, displayNameMap)
  },
  updateDisplayFormula() {
    // This action should be called when one of the attributes is renamed. The canonical form is still valid, while
    // display form needs to be updated. The old display form is used to preserve the user's whitespace / formatting.
    if (self.empty || !self.valid || !self.formulaManager) {
      return
    }
    const canonicalNameMap = self.formulaManager.getCanonicalNameMap(self.id)
    self.display = canonicalToDisplay(self.canonical, self.display, canonicalNameMap)
  },
  rerandomize() {
    self.formulaManager?.recalculateFormula(self.id)
  }
}))

export interface IFormula extends Instance<typeof Formula> {}
