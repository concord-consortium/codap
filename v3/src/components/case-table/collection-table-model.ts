import { action, makeObservable, observable } from "mobx"
import { ITableScrollInfo, ScrollRowIntoViewFn, TRow } from "./case-table-types"

export class CollectionTableModel {
  collectionId: string
  // RDG grid element
  @observable element: HTMLDivElement | null = null
  // used for controlling sync scrolling
  @observable scrollCount = 0
  // tracks current scrollTop value for grid
  @observable scrollTop = 0

  // rowCache contains all rows, whether collapsed or not; key is [pseudo-]case id
  // RDG memoizes on the row, so we need to pass a new "case" object to trigger a render.
  // Therefore, we cache each case object and update it when appropriate.
  @observable.shallow rowCache = new Map<string, TRow>()

  // rows contains only visible rows, i.e. collapsed rows are filtered out
  // rows are passed directly to RDG for rendering
  @observable.shallow rows: TRow[] = []

  scrollRowIntoView: ScrollRowIntoViewFn = () => null

  constructor(collectionId: string) {
    this.collectionId = collectionId

    makeObservable(this)
  }

  @action syncScrollCount(syncScrollCount: number) {
    this.scrollCount = syncScrollCount
  }

  @action setScrollInfo({ element, scrollCount, scrollRowIntoView }: ITableScrollInfo) {
    this.element = element
    this.scrollCount = scrollCount
    this.scrollRowIntoView = scrollRowIntoView
  }

  @action setScrollTop(scrollTop?: number) {
    this.scrollTop = scrollTop ?? 0
  }

  @action syncScrollTopFromElement() {
    if (this.element) {
      this.scrollTop = this.element.scrollTop
    }
  }

  syncScrollTopToElement() {
    if (this.element) {
      this.element.scrollTop = this.scrollTop
    }
  }

  @action resetRowCache(rowCache: Map<string, TRow>) {
    this.rowCache = rowCache
  }

  @action resetRows(rows: TRow[]) {
    this.rows = rows
  }
}
