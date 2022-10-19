import { action, computed, makeObservable, observable } from "mobx"
import { ISerializedActionCall, onAction } from "mobx-state-tree"
import { IDataSet } from "./data-set"
import { isSetCaseValuesAction } from "./data-set-actions"

export type FilterFn = (data: IDataSet, caseId: string) => boolean

export interface IFilteredChangedCases {
  added: string[]   // ids of cases that newly pass the filter
  changed: string[] // ids of cases whose filter status wasn't changed
  removed: string[] // ids of cases that no longer pass the filter
}
export type OnSetCaseValuesFn = (actionCall: ISerializedActionCall, cases: IFilteredChangedCases) => void

interface IProps {
  source: IDataSet
  filter?: FilterFn
  onSetCaseValues?: OnSetCaseValuesFn
}

export class FilteredCases {
  private source: IDataSet
  @observable private filter?: FilterFn
  private onSetCaseValues?: OnSetCaseValuesFn

  private prevCaseIdSet = new Set<string>()
  private onActionDisposers: Array<() => void>

  constructor({ source, filter, onSetCaseValues }: IProps) {
    this.source = source
    this.filter = filter
    this.onSetCaseValues = onSetCaseValues

    makeObservable(this)

    this.onActionDisposers = [
      onAction(this.source, this.handleBeforeAction, false),  // runs before the action
      onAction(this.source, this.handleAction, true),         // runs after the action
    ]
  }

  destroy() {
    this.onActionDisposers.forEach(disposer => disposer())
  }

  @computed
  get caseIds(): string[] {
    // MobX will cache the resulting array until either the source's `cases` array changes or the
    // filter function changes, at which point it will run the filter function over all the cases.
    // We could be more efficient if we handled the caching ourselves, e.g. by only filtering new
    // cases when cases are inserted, but that would be more code to write/maintain and running
    // the filter function over an array of cases should be quick so rather than succumb to the
    // temptation of premature optimization, let's wait to see whether it becomes a bottleneck.
    console.log(`In get caseIDs with ${this.source.cases.length} cases at start`)
    return this.source.cases
            .map(aCase => aCase.__id__)
            .filter(id => !this.filter || this.filter(this.source, id))
  }

  @computed
  get caseIdSet(): Set<string> {
    return new Set(this.caseIds)
  }

  hasCaseId = (caseId: string) => {
    return this.caseIdSet.has(caseId)
  }

  @action
  setCaseFilter(caseFilter?: (data: IDataSet, caseId: string) => boolean) {
    this.filter = caseFilter
  }

  @action
  invalidateCases() {
    // invalidate the case caches
    const _caseFilter = this.filter
    this.setCaseFilter()
    this.setCaseFilter(_caseFilter)
  }

  private handleBeforeAction = (actionCall: ISerializedActionCall) => {
    if (isSetCaseValuesAction(actionCall)) {
      // cache the pre-change filter state of the affected cases
      this.prevCaseIdSet.clear()
      const cases = actionCall.args[0]
      cases.forEach(aCase => {
        if (this.hasCaseId(aCase.__id__)) {
          this.prevCaseIdSet.add(aCase.__id__)
        }
      })
    }
  }

  private handleAction = (actionCall: ISerializedActionCall) => {
    if (isSetCaseValuesAction(actionCall)) {
      const cases = actionCall.args[0]
      const added: string[] = []
      const changed: string[] = []
      const removed: string[] = []
      cases.forEach(aCase => {
        // compare the pre-/post-change filter state of the affected cases
        const wasIncluded = this.prevCaseIdSet.has(aCase.__id__)
        const nowIncluded = !this.filter || this.filter(this.source, aCase.__id__)
        if (wasIncluded === nowIncluded) {
          changed.push(aCase.__id__)
        }
        else if (nowIncluded) {
          added.push(aCase.__id__)
        }
        else {
          removed.push(aCase.__id__)
        }
      })
      // if any cases changed filter state, invalidate the cached results
      if (added.length || removed.length) {
        this.invalidateCases()
      }
      // let listeners know how the change affects the filtered cases
      this.onSetCaseValues?.(actionCall, { added, changed, removed })
    }
  }
}
