import { action, computed, makeObservable, observable } from "mobx"
import { ISerializedActionCall } from "mobx-state-tree"
import { typedId } from "../../utilities/js-utils"
import { onAnyAction } from "../../utilities/mst-utils"
import { IDataSet } from "./data-set"
import { isSetCaseValuesAction } from "./data-set-actions"

export type FilterFn = (data: IDataSet, caseId: string, casesArrayNumber?: number) => boolean

export interface IFilteredChangedCases {
  added: string[]   // ids of cases that newly pass the filter
  changed: string[] // ids of cases whose filter status wasn't changed
  removed: string[] // ids of cases that no longer pass the filter
}
export type OnSetCaseValuesFn = (actionCall: ISerializedActionCall, cases: IFilteredChangedCases) => void

interface IProps {
  source: IDataSet
  collectionID?: string
  // Non-zero when there are more than one y-attribute
  casesArrayNumber?: number
  filter?: FilterFn
  onSetCaseValues?: OnSetCaseValuesFn
}

export class FilteredCases {
  public readonly id = typedId("FICA")
  private source: IDataSet
  private collectionID: string | undefined
  private casesArrayNumber: number
  @observable private filter?: FilterFn
  private onSetCaseValues?: OnSetCaseValuesFn

  private prevCaseIdSet = new Set<string>()
  private onActionDisposers: Array<() => void>

  constructor({ source, collectionID, casesArrayNumber = 0, filter, onSetCaseValues }: IProps) {
    this.source = source
    this.collectionID = collectionID
    this.casesArrayNumber = casesArrayNumber
    this.filter = filter
    this.onSetCaseValues = onSetCaseValues

    makeObservable(this)

    this.onActionDisposers = [
      onAnyAction(this.source, this.handleBeforeAction, { attachAfter: false }),  // runs before the action
      onAnyAction(this.source, this.handleAction, { attachAfter: true }),         // runs after the action
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
    const rawCases = this.collectionID ? this.source.getCasesForCollection(this.collectionID) : this.source.cases
    return rawCases
            .map(aCase => aCase.__id__)
            .filter(id => !this.filter || this.filter(this.source, id, this.casesArrayNumber))
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
  setCasesArrayNumber(casesArrayNumber: number) {
    if (this.casesArrayNumber === casesArrayNumber) return
    this.casesArrayNumber = casesArrayNumber
  }

  @action
  setCollectionID(collectionID?: string) {
    if (this.collectionID === collectionID) return
    this.collectionID = collectionID
    this.invalidateCases()
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
