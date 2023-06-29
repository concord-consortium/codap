import { action, computed, makeObservable, observable } from "mobx"
import { TRow } from "./case-table-types"
import { getNumericCssVariable } from "../../utilities/css-utils"
import { symParent } from "../../models/data/data-set-types"

const kDefaultRowHeaderHeight = 30
const kDefaultRowHeight = 18
const kDefaultRowCount = 12
const kDefaultGridHeight = kDefaultRowHeaderHeight + (kDefaultRowCount * kDefaultRowHeight)

export class CollectionTableModel {
  collectionId: string
  // RDG grid element
  @observable element: HTMLDivElement | null = null
  // tracks current scrollTop value for grid
  @observable scrollTop = 0
  // tracks the last user- or programmatically-set scrollTop value
  // different from `scrollTop`, which animates to the target in multiple steps
  @observable targetScrollTop = 0
  // last time table was scrolled programmatically
  lastProgramScrollTime = 0
  // last time a presumed response echo was ignored
  lastIgnoredScrollEventTime = 0

  // rowCache contains all rows, whether collapsed or not; key is [pseudo-]case id
  // RDG memoizes on the row, so we need to pass a new "case" object to trigger a render.
  // Therefore, we cache each case object and update it when appropriate.
  @observable.shallow rowCache = new Map<string, TRow>()

  // rows contains only visible rows, i.e. collapsed rows are filtered out
  // rows are passed directly to RDG for rendering
  @observable.shallow rows: TRow[] = []

  constructor(collectionId: string) {
    this.collectionId = collectionId

    makeObservable(this)
  }

  get rowHeaderHeight() {
    return getNumericCssVariable(this.element, "--rdg-row-header-height") ?? kDefaultRowHeaderHeight
  }

  get rowHeight() {
    return getNumericCssVariable(this.element, "--rdg-row-height") ?? kDefaultRowHeight
  }

  // visible height of the body of the grid, i.e. the rows excluding the header row
  get gridBodyHeight() {
    return (this.element?.getBoundingClientRect().height ?? kDefaultGridHeight) - kDefaultRowHeaderHeight
  }

  getRowTop(rowIndex: number) {
    return rowIndex * this.rowHeight
  }

  getRowBottom(rowIndex: number) {
    return (rowIndex + 1) * this.rowHeight
  }

  @computed get firstVisibleRowIndex() {
    // rounding => first case that is at least half-visible
    return Math.round(this.scrollTop / this.rowHeight)
  }

  @computed get firstVisibleRow(): TRow | undefined {
    return this.rows[this.firstVisibleRowIndex]
  }

  @computed get lastVisibleRowIndex() {
    // rounding => last case that is at least half-visible
    const lastPossibleIndex = Math.round((this.scrollTop + this.gridBodyHeight) / this.rowHeight) - 1
    return Math.min(lastPossibleIndex, this.rows.length - 1)
  }

  @computed get lastVisibleRow(): TRow | undefined {
    return this.rows[this.lastVisibleRowIndex]
  }

  @computed get firstVisibleTargetRowIndex() {
    // rounding => first case that is at least half-visible
    return Math.round(this.targetScrollTop / this.rowHeight)
  }

  @computed get firstVisibleTargetRow(): TRow | undefined {
    return this.rows[this.firstVisibleTargetRowIndex]
  }

  @computed get lastVisibleTargetRowIndex() {
    // rounding => last case that is at least half-visible
    const lastPossibleIndex = Math.round((this.targetScrollTop + this.gridBodyHeight) / this.rowHeight) - 1
    return Math.min(lastPossibleIndex, this.rows.length - 1)
  }

  @computed get lastVisibleTargetRow(): TRow | undefined {
    return this.rows[this.lastVisibleTargetRowIndex]
  }

  @computed get caseRowIndices(): Map<string, number> {
    const rowIndices = new Map<string, number>()
    this.rows.forEach((row, index) => {
      rowIndices.set(row.__id__, index)
    })
    return rowIndices
  }

  getRowIndexOfCase(caseId: string) {
    return this.caseRowIndices.get(caseId) ?? -1
  }

  isRowVisible(rowIndex: number) {
    return (this.firstVisibleRowIndex <= rowIndex) && (rowIndex <= this.lastVisibleRowIndex)
  }

