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
    expect(persistentState.disableGraphicsAcceleration).toBeUndefined()
    persistentState.setDisableGraphicsAcceleration(true)
    expect(persistentState.disableGraphicsAcceleration).toBe(true)
    persistentState.setDisableGraphicsAcceleration(false)
    expect(persistentState.disableGraphicsAcceleration).toBe(false)
  })
})
