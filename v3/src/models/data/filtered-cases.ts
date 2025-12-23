import { action, computed, makeObservable, observable, runInAction } from "mobx"
import { addDisposer, ISerializedActionCall } from "mobx-state-tree"
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
  private source?: IDataSet
  private collectionID: string | undefined
  private casesArrayNumber: number
  @observable private filter?: FilterFn
  private onSetCaseValues?: OnSetCaseValuesFn

  private prevCaseIdSet = new Set<string>()
  private disposers: Array<() => void>

  // Manual caching for caseIds and caseIdSet to avoid recomputation outside reactive context
  private _cachedCaseIds: string[] = []
  private _cachedCaseIdSet: Set<string> = new Set()
  @observable private _isValidCaseIds = false

  constructor({ source, collectionID, casesArrayNumber = 0, filter, onSetCaseValues }: IProps) {
    this.source = source
    this.collectionID = collectionID
    this.casesArrayNumber = casesArrayNumber
    this.filter = filter
    this.onSetCaseValues = onSetCaseValues

    makeObservable(this)

    this.disposers = [
      addDisposer(source, () => this.source = undefined),
      onAnyAction(this.source, this.handleBeforeAction, { attachAfter: false }),  // runs before the action
      onAnyAction(this.source, this.handleAction, { attachAfter: true }),         // runs after the action
    ]
  }

  destroy() {
    this.disposers.forEach(disposer => disposer())
  }

  @computed
  get rawCaseIds() {
    const rawCases = this.collectionID
                      ? this.source?.getCasesForCollection(this.collectionID) ?? []
                      : this.source?.items ?? []
    return rawCases.map(aCase => aCase.__id__)
  }

  private validateCaseIds() {
    if (!this._isValidCaseIds) {
      this._cachedCaseIds = this.rawCaseIds
            .filter(id => !this.filter || (this.source && this.filter(this.source, id, this.casesArrayNumber)))
      this._cachedCaseIdSet = new Set(this._cachedCaseIds)
      runInAction(() => { this._isValidCaseIds = true })
    }
  }

  get caseIds(): string[] {
    this.validateCaseIds()
    return this._cachedCaseIds
  }

  get caseIdSet(): Set<string> {
    this.validateCaseIds()
    return this._cachedCaseIdSet
  }

  hasCaseId = (caseId: string) => {
    return this.caseIdSet.has(caseId)
  }

  @action
  setCasesArrayNumber(casesArrayNumber: number) {
    if (this.casesArrayNumber === casesArrayNumber) return
    this.casesArrayNumber = casesArrayNumber
    this._isValidCaseIds = false
  }

  @action
  setCollectionID(collectionID?: string) {
    if (this.collectionID === collectionID) return
    this.collectionID = collectionID
    this.invalidateCases()
  }

  @action
  invalidateCases() {
    this._isValidCaseIds = false
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
        const nowIncluded = !this.filter || (this.source && this.filter(this.source, aCase.__id__))
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