  isCaseVisible(caseId: string) {
    return this.isRowVisible(this.getRowIndexOfCase(caseId))
  }

  getTopOfRowModuloScroll(rowIndex: number) {
    return rowIndex * this.rowHeight - this.scrollTop
  }

  getBottomOfRowModuloScroll(rowIndex: number) {
    return (rowIndex + 1) * this.rowHeight - this.scrollTop
  }

  @computed get parentIndexRanges() {
    let currParentId = ""
    let firstChildIndex = -1
    let lastChildIndex = -1
    const indexRanges: { id: string, firstChildIndex: number, lastChildIndex: number }[] = []
    this.rows.forEach((row, i) => {
      if (row[symParent]) {
        if (row[symParent] !== currParentId) {
          currParentId && indexRanges.push({ id: currParentId, firstChildIndex, lastChildIndex })
          currParentId = row[symParent]
          firstChildIndex = i
        }
        lastChildIndex = i
      }
    })
    if (firstChildIndex >= 0) {
      indexRanges.push({ id: currParentId, firstChildIndex, lastChildIndex })
    }
    return indexRanges
  }

  shouldHandleScrollEvent() {
    const now = Date.now()
    // if this table has been programmatically triggered recently, then
    // assume that this is a propagation event that should be ignored
    const timeSinceProgramScroll = now - this.lastProgramScrollTime
    // with `scroll-behavior: smooth`, a single programmatic scroll can trigger multiple
    // scroll events over a period of time. If we have very recently ignored a similar
    // scroll event, assume this is part of the same sequence and ignore it as well.
    const timeSinceIgnoredScrollResponse = now - this.lastIgnoredScrollEventTime
    // table won't respond to manual scroll events for this long after being programmatically scrolled
    const kProgramScrollTimeOut = 250
    // table won't respond to manual scroll events for this long after ignoring a previous scroll event
    // this can be longer than the `kProgramScrollTimeOut` for an animated sequence of scroll events
    const kIgnoredScrollTimeOut = 60  // 3 frames at 60Hx ~50ms
    const shouldHandle = timeSinceProgramScroll > kProgramScrollTimeOut &&
                          timeSinceIgnoredScrollResponse > kIgnoredScrollTimeOut
    !shouldHandle && (this.lastIgnoredScrollEventTime = now)
    return shouldHandle
  }

  @action resetRowCache(rowCache: Map<string, TRow>) {
    this.rowCache = rowCache
  }

  @action resetRows(rows: TRow[]) {
    this.rows = rows
  }

  @action updateLastProgramScrollTime() {
    this.lastProgramScrollTime = Date.now()
  }

  @action setElement(element: HTMLDivElement) {
    this.element = element
  }

  @action syncScrollTopFromElement() {
    if (this.element) {
      this.scrollTop = this.element.scrollTop
    }
  }

  setElementScrollTop(scrollTop: number) {
    if (this.element) {
      this.element.scrollTop = scrollTop
    }
  }

  @action setTargetScrollTop(scrollTop: number) {
    this.targetScrollTop = scrollTop
    this.setElementScrollTop(scrollTop)
  }

  syncScrollTopToElement() {
    this.setElementScrollTop(this.scrollTop)
  }

  scrollRowToTop(rowIndex: number) {
    if (!this.element) return
    this.setTargetScrollTop(rowIndex * this.rowHeight)
    this.updateLastProgramScrollTime()
  }

  scrollRowToBottom(rowIndex: number) {
    if (!this.element) return
    this.setTargetScrollTop(Math.max(0, (rowIndex + 1) * this.rowHeight - this.gridBodyHeight))
    this.updateLastProgramScrollTime()
  }

  scrollRowIntoView(rowIndex: number) {
    if (!this.element) return
    if (rowIndex < this.firstVisibleRowIndex) {
      this.scrollRowToTop(rowIndex)
    }
    else if (rowIndex > this.lastVisibleRowIndex) {
      this.scrollRowToBottom(rowIndex)
    }
  }

