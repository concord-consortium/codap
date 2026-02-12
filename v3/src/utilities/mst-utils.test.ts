import { observable, reaction, runInAction, untracked } from "mobx"
import { destroy, getSnapshot, Instance, types } from "mobx-state-tree"
import {
  cachedFnFactory, cachedFnWithArgsFactory, isAliveSafe, observableCachedFnFactory,
  safeGetParent, safeGetSnapshot, typeField, typeOptionalBoolean
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

describe("observableCachedFnFactory", () => {
  // Writing to observable.box values from within an MST view getter (MobX computed) can
  // break MobX's dependency tracking, causing reactions that depend on the computed to
  // stop firing. observableCachedFnFactory avoids this by using a version counter that
  // is only read (never written) from the computed, with writes happening only via
  // invalidate() called from actions.

  // Model that demonstrates the BROKEN pattern: a view getter that writes to observable.box
  // values via runInAction. This works in simple tests but fails in real applications when
  // the computed is part of a larger MST model with multiple action layers.
  const BrokenModel = types.model("BrokenModel", {
    _items: types.array(types.string)
  })
  .extend(self => {
    const _isValid = observable.box(false)
    const _cachedHash = observable.box(0)
    let _cachedIds: string[] = []
    return {
      views: {
        get hash() {
          // ANTI-PATTERN: reading AND writing observables from within a computed.
          // This can break MobX dependency tracking in real applications.
          if (!_isValid.get()) {
            _cachedIds = [...self._items]
            runInAction(() => {
              _cachedHash.set(_cachedIds.length * 100)
              _isValid.set(true)
            })
          }
          return _cachedHash.get()
        }
      },
      actions: {
        appendToCache(items: string[]) {
          if (_isValid.get()) {
            _cachedIds.push(...items)
            _cachedHash.set(_cachedIds.length * 100)
          }
        }
      }
    }
  })
  .actions(self => ({
    addItems(items: string[]) {
      self._items.push(...items)
      self.appendToCache(items)
    }
  }))

  // Model that demonstrates the WORKING pattern: using observableCachedFnFactory with a
  // version counter, and untracked() to prevent observable reads from registering as
  // dependencies of the enclosing computed.
  const WorkingModel = types.model("WorkingModel", {
    _items: types.array(types.string)
  })
  .extend(self => {
    const _isValid = observable.box(false)
    let _cachedIds: string[] = []
    const _hash = observableCachedFnFactory(() => _cachedIds.length * 100, 0)
    function _validate() {
      if (!untracked(() => _isValid.get())) {
        _cachedIds = [...self._items]
        runInAction(() => _isValid.set(true))
        _hash.invalidate()
      }
    }
    return {
      views: {
        get hash() {
          _validate()
          return _hash()
        }
      },
      actions: {
        appendToCache(items: string[]) {
          if (_isValid.get()) {
            _cachedIds.push(...items)
            _hash.invalidate()
          }
        }
      }
    }
  })
  .actions(self => ({
    addItems(items: string[]) {
      self._items.push(...items)
      self.appendToCache(items)
    }
  }))

  it("broken pattern appears to work in simple tests", () => {
    // NOTE: This test passes, but the same pattern fails in real applications with
    // deeper MST action chains (e.g., applyModelChange → addCases → appendItemIdsToCache).
    const model = BrokenModel.create({})
    const effectFn = jest.fn()
    expect(model.hash).toBe(0)
    const dispose = reaction(() => model.hash, (value) => effectFn(value))
    model.addItems(["a", "b", "c"])
    expect(effectFn).toHaveBeenCalledWith(300)
    dispose()
  })

  it("should lazily compute and cache the value", () => {
    const calculate = jest.fn(() => 42)
    const cached = observableCachedFnFactory(calculate, 0)
    expect(calculate).not.toHaveBeenCalled()
    expect(cached()).toBe(42)
    expect(calculate).toHaveBeenCalledTimes(1)
    expect(cached()).toBe(42)
    expect(calculate).toHaveBeenCalledTimes(1)
  })

  it("should recompute after invalidate()", () => {
    let counter = 0
    const cached = observableCachedFnFactory(() => ++counter, 0)
    expect(cached()).toBe(1)
    expect(cached()).toBe(1)
    cached.invalidate()
    expect(cached()).toBe(2)
    expect(cached()).toBe(2)
  })

  it("should trigger MobX reactions when invalidated", () => {
    const model = WorkingModel.create({})
    const effectFn = jest.fn()
    expect(model.hash).toBe(0)
    const dispose = reaction(() => model.hash, (value) => effectFn(value))

    model.addItems(["a", "b", "c"])
    expect(effectFn).toHaveBeenCalledWith(300)

    model.addItems(["d"])
    expect(effectFn).toHaveBeenCalledWith(400)
    expect(effectFn).toHaveBeenCalledTimes(2)

    dispose()
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
