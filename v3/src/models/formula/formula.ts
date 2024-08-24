import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { parse } from "mathjs"
import { typedId } from "../../utilities/js-utils"
import { getFormulaManager } from "../tiles/tile-environment"
import { preprocessDisplayFormula } from "./utils/canonicalization-utils"
import { isRandomFunctionPresent } from "./utils/misc"

export const Formula = types.model("Formula", {
  id: types.optional(types.identifier, () => typedId("FORM")),
  display: "",
  _canonical: ""
})
.volatile(self => ({
  canonical: ""
}))
.preProcessSnapshot(snap => {
  if (isOriginalFormulaSnapshot(snap)) {
    const { canonical, ...others } = snap as IOriginalFormulaSnapshot
    return { ...others, _canonical: canonical }
  }
  return snap
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
.actions(self => ({
  afterCreate() {
    self.canonical = self._canonical
  },
  prepareSnapshot() {
    self._canonical = self.canonical
  }
}))

export interface IFormula extends Instance<typeof Formula> {}

export const OriginalFormula = types.model("Formula", {
  id: types.optional(types.identifier, () => typedId("FORM")),
  display: "",
  canonical: ""
})
interface IOriginalFormulaSnapshot extends SnapshotIn<typeof OriginalFormula> {}

export function isOriginalFormulaSnapshot(snap: any): snap is IOriginalFormulaSnapshot {
  return snap != null && typeof snap === "object" && typeof snap.canonical === "string"
}
