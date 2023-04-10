import { getSnapshot, types } from "mobx-state-tree"
import { SharedModelUnion } from "./shared-model-manager"

describe("Shared Models", () => {
  describe("SharedModelUnion", () => {
    it("creates an UnknownSharedModel when an unknown model is loaded", () => {
      const Container = types.model("Container", {
        model: SharedModelUnion
      })

      const container = Container.create({
        model: { id: "1", type: "foo", extra: "stuff"}
      } as any)

      expect(container.model).toBeDefined()
      expect(container.model.type).toBe("unknownSharedModel")
    })

    it("preserves the original tile content even when it is unknown", () => {
      const Container = types.model("Container", {
        model: SharedModelUnion
      })

      const container = Container.create({
        model: { id: "1", type: "foo", extra: "stuff"}
      } as any)

      expect(container.model.type).toBe("unknownSharedModel")
      expect(getSnapshot(container.model)).toEqual({
        id: "1", type: "foo", extra: "stuff"
      })
    })
  })
})
