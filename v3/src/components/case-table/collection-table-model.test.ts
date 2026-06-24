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

  it("modulates scroll behavior by distance: smooth within one page, instant beyond", () => {
    const m = new CollectionTableModel("id")
    const page = m.gridBodyHeight // one visible page (default height; current scrollTop is 0)
    expect(page).toBeGreaterThan(0)

    // scrolls within one page animate smoothly
    expect(m.scrollBehaviorForTarget(page / 2)).toBe("smooth")
    expect(m.scrollBehaviorForTarget(page)).toBe("smooth")
    // scrolls farther than one page jump instantly to avoid a long, laggy animation
    expect(m.scrollBehaviorForTarget(page + 1)).toBe("auto")
    expect(m.scrollBehaviorForTarget(page * 10)).toBe("auto")

    // an explicitly requested behavior always wins
    expect(m.scrollBehaviorForTarget(page * 10, { scrollBehavior: "smooth" })).toBe("smooth")
    expect(m.scrollBehaviorForTarget(0, { scrollBehavior: "auto" })).toBe("auto")
  })
})