  scrollRangeIntoView(firstRowIndex: number, lastRowIndex: number) {
    // part or all of range is offscreen below
    if ((firstRowIndex >= this.lastVisibleRowIndex) ||
        (this.isRowVisible(firstRowIndex) && (lastRowIndex > this.lastVisibleRowIndex))) {
      this.scrollRowToBottom(lastRowIndex)
    }
    // part or all of range is offscreen above
    else if ((lastRowIndex <= this.firstVisibleRowIndex) ||
            (this.isRowVisible(lastRowIndex) && (firstRowIndex < this.firstVisibleRowIndex))) {
      this.scrollRowToTop(firstRowIndex)
    }
  }

  scrollClosestRowIntoView(rowIndices: number[]) {
    if (!this.element) return
    const viewTop = this.scrollTop
    const viewBottom = viewTop + this.gridBodyHeight
    let closestRow = -1
    let distance = Infinity
    for (let i = 0; i < rowIndices.length; ++i) {
      const rowIndex = rowIndices[i]
      const rowTop = this.getRowTop(rowIndex)
      const rowBottom = this.getRowBottom(rowIndex)
      // at least one row is already visible, no scroll required
      if (rowTop >= viewTop && rowBottom <= viewBottom) return
      if (rowTop < viewTop) {
        if (viewTop - rowTop < distance) {
          closestRow = rowIndex
          distance = viewTop - rowTop
        }
      }
      if (rowBottom > viewBottom) {
        if (rowBottom - viewBottom < distance) {
          closestRow = rowIndex
          distance = rowTop - viewBottom
        }
      }
    }
    if (closestRow >= 0) {
      this.scrollRowIntoView(closestRow)
    }
  }

  /**
   * Scrolls to maintain its relationship with the table on its left.
   *
   * The relationship is defined by the rule that any visible case's parent
   * should be visible.
   *
   * In this case we will scroll this table if first child of the left table's
   * top visible row is lower than the top of this table or the last child of
   * the left table's bottom visible row is higher than the last row.
   */
  scrollToAlignWithParent(parentTableModel: CollectionTableModel) {
    const firstParentRow = parentTableModel.firstVisibleTargetRow
    const lastParentRow = parentTableModel.lastVisibleTargetRow
    let firstChildOfFirstParent: string | undefined
    let lastChildOfLastParent: string | undefined
    for (let i = 0; i < this.rows.length; ++i) {
      if (!firstChildOfFirstParent && (this.rows[i][symParent] === firstParentRow?.__id__)) {
        firstChildOfFirstParent = this.rows[i].__id__
      }
      if (this.rows[i][symParent] === lastParentRow?.__id__) {
        lastChildOfLastParent = this.rows[i].__id__
      }
      if (lastChildOfLastParent && (this.rows[i][symParent] !== firstParentRow?.__id__)) {
        break
      }
    }

    if (firstChildOfFirstParent) {
      const firstChildRowIndex = this.getRowIndexOfCase(firstChildOfFirstParent)
      if (firstChildRowIndex > this.firstVisibleRowIndex) {
        this.scrollRowToTop(firstChildRowIndex)
        return
      }
    }
    if (lastChildOfLastParent) {
      const lastChildRowIndex = this.getRowIndexOfCase(lastChildOfLastParent)
      if (lastChildRowIndex < this.lastVisibleRowIndex) {
        this.scrollRowToBottom(lastChildRowIndex)
      }
    }
  }

  /**
   * Scrolls to maintain its relationship with the table on its right.
   *
   * The relationship is defined by the rule that any visible case's parent
   * should be visible.
   *
   * In this case we will scroll this table if the parent of the right table's
   * top visible row is higher than the top of this table or the parent of the
   * table's bottom visible row is lower than the last row of this table.
   */
  scrollToAlignWithChild(childTableModel: CollectionTableModel) {
    const firstChildRow = childTableModel.firstVisibleTargetRow
    const firstChildRowParent = firstChildRow?.[symParent]
    const lastChildRow = childTableModel.lastVisibleTargetRow
    const lastChildRowParent = lastChildRow?.[symParent]
    if (firstChildRowParent && lastChildRowParent) {
      const firstParentIndex = this.getRowIndexOfCase(firstChildRowParent)
      const lastParentIndex = this.getRowIndexOfCase(lastChildRowParent)
      this.scrollRangeIntoView(firstParentIndex, lastParentIndex)
    }
  }
}
