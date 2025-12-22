import { destroy, getSnapshot, Instance, types } from "mobx-state-tree"
import {
  cachedFnFactory, cachedFnWithArgsFactory, isAliveSafe, safeGetParent, safeGetSnapshot,
  typeField, typeOptionalBoolean
} from "./mst-utils"

describe("MST utilities", () => {
  it("safeGetParent works as expected", () => {
    const ParentModel = types.model("ParentModel", {
      child: types.maybe(types.late(() => ChildModel))
    })
    .actions(self => ({
      setChild(_child: Maybe<Instance<typeof ChildModel>>) {
        self.child = _child
      }
    }))
    interface IParentModel extends Instance<typeof ParentModel> {}
    const ChildModel = types.model("ChildModel", {
      value: types.string
    })
    .views(self => ({
      get parent(): Maybe<IParentModel> {
        return safeGetParent<IParentModel>(self)
      }
    }))
    const parent = ParentModel.create({})
    expect(parent.child).toBeUndefined()
    expect(safeGetParent<IParentModel>(parent)).toBeUndefined()

    const child = ChildModel.create({ value: "test" })
    parent.setChild(child)

    expect(parent.child).toBe(child)
    expect(child.parent).toBe(parent)

    parent.setChild(undefined)
    expect(child.parent).toBeUndefined()
  })

  it("safeGetSnapshot, typeField, isAliveSafe work as expected", () => {
    const Model = types.model("Model", {
      foo: typeField("bar"),
    })
    const m = Model.create()
    expect(safeGetSnapshot(undefined)).toBeUndefined()
    expect(safeGetSnapshot(m)).toEqual({ foo: "bar" })
    expect(isAliveSafe(undefined)).toBe(false)
    expect(isAliveSafe(m)).toBe(true)
    destroy(m)
    expect(isAliveSafe(m)).toBe(false)
  })

  it("typeOptionalBoolean works as expected", () => {
    const Model = types.model("Model", {
      bool: typeOptionalBoolean(),
    })
    .actions(self => ({
      setBool(value?: boolean) {
        self.bool = value || undefined
      }
    }))

    const m = Model.create({})
    expect(m.bool).toBeUndefined()
    // check that it is not serialized
    expect(JSON.stringify(getSnapshot(m)).includes("bool")).toBe(false)

    m.setBool(true)
    expect(m.bool).toBe(true)

    m.setBool(false)
    expect(m.bool).toBeUndefined() // should be undefined, not false

    m.setBool(true)
    m.setBool() // set to undefined again
    expect(m.bool).toBeUndefined() // should be undefined again
    // check that it is not serialized
    expect(JSON.stringify(getSnapshot(m)).includes("bool")).toBe(false)
  })
})

describe("cachedFnFactory", () => {
  it("should return a function that lazily caches the value", () => {
    const calculate = jest.fn(() => "foo")
    const cachedFn = cachedFnFactory(calculate)
    expect(calculate).not.toHaveBeenCalled()
    expect(cachedFn()).toEqual("foo")
    expect(cachedFn()).toEqual("foo")
    expect(calculate).toHaveBeenCalledTimes(1)
  })

  it("should return a function that caches the value until invalidate() is called", () => {
    const calculate = jest.fn(() => "foo")
    const cachedFn = cachedFnFactory(calculate)
    expect(cachedFn()).toEqual("foo")
    calculate.mockImplementation(() => "bar")
    expect(cachedFn()).toEqual("foo")
    expect(calculate).toHaveBeenCalledTimes(1)
    cachedFn.invalidate()
    expect(cachedFn()).toEqual("bar")
    expect(cachedFn()).toEqual("bar")
    expect(calculate).toHaveBeenCalledTimes(2)
  })
})

describe("cachedFnWithArgsFactory", () => {
  it("should return a function that lazily caches the value", () => {
    const calculate = jest.fn((a: number, b: number) => a + b)
    const key = jest.fn((a: number, b: number) => `${a}+${b}`)
    const cachedFn = cachedFnWithArgsFactory({ key, calculate, name: "testFn" })
    expect(key).not.toHaveBeenCalled()
    expect(calculate).not.toHaveBeenCalled()
    expect(cachedFn(1, 2)).toEqual(3)
    expect(key).toHaveBeenCalledTimes(1)
    expect(calculate).toHaveBeenCalledTimes(1)
    expect(cachedFn(2, 3)).toEqual(5)
    expect(key).toHaveBeenCalledTimes(2)
    expect(calculate).toHaveBeenCalledTimes(2)
    expect(cachedFn(1, 2)).toEqual(3)
    expect(cachedFn(2, 3)).toEqual(5)
    expect(key).toHaveBeenCalledTimes(4)
    expect(calculate).toHaveBeenCalledTimes(2)
  })

  it("should return a function that caches the value until invalidate() is called", () => {
    const calculate = jest.fn((a: number, b: number) => a + b)
    const key = jest.fn((a: number, b: number) => `${a}+${b}`)
    const cachedFn = cachedFnWithArgsFactory({ key, calculate, name: "testFn" })
    expect(cachedFn(1, 2)).toEqual(3)
    calculate.mockImplementation((a: number, b: number) => a * b)
    expect(cachedFn(1, 2)).toEqual(3)
    expect(calculate).toHaveBeenCalledTimes(1)
    cachedFn.invalidate(1, 2)
    expect(cachedFn(1, 2)).toEqual(2)
    expect(cachedFn(1, 2)).toEqual(2)
    expect(calculate).toHaveBeenCalledTimes(2)
  })
})
