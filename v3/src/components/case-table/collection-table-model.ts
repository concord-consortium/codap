import { action, computed, makeObservable, observable } from "mobx"
import { symParent } from "../../models/data/data-set-types"
import { IDataSetMetadata } from "../../models/shared/data-set-metadata"
import { getNumericCssVariable } from "../../utilities/css-utils"
import { uniqueId } from "../../utilities/js-utils"
import { IScrollOptions, kDefaultRowHeaderHeight, kDefaultRowHeight, TRow } from "./case-table-types"

const kDefaultRowCount = 12
const kDefaultGridHeight = kDefaultRowHeaderHeight + (kDefaultRowCount * kDefaultRowHeight)

function wrapScrollBehavior(element: HTMLElement, fn: (element: HTMLElement) => void, options?: IScrollOptions) {
  if (options?.scrollBehavior) {
    const origScrollBehavior = element.style.scrollBehavior
    element.style.scrollBehavior = options.scrollBehavior
    fn(element)
    element.style.scrollBehavior = origScrollBehavior
  }
  else {
    fn(element)
  }
}

export class CollectionTableModel {
  metadata?: IDataSetMetadata
  collectionId: string
  // RDG grid element
  @observable element: HTMLDivElement | null = null
  // tracks current scrollTop value for grid
  @observable scrollTop = 0
  // tracks the last user- or programmatically-set scrollTop value
  // different from `scrollTop`, which animates to the target in multiple steps
  @observable targetScrollTop = 0
  // scroll steps -- used to distinguish user scrolls from browser-generated smooth scrolls
  lastScrollStep = 0
  scrollStep = 0
  // timers for temporarily disabling sync scroll response
  disableSyncScrollTimers = new Map<string, number>()
  // The index of the input row. -1 puts the input row at the bottom.
  @observable inputRowIndex = -1

  // rowCache contains all rows, whether collapsed or not; key is case id
  // RDG memoizes on the row, so we need to pass a new "case" object to trigger a render.
  // Therefore, we cache each case object and update it when appropriate.
  @observable.shallow rowCache = new Map<string, TRow>()

  // rows contains only visible rows, i.e. collapsed rows are filtered out
  // rows are passed directly to RDG for rendering
  @observable.shallow rows: TRow[] = []

  @observable rowHeight

  constructor(collectionId: string, metadata?: IDataSetMetadata, rowHeight = kDefaultRowHeight) {
    this.metadata = metadata
    this.collectionId = collectionId
    this.rowHeight = rowHeight

    makeObservable(this)
  }

  destroy() {
    this.disableSyncScrollTimers.forEach(timerId => window.clearTimeout(timerId))
  }

