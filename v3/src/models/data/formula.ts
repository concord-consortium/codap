import { types } from "mobx-state-tree"
import { canonicalizeExpression, prettifyExpression } from "./expression-utils"

export const Formula = types.model("Formula", {
  display: types.maybe(types.string),
  canonical: types.maybe(types.string)
})
.actions(self => ({
  setDisplay(display?: string) {
    self.display = display
  },
  setCanonical(canonical?: string) {
    self.canonical = canonical
  },
  canonicalize(xName: string) {
    self.canonical = self.display != null
                      ? canonicalizeExpression(self.display, xName)
                      : undefined
  },
  updateDisplay(xName: string) {
    self.display = prettifyExpression(self.canonical, xName)
  }
}))
.actions(self => ({
  synchronize(xName: string) {
    if (self.display && !self.canonical) {
      self.canonicalize(xName)
    }
    else if (!self.display && self.canonical) {
      self.updateDisplay(xName)
    }
  }
}))
