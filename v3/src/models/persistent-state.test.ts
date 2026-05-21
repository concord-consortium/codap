import { applySnapshot } from "mobx-state-tree"
import { persistentState } from "./persistent-state"

describe("PersistentState", () => {
  it("can toggle toolbarPosition", () => {
    expect(persistentState.toolbarPosition).toBe("Top")
    persistentState.setToolbarPosition("Left")
    expect(persistentState.toolbarPosition).toBe("Left")
    persistentState.setToolbarPosition("Top")
    expect(persistentState.toolbarPosition).toBe("Top")
  })
  it("can toggle disableGraphicsAcceleration", () => {
    // persistentState is a module-level singleton, so a watch-mode re-run
    // can leave disableGraphicsAcceleration at `false` from the previous
    // run. Reset to the documented default (undefined) so the assertion
    // verifies the actual default rather than just any falsy value.
    applySnapshot(persistentState, { toolbarPosition: persistentState.toolbarPosition })
    expect(persistentState.disableGraphicsAcceleration).toBeUndefined()
    persistentState.setDisableGraphicsAcceleration(true)
    expect(persistentState.disableGraphicsAcceleration).toBe(true)
    persistentState.setDisableGraphicsAcceleration(false)
    expect(persistentState.disableGraphicsAcceleration).toBe(false)
  })
})