  get rowHeaderHeight() {
    return getNumericCssVariable(this.element, "--rdg-row-header-height") ?? kDefaultRowHeaderHeight
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

  get isSyncScrollingResponseDisabled() {
    return this.disableSyncScrollTimers.size > 0
  }

  @action disableSyncScrollingResponse(duration = 1000) {
    const id = uniqueId()
    this.disableSyncScrollTimers.set(id, window.setTimeout(() => {
      this.disableSyncScrollTimers.delete(id)
    }, duration))
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
    let controllingAncestorId = ""
    let firstChildIndex = -1
    let lastChildIndex = -1

    // The offsets are used to expand or shift groups based on the location of the input row
    const getOffsets = () => {
      if (this.inputRowIndex >= 0) {
        if (this.inputRowIndex < firstChildIndex) {
          // The input row is before this group, so the whole thing should be shifted
          return { firstOffset: 1, lastOffset: 1 }
        } else if (this.inputRowIndex >= firstChildIndex && this.inputRowIndex <= lastChildIndex) {
          // The group contains the input row, so the end should be shifted but not the beginning
          return { firstOffset: 0, lastOffset: 1 }
        }
      }
      return { firstOffset: 0, lastOffset: 0 }
    }

    const indexRanges: { id: string, firstChildIndex: number, lastChildIndex: number }[] = []
    this.rows.forEach((row, i) => {
      const currAncestorId = this.metadata?.getCollapsedAncestor(row.__id__) ?? row[symParent]
      if (currAncestorId) {
        if (currAncestorId !== controllingAncestorId) {
          const { firstOffset, lastOffset } = getOffsets()
          controllingAncestorId && indexRanges.push({
            id: controllingAncestorId,
            firstChildIndex: firstChildIndex + firstOffset,
            lastChildIndex: lastChildIndex + lastOffset
          })
          controllingAncestorId = currAncestorId
          firstChildIndex = i
        }
        lastChildIndex = i
      }
    })

    if (firstChildIndex >= 0) {
      const { firstOffset, lastOffset } = this.inputRowIndex === -1
        // If inputRowIndex is -1, the input row is always at the end, so always expands the last group
        ? { firstOffset: 0, lastOffset: 1 }
        : getOffsets()
      indexRanges.push({
        id: controllingAncestorId,
        firstChildIndex: firstChildIndex + firstOffset,
        lastChildIndex: lastChildIndex + lastOffset
      })
    }
    return indexRanges
  }

  shouldHandleScrollEvent() {
    const isForward = this.scrollStep >= 0
    const isBackward = this.scrollStep <= 0
    const wasForward = this.lastScrollStep >= 0
    const wasBackward = this.lastScrollStep <= 0
    // if we're still heading toward the target scroll position, assume it's browser-generated
    const isSmoothScroll = (isForward && wasForward && this.scrollTop <= this.targetScrollTop) ||
                          (isBackward && wasBackward && this.scrollTop >= this.targetScrollTop)
    return !isSmoothScroll
  }

  @action resetRowCache(rowCache: Map<string, TRow>) {
    this.rowCache = rowCache
  }

  @action resetRows(rows: TRow[]) {
    this.rows = rows
  }

  @action setElement(element: HTMLDivElement) {
    this.element = element
  }

  @action setInputRowIndex(inputRowIndex: number) {
    this.inputRowIndex = inputRowIndex
  }

  @action setRowHeight(rowHeight: number) {
    this.rowHeight = rowHeight
  }

  @action syncScrollTopFromEvent(event: React.UIEvent<HTMLDivElement, UIEvent>) {
    const { scrollTop } = event.currentTarget
    this.lastScrollStep = this.scrollStep
    this.scrollStep = scrollTop - this.scrollTop
    this.scrollTop = scrollTop
  }

  setElementScrollTop(scrollTop: number, options?: IScrollOptions) {
    if (this.element) {
      wrapScrollBehavior(this.element, element => {
        this.scrollStep = this.lastScrollStep = 0
        element.scrollTop = scrollTop
        if (options?.disableScrollSync) {
          this.disableSyncScrollingResponse()
        }
      }, options)
    }
  }

  @action setTargetScrollTop(scrollTop: number, options?: IScrollOptions) {
    this.targetScrollTop = scrollTop
    this.setElementScrollTop(scrollTop, options)
  }

  syncScrollTopToElement() {
    // turn off smooth scrolling for this sync
    this.setElementScrollTop(this.scrollTop, { scrollBehavior: "auto" })
  }

  scrollRowToTop(rowIndex: number, options?: IScrollOptions) {
    if (!this.element) return
    this.setTargetScrollTop(rowIndex * this.rowHeight, options)
  }

  scrollRowToBottom(rowIndex: number, options?: IScrollOptions) {
    if (!this.element) return
    this.setTargetScrollTop(Math.max(0, (rowIndex + 1) * this.rowHeight - this.gridBodyHeight), options)
  }

  scrollRowIntoView(rowIndex: number, options?: IScrollOptions) {
    if (!this.element) return
    if (rowIndex < this.firstVisibleRowIndex) {
      this.scrollRowToTop(rowIndex, options)
    }
    else if (rowIndex > this.lastVisibleRowIndex) {
      this.scrollRowToBottom(rowIndex, options)
    }
  }

  scrollRangeIntoView(firstRowIndex: number, lastRowIndex: number, options?: IScrollOptions) {
    const rowCount = lastRowIndex - firstRowIndex + 1
    const allRowsFit = Math.floor(this.gridBodyHeight / this.rowHeight) >= rowCount
    // part or all of range is offscreen below
    if ((firstRowIndex >= this.lastVisibleRowIndex) ||
        (this.isRowVisible(firstRowIndex) && (lastRowIndex > this.lastVisibleRowIndex))) {
      if (allRowsFit) {
        this.scrollRowToBottom(lastRowIndex, options)
      }
      else {
        this.scrollRowToTop(firstRowIndex, options)
      }
    }
    // part or all of range is offscreen above
    else if ((lastRowIndex <= this.firstVisibleRowIndex) ||
            (this.isRowVisible(lastRowIndex) && (firstRowIndex < this.firstVisibleRowIndex))) {
      if (allRowsFit) {
        this.scrollRowToTop(firstRowIndex, options)
      }
      else {
        this.scrollRowToBottom(lastRowIndex, options)
      }
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
    if (this.isSyncScrollingResponseDisabled) return
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
    if (this.isSyncScrollingResponseDisabled) return
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
