import { autorun } from "mobx"
import { DataSet, toCanonical } from "../../models/data/data-set"
import { createDataSetMetadata } from "../../models/shared/data-set-metadata"
import { symFirstChild, symIndex } from "../../models/data/data-set-types"
import { symShownParent, TRow } from "./case-table-types"
import { CollectionTableModel } from "./collection-table-model"

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

  it("adopts a newly attached grid's scroll position", () => {
    // e.g. a collection that was scrolled, hidden, and shown again gets a new grid scrolled to the top
    const m = new CollectionTableModel("id")
    m.syncScrollTopFromEvent({ currentTarget: { scrollTop: 200 } } as React.UIEvent<HTMLDivElement, UIEvent>)
    m.setTargetScrollTop(200)
    expect(m.scrollTop).toBe(200)

    m.setElement({ scrollTop: 0 } as HTMLDivElement)
    expect(m.scrollTop).toBe(0)
    expect(m.targetScrollTop).toBe(0)
  })

  it("aligns with its parent table using the last child of the last visible parent", () => {
    // parent rows G1, G2, G3, sized so that only G1 and G2 are visible
    const parentModel = new CollectionTableModel("parent")
    parentModel.setRowHeight(parentModel.gridBodyHeight / 2)
    parentModel.resetRows(["G1", "G2", "G3"].map(id => ({ __id__: id })))
    expect(parentModel.lastVisibleTargetRow?.__id__).toBe("G2")

    // child rows: G1 has rows 0-2, G2 has rows 3-6, G3 has rows 7-9 (all visible)
    const childModel = new CollectionTableModel("child")
    const childParents = ["G1", "G1", "G1", "G2", "G2", "G2", "G2", "G3", "G3", "G3"]
    childModel.resetRows(childParents.map((parent, i) => ({ __id__: `C${i}`, [symShownParent]: parent })))
    const scrollRowToBottom = jest.spyOn(childModel, "scrollRowToBottom").mockImplementation(() => null)

    // G2's last child (row 6) is aligned with the bottom of the parent's visible rows
    childModel.scrollToAlignWithParent(parentModel)
    expect(scrollRowToBottom).toHaveBeenCalledWith(6)
  })

  describe("when an intervening collection isn't rendered", () => {
    // grandparent "G" > parent "P" > child "C", one attribute per collection
    const setup = () => {
      const data = DataSet.create({ name: "data", collections: [{ name: "G" }, { name: "P" }, { name: "C" }] })
      const [gCollection, pCollection, cCollection] = data.collections
      data.addAttribute({ name: "g" }, { collection: gCollection.id })
      const pAttr = data.addAttribute({ name: "p" }, { collection: pCollection.id })
      data.addAttribute({ name: "c" }, { collection: cCollection.id })
      // child cases are ordered by group: (a,x): 1, 3; (a,y): 2; (b,x): 4
      data.addCases(toCanonical(data, [
        { g: "a", p: "x", c: 1 }, { g: "a", p: "y", c: 2 }, { g: "a", p: "x", c: 3 }, { g: "b", p: "x", c: 4 }
      ]))
      data.validateCases()
      const metadata = createDataSetMetadata(data)
      const childModel = new CollectionTableModel(cCollection.id, metadata)
      const [aCase, bCase] = gCollection.cases
      const [axCase, ayCase, bxCase] = pCollection.cases
      const childRows = () => childModel.createRows(data.getCasesForCollection(cCollection.id))
      return { data, metadata, pAttr, childModel, childRows, aCase, bCase, axCase, ayCase, bxCase,
                gCollection, pCollection, cCollection }
    }

    it("identifies the rendered parent collection", () => {
      const { metadata, pAttr, childModel, gCollection, pCollection, cCollection } = setup()
      expect(childModel.renderedCollectionIds).toEqual([gCollection.id, pCollection.id, cCollection.id])
      expect(childModel.shownParentCollectionId).toBe(pCollection.id)

      metadata.setIsHidden(pAttr.id, true)
      expect(childModel.renderedCollectionIds).toEqual([gCollection.id, cCollection.id])
      expect(childModel.shownParentCollectionId).toBe(gCollection.id)
    })

    it("groups and numbers rows by their parent when every collection is rendered", () => {
      const { childRows, axCase, ayCase, bxCase } = setup()
      const rows = childRows()
      expect(rows.map(row => row[symShownParent])).toEqual([axCase.__id__, axCase.__id__, ayCase.__id__, bxCase.__id__])
      expect(rows.map(row => row[symIndex])).toEqual([0, 1, 0, 0])
      expect(rows.map(row => !!row[symFirstChild])).toEqual([true, false, true, true])
    })

    it("groups and numbers rows by their rendered ancestor", () => {
      const { metadata, pAttr, childModel, childRows, aCase, bCase } = setup()
      metadata.setIsHidden(pAttr.id, true)
      const rows = childRows()
      expect(rows.map(row => row[symShownParent])).toEqual([aCase.__id__, aCase.__id__, aCase.__id__, bCase.__id__])
      expect(rows.map(row => row[symIndex])).toEqual([0, 1, 2, 0])
      expect(rows.map(row => !!row[symFirstChild])).toEqual([true, false, false, true])

      // the relationship lines connect each rendered ancestor to its descendants
      // (the last group is extended to include the input row)
      childModel.resetRows(rows)
      expect(childModel.parentIndexRanges).toEqual([
        { id: aCase.__id__, firstChildIndex: 0, lastChildIndex: 2 },
        { id: bCase.__id__, firstChildIndex: 3, lastChildIndex: 4 }
      ])
    })

    it("numbers rows straight through when no parent collection is rendered", () => {
      const { data, metadata, gCollection, pCollection } = setup()
      gCollection.attributes.forEach(attr => attr && metadata.setIsHidden(attr.id, true))
      const parentModel = new CollectionTableModel(pCollection.id, metadata)
      expect(parentModel.shownParentCollectionId).toBeUndefined()
      const rows = parentModel.createRows(data.getCasesForCollection(pCollection.id))
      expect(rows.map(row => row[symShownParent])).toEqual([undefined, undefined, undefined])
      expect(rows.map(row => row[symIndex])).toEqual([0, 1, 2])
      expect(rows.map(row => !!row[symFirstChild])).toEqual([false, false, false])
    })

    it("ignores collapsed cases in collections that aren't rendered", () => {
      const { metadata, pAttr, childModel, data, aCase, axCase, cCollection } = setup()
      const [firstChildCase] = data.getCasesForCollection(cCollection.id)
      metadata.setIsCollapsed(axCase.__id__, true)
      expect(childModel.getCollapsedAncestor(firstChildCase.__id__)).toBe(axCase.__id__)

      metadata.setIsHidden(pAttr.id, true)
      expect(childModel.getCollapsedAncestor(firstChildCase.__id__)).toBeUndefined()

      metadata.setIsCollapsed(aCase.__id__, true)
      expect(childModel.getCollapsedAncestor(firstChildCase.__id__)).toBe(aCase.__id__)
    })

    it("ignores collapsed ancestors in collections that aren't rendered when reporting collapse state", () => {
      const { metadata, aCase, axCase, gCollection, pCollection } = setup()
      const parentModel = new CollectionTableModel(pCollection.id, metadata)
      metadata.setIsCollapsed(aCase.__id__, true)
      expect(parentModel.isCaseOrAncestorCollapsed(axCase.__id__)).toBe(true)

      gCollection.attributes.forEach(attr => attr && metadata.setIsHidden(attr.id, true))
      expect(parentModel.isCaseOrAncestorCollapsed(axCase.__id__)).toBe(false)

      // the case's own collapse state still counts
      metadata.setIsCollapsed(axCase.__id__, true)
      expect(parentModel.isCaseOrAncestorCollapsed(axCase.__id__)).toBe(true)
    })
  })
})
