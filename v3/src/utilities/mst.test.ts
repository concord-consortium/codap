import { action, autorun, makeObservable, observable, ObservableSet, reaction } from "mobx"
import { getEnv, Instance, onAction, onPatch, onSnapshot, types } from "mobx-state-tree"

describe("Mobx State Tree", () => {

  it("MST references and safeReferences works in predictable ways", () => {
    const Item = types.model("Item", {
      id: types.identifier
    })
    const Container = types.model("Container", {
      itemMap: types.map(Item),
      itemRefs: types.array(types.reference(Item)),
      itemSafeRefs: types.array(types.safeReference(Item))
    })
    .actions(self => ({
      addItem(item: Instance<typeof Item>) {
        self.itemMap.put(item)
        self.itemRefs.push(item)
        self.itemSafeRefs.push(item)
      },
      clear() {
        self.itemMap.clear()
        self.itemRefs.clear()
        self.itemSafeRefs.clear()
      },
      removeItem(itemId: string) {
        self.itemMap.delete(itemId)
      },
      removeReferences(item: Instance<typeof Item>) {
        self.itemRefs.remove(item)
        self.itemSafeRefs.remove(item)
      }
    }))

    const c = Container.create()
    const i1 = Item.create({ id: "I1" })
    c.addItem(i1)
    expect(c.itemMap.size).toBe(1)
    expect(c.itemRefs.length).toBe(1)
    expect(c.itemSafeRefs.length).toBe(1)
    // removing item from the map destroys it
    c.removeItem(i1.id)
    expect(c.itemMap.size).toBe(0)
    // destroyed item is _not_ automatically removed from arrays of references
    expect(c.itemRefs.length).toBe(1)
    // destroyed item _is_ automatically removed from arrays of safeReferences
    expect(c.itemSafeRefs.length).toBe(0)
    c.clear()

    const i2 = Item.create({ id: "I2" })
    c.addItem(i2)
    // references and safeReferences can be removed with remove(item)
    c.removeReferences(i2)
    expect(c.itemMap.size).toBe(1)
    expect(c.itemRefs.length).toBe(0)
    expect(c.itemSafeRefs.length).toBe(0)
  })

  it("MST destroys objects when removing them from arrays", () => {
    const jestBeforeDestroy = jest.fn()
    const Entry = types.model("Entry", {})
      .actions(self => ({
        beforeDestroy() {
          jestBeforeDestroy()
        }
      }))
    const Container = types.model("Container", {
      array: types.array(Entry)
    })
    .actions(self => ({
      addEntry(entry: Instance<typeof Entry>) {
        self.array.push(entry)
      },
      removeEntry(entry: Instance<typeof Entry>) {
        return self.array.remove(entry)
      }
    }))
    .actions(self => ({
      firstToLast() {
        const entry = self.array.shift()
        entry && self.array.push(entry)
      }
    }))
    const container = Container.create()
    const entry1 = Entry.create()
    const entry2 = Entry.create()
    container.addEntry(entry1)
    container.addEntry(entry2)
    jestSpyConsole("warn", () => {
      container.firstToLast()
    })
    expect(jestBeforeDestroy).toHaveBeenCalledTimes(1)
    container.removeEntry(entry2)
    expect(jestBeforeDestroy).toHaveBeenCalledTimes(2)
  })

  it.skip("can compare observation performance between MobX and MST", () => {
    const kLoopCount = 500

    const results = new Map<string, number | string>()

    function runTest(name: string, fn: () => void) {
      const t0 = performance.now()
      for (let i = 0; i < kLoopCount; ++i) {
        fn()
      }
      const time = Math.round(100 * (performance.now() - t0)) / 100
      results.set(name, time)
    }

    class SimpleTimer {
      value = 0
      listeners: ((v: number) => void)[] = []

      addListener(listener: (v: number) => void) {
        this.listeners.push(listener)
      }

      increment() {
        ++this.value
        this.listeners.forEach(listener => listener(this.value))
      }
    }

    const simple = new SimpleTimer()
    const simpleListener = jest.fn()
    simple.addListener(value => simpleListener(value))
    runTest("Simple timer ", () => simple.increment())
    expect(simpleListener).toHaveBeenCalledTimes(kLoopCount)

    class MobXCounter {
      @observable value = 0

      constructor() {
        makeObservable(this)
      }

      @action increment() { ++this.value }
    }

    const m1 = new MobXCounter()
    const autorunListener = jest.fn()
    let disposer: any = autorun(() => {
      autorunListener(m1.value)
    })
    runTest("MobX autorun", () => m1.increment())
    disposer()
    expect(autorunListener).toHaveBeenCalledTimes(kLoopCount + 1)

    const m2 = new MobXCounter()
    const reactionListener = jest.fn()
    disposer = reaction(() => m2.value, value => reactionListener(value))
    runTest("MobX reaction", () => m2.increment())
    disposer()
    expect(reactionListener).toHaveBeenCalledTimes(kLoopCount)

    const MstCounter = types.model("MSTCounter", {
      value: 0
    })
    .volatile(self => ({
      volatileValue: 0
    }))
    .actions(self => ({
      increment() { ++self.value },
      incVolatile() { ++self.volatileValue },
      incEither(vol = true) { if (vol) ++self.volatileValue; else ++self.value }
    }))
    const m3 = MstCounter.create()
    const mstListener = jest.fn()
    disposer = autorun(() => mstListener(m3.value))
    runTest("MST P autorun", () => m3.increment())
    disposer()
    expect(mstListener).toHaveBeenCalledTimes(kLoopCount + 1)

    const m4 = MstCounter.create()
    mstListener.mockClear()
    disposer = reaction(() => m4.value, value => mstListener(value))
    runTest("MST P reaction", () => m4.increment())
    disposer()
    expect(mstListener).toHaveBeenCalledTimes(kLoopCount)

    const m5 = MstCounter.create()
    mstListener.mockClear()
    disposer = onPatch(m5, () => mstListener(m5.value))
    runTest("MST P onPatch", () => m5.increment())
    disposer()
    expect(mstListener).toHaveBeenCalledTimes(kLoopCount)

    const m6 = MstCounter.create()
    mstListener.mockClear()
    disposer = onSnapshot(m6, () => mstListener(m6.value))
    runTest("MST P onSnapshot", () => m6.increment())
    disposer()
    expect(mstListener).toHaveBeenCalledTimes(kLoopCount)

    const m7 = MstCounter.create()
    mstListener.mockClear()
    disposer = onAction(m7, () => mstListener(m7.value))
    runTest("MST P onAction", () => m7.increment())
    disposer()
    expect(mstListener).toHaveBeenCalledTimes(kLoopCount)

    const m8 = MstCounter.create()
    mstListener.mockClear()
    disposer = autorun(() => mstListener(m8.volatileValue))
    runTest("MST V autorun", () => m8.incVolatile())
    disposer()
    expect(mstListener).toHaveBeenCalledTimes(kLoopCount + 1)

    const m9 = MstCounter.create()
    mstListener.mockClear()
    disposer = reaction(() => m9.volatileValue, value => mstListener(value))
    runTest("MST V reaction", () => m9.incVolatile())
    disposer()
    expect(mstListener).toHaveBeenCalledTimes(kLoopCount)

    const m10 = MstCounter.create()
    mstListener.mockClear()
    disposer = onAction(m10, () => mstListener(m10.value))
    runTest("MST V onAction", () => m10.incVolatile())
    disposer()
    expect(mstListener).toHaveBeenCalledTimes(kLoopCount)

    const m11 = MstCounter.create()
    mstListener.mockClear()
    disposer = onPatch(m11, () => mstListener(m11.value))
    runTest("MST V onPatch", () => m11.incVolatile())
    disposer()
    // changing a volatile property doesn't trigger the onPatch handler
    expect(mstListener).toHaveBeenCalledTimes(0)
    results.set("MST V onPatch", "not called")

    const m12 = MstCounter.create()
    mstListener.mockClear()
    disposer = onSnapshot(m12, () => mstListener(m12.value))
    runTest("MST V onSnapshot", () => m12.incVolatile())
    disposer()
    // changing a volatile property doesn't trigger the onSnapshot handler
    expect(mstListener).toHaveBeenCalledTimes(0)
    results.set("MST V onSnapshot", "not called")

    const m13 = MstCounter.create()
    mstListener.mockClear()
    disposer = autorun(() => mstListener(m13.volatileValue))
    runTest("MST V(P) autorun", () => m13.incEither())
    disposer()
    expect(mstListener).toHaveBeenCalledTimes(kLoopCount + 1)

    const m14 = MstCounter.create()
    mstListener.mockClear()
    disposer = reaction(() => m14.volatileValue, value => mstListener(value))
    runTest("MST V(P) reaction", () => m14.incEither())
    disposer()
    expect(mstListener).toHaveBeenCalledTimes(kLoopCount)

    const m15 = MstCounter.create()
    mstListener.mockClear()
    disposer = onAction(m15, () => mstListener(m15.value))
    runTest("MST V(P) onAction", () => m15.incEither())
    disposer()
    expect(mstListener).toHaveBeenCalledTimes(kLoopCount)

    const m16 = MstCounter.create()
    mstListener.mockClear()
    disposer = onPatch(m16, () => mstListener(m16.value))
    runTest("MST V(P) onPatch", () => m11.incEither())
    disposer()
    // changing a volatile property doesn't trigger the onPatch handler
    expect(mstListener).toHaveBeenCalledTimes(0)
    results.set("MST V(P) onPatch", "not called")

    const m17 = MstCounter.create()
    mstListener.mockClear()
    disposer = onSnapshot(m17, () => mstListener(m17.value))
    runTest("MST V(P) onSnapshot", () => m17.incEither())
    disposer()
    // changing a volatile property doesn't trigger the onSnapshot handler
    expect(mstListener).toHaveBeenCalledTimes(0)
    results.set("MST V(P) onSnapshot", "not called")

    function pad(s: string, length: number) {
      return (`${s}          `).substring(0, length)
    }

    const resultsArray = Array.from(results.entries())
    resultsArray.sort((a, b) => (typeof a[1] === "number" ? a[1] : Infinity) -
                                (typeof b[1] === "number" ? b[1] : Infinity))
    // eslint-disable-next-line no-console
    console.log("Results\n-------\n" +
                `${resultsArray.map(r => `${pad(r[0], 20)}: ${r[1]}`).join("\n")}`)
  })

  it("can observe a volatile set in an MST model", () => {
    const Model = types.model("Model", {
    })
    .volatile(self => ({
      selection: new ObservableSet<string>()
    }))
    .actions(self => ({
      addOne(id: string) {
        self.selection.add(id)
      },
      addTwo(id1: string, id2: string) {
        self.selection.add(id1)
        self.selection.add(id2)
      },
      replace() {
        self.selection = new ObservableSet()
      }
    }))
    const m = Model.create()
    const setListener = jest.fn()
    const setElementListener = jest.fn()
    reaction(() => m.selection, () => setListener())
    autorun(() => {
      m.selection.forEach(s => !!s)
      setElementListener()
    })
    expect(setListener).not.toHaveBeenCalled()
    expect(setElementListener).toHaveBeenCalledTimes(1)
    // add to the set with two separate actions
    setElementListener.mockClear()
    m.addOne("1")
    m.addOne("2")
    expect(setListener).not.toHaveBeenCalled()
    expect(setElementListener).toHaveBeenCalledTimes(2)
    // add two items to the set with one action - only one notification
    setElementListener.mockClear()
    m.addTwo("3", "4")
    expect(setListener).not.toHaveBeenCalled()
    expect(setElementListener).toHaveBeenCalledTimes(1)
    //replace the entire set
    setElementListener.mockClear()
    m.replace()
    expect(setListener).toHaveBeenCalledTimes(1)
    expect(setElementListener).toHaveBeenCalledTimes(1)
  })

  it("adding a model with an environment to a container with a different environment fails", () => {
    const Model = types.model("Model")
    const Container = types.model("Container", {
      model: types.maybe(Model)
    })
    .actions(self => ({
      setModel(_model: any) {
        self.model = _model
      }
    }))
    const envModel = {}
    const envContainer = {}
    const model = Model.create(undefined, envModel)
    expect(getEnv(model)).toBe(envModel)
    const container = Container.create(undefined, envContainer)
    expect(getEnv(container)).toBe(envContainer)
    expect(() => {
      container.setModel(model)
    }).toThrow()
  })
})
