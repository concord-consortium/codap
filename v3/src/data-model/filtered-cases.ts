import { action, computed, makeObservable, observable } from "mobx"
import { ISerializedActionCall, onAction } from "mobx-state-tree"
import { IDataSet } from "./data-set"
import { isSetCaseValuesAction } from "./data-set-actions"

export class FilteredCases {
  private source: IDataSet
  @observable private filter?: (data: IDataSet, caseId: string) => boolean
  private prevCaseIdSet = new Set<string>()
  private onActionDisposers: Array<() => void>

  constructor(source: IDataSet, filter?: (data: IDataSet, caseId: string) => boolean) {
    this.source = source
    this.filter = filter

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
      const filteredCasesDidChange = cases.some(aCase => {
        // compare the pre-/post-change filter state of the affected cases
        const wasIncluded = this.prevCaseIdSet.has(aCase.__id__)
        const nowIncluded = !this.filter || this.filter(this.source, aCase.__id__)
        return nowIncluded !== wasIncluded
      })
      // if any cases changed filter state, invalidate the cached results
      if (filteredCasesDidChange) {
        this.invalidateCases()
      }
    }
  }
}
