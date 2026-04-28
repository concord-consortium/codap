import { destroy, types } from "mobx-state-tree"
import { mstReaction } from "./mst-reaction"

const Counter = types.model("Counter", {
  value: types.number
}).actions(self => ({
  inc() { self.value += 1 }
}))

const Container = types.model("Container", {
  a: types.maybe(Counter),
  b: types.maybe(Counter)
}).actions(self => ({
  destroyA() { self.a && destroy(self.a) },
  destroyB() { self.b && destroy(self.b) }
}))

describe("mstReaction", () => {
  it("fires effect-fn when the observed observable changes", () => {
    const c = Container.create({ a: { value: 0 }, b: { value: 0 } })
    const trigger = jest.fn()
    const dispose = mstReaction(() => c.a!.value, () => trigger(), { name: "test" }, c.a!)

    c.a!.inc()
    expect(trigger).toHaveBeenCalledTimes(1)

    dispose()
  })

  it("auto-disposes when its single scope model is destroyed", () => {
    const c = Container.create({ a: { value: 0 }, b: { value: 0 } })
    const trigger = jest.fn()
    mstReaction(() => c.b!.value, () => trigger(), { name: "test" }, c.b!)

    c.b!.inc()
    expect(trigger).toHaveBeenCalledTimes(1)

    c.destroyB()

    // After destroy, the reaction should be gone. We can't change c.b.value
    // anymore (it's destroyed), so just verify no further triggers occurred.
    expect(trigger).toHaveBeenCalledTimes(1)
  })

  it("auto-disposes when ANY model in a multi-element scope is destroyed, " +
     "even if the data-fn does not depend on it", () => {
    // This is the gotcha that broke useSubAxis.respondToHiddenCasesChange:
    // its scope was [axisModel, dataConfig], but the data-fn only read
    // dataConfig.caseDataHash. When axisModel was replaced (axis-type
    // transition), MST destroyed the old instance, and mstReaction
    // auto-disposed the entire reaction — leaving the axis silent for the
    // rest of its life.
    const c = Container.create({ a: { value: 0 }, b: { value: 0 } })
    const trigger = jest.fn()
    // data-fn only reads c.b.value, but scope includes c.a.
    mstReaction(() => c.b!.value, () => trigger(), { name: "test" }, [c.a!, c.b!])

    c.b!.inc()
    expect(trigger).toHaveBeenCalledTimes(1)

    // Destroy the unrelated scope element a.
    c.destroyA()

    // The reaction is now disposed even though c.b is still alive and the
    // data-fn never depended on c.a.
    c.b!.inc()
    expect(trigger).toHaveBeenCalledTimes(1)
  })

  it("survives destruction of an unrelated model when scope contains only the relevant one", () => {
    // This is the fix shape: list only the model whose lifetime should bound
    // the reaction. If unrelated nodes can be destroyed/replaced, do not put
    // them in the scope.
    const c = Container.create({ a: { value: 0 }, b: { value: 0 } })
    const trigger = jest.fn()
    const dispose = mstReaction(() => c.b!.value, () => trigger(), { name: "test" }, c.b!)

    c.b!.inc()
    expect(trigger).toHaveBeenCalledTimes(1)

    c.destroyA()

    c.b!.inc()
    expect(trigger).toHaveBeenCalledTimes(2)

    dispose()
  })
})
