import { autorun } from "mobx"
import { CollectionTableModel } from "./collection-table-model"
import { TRow } from "./case-table-types"

describe("CollectionTableModel", () => {
  it("rowCache changes are shallowly observable", () => {
    const m = new CollectionTableModel("id")
    const callback = jest.fn()
    const disposer = autorun(() => {
      const rowEntries: TRow[] = []
      m.rowCache.forEach(row => rowEntries.push(row))
      expect(rowEntries.length).toBe(m.rowCache.size)
      callback()
    })
    // autorun executes initially
    expect(callback).toHaveBeenCalledTimes(1)

    // autorun executes on adding a row entry (but warns on change outside of action)
    const row1: TRow = { __id__: "1", foo: "bar" }
    jestSpyConsole("warn", spy => {
      m.rowCache.set("1", { __id__: "1" })
      expect(spy).toHaveBeenCalledTimes(1)
    })
    expect(callback).toHaveBeenCalledTimes(2)

    // autorun doesn't run on changes to internals of row model
    row1.foo = "baz"
    row1.bar = "roo"
    expect(callback).toHaveBeenCalledTimes(2)

    // autorun executes on removing a row entry (but warns on change outside of action)
    jestSpyConsole("warn", spy => {
      m.rowCache.delete("1")
      expect(spy).toHaveBeenCalledTimes(2)
    })
    expect(callback).toHaveBeenCalledTimes(3)

    // autorun executes on replacing rowCache
    m.resetRowCache(new Map())
    expect(callback).toHaveBeenCalledTimes(4)

    disposer()
  })
})
