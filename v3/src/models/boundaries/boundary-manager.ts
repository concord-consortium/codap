import { computed, makeObservable, observable, runInAction } from "mobx"
import { kBoundariesRootUrl, kBoundariesSpecUrl, BoundaryInfo, isBoundaryInfo } from "./boundary-types"

export class BoundaryManager {
  @observable.shallow
  private boundaryMap = new Map<string, BoundaryInfo>()

  // set to true when the initial boundary specs have been loaded
  @observable
  boundariesLoaded = false

  // separate observable for remote boundaries for observability
  @observable.shallow
  private remoteBoundaries = new Map<string, any>()

  constructor() {
    makeObservable(this)

    this.fetchBoundarySpecs()
  }

  @computed
  get boundaryKeys() {
    return Array.from(this.boundaryMap.keys())
  }

  async fetchBoundarySpecs() {
    try {
      const response = await fetch(kBoundariesSpecUrl)

      if (response.ok && response.headers.get("content-type")?.includes("application/json")) {
        const boundariesSpecs = await response.json()

        boundariesSpecs.forEach((boundariesSpec: any) => {
          if (isBoundaryInfo(boundariesSpec)) {
            this.boundaryMap.set(boundariesSpec.name, boundariesSpec)
          }
        })

        runInAction(() => {
          this.boundariesLoaded = true
        })
      }
    } catch (error) {
      console.error("Error fetching boundary specs:", error)
    }
  }

  isBoundarySet(name?: string) {
    return !!name && typeof name === "string" && !!this.boundaryMap.get(name)
  }

  hasBoundaryData(name?: string) {
    return !!name && typeof name === "string" && !!this.remoteBoundaries.get(name)
  }

  hasBoundaryDataError(name?: string) {
    return !!name && typeof name === "string" && !!this.boundaryMap.get(name)?.error
  }

  isBoundaryDataPending(name?: string) {
    if (!name || !this.isBoundarySet(name)) return false
    return !!this.boundaryMap.get(name)?.promise && !this.hasBoundaryData(name) && !this.hasBoundaryDataError(name)
  }

  processBoundaryData(boundaryDocument: any) {
    const dataset = boundaryDocument.contexts[0]
    const boundaryCollection = dataset.collections[0]
    const boundaries: Record<number, string> = {}
    boundaryCollection.cases.forEach((aCase: any) => boundaries[aCase.guid] = aCase.values.boundary)

    const keyCollection = dataset.collections[1]
    const _boundaryMap: Record<string, string> = {}
    keyCollection.cases.forEach((aCase: any) => _boundaryMap[aCase.values.key] = boundaries[aCase.parent])
    return _boundaryMap
  }

  getBoundaryData(boundarySet: string, boundaryKey: string) {
    if (!this.isBoundarySet(boundarySet)) return

    // Return the boundary data if it has already been fetched and cached
    const remoteBoundary = this.remoteBoundaries.get(boundarySet)
    if (remoteBoundary) return remoteBoundary[boundaryKey.toLowerCase()]

    // If the boundary info has not yet been fetched, fetch it and return a pending message
    const boundaryInfo = this.boundaryMap.get(boundarySet)
    if (boundaryInfo && !boundaryInfo.promise) {
      boundaryInfo.promise = (async () => {
        try {
          const boundaryResponse = await fetch(`${kBoundariesRootUrl}/${boundaryInfo.url}`)
          const boundary = await boundaryResponse.json()
          boundaryInfo.boundary = this.processBoundaryData(boundary)
          this.remoteBoundaries.set(boundarySet, boundaryInfo.boundary)
          return boundary
        }
        catch (error) {
          console.error(`Error fetching boundary data for "${boundarySet}":`, error)
          boundaryInfo.error = error
        }
      })()
    }

  }
}

export const boundaryManager = new BoundaryManager()
