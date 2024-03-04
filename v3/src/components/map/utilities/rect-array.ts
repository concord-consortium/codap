import {LatLngBounds} from "leaflet"

export class RectRecord {
  bounds: LatLngBounds
  count: number
  cases: any[]
  selected: boolean

  constructor(bounds: LatLngBounds) {
    this.bounds = bounds
    this.count = 0
    this.cases = []
    this.selected = false
  }
}

export class RectArray {
  maxCount: number
  rectRecords: (RectRecord | undefined)[][]

  constructor() {
    this.maxCount = 0
    this.rectRecords = []
  }

  getRect(iLongIndex: number, iLatIndex: number): RectRecord | undefined {
    return (this.rectRecords[iLongIndex]?.[iLatIndex] !== undefined)
      ? this.rectRecords[iLongIndex][iLatIndex]
      : undefined
  }

  setRect(iLongIndex: number, iLatIndex: number, iRect: RectRecord): void {
    if (!this.rectRecords[iLongIndex]) {
      this.rectRecords[iLongIndex] = []
    }
    this.rectRecords[iLongIndex][iLatIndex] = iRect
  }

  forEachRect(iFunc: (rect:RectRecord, longIndex:number, latIndex:number) => void): void {
    this.rectRecords.forEach((iLongArray, iLongIndex) => {
      iLongArray.forEach((iRect, iLatIndex) => {
        iRect && iFunc(iRect, iLongIndex, iLatIndex)
      })
    })
  }

  addCaseToRect(iLongIndex: number, iLatIndex: number, iCase: any): void {
    const tRect = this.getRect(iLongIndex, iLatIndex)
    if (tRect) {
      tRect.cases.push(iCase)
      tRect.count++
      this.maxCount = Math.max(this.maxCount, tRect.count)
    }
  }

  deleteZeroRects(): void {
    this.rectRecords.forEach((iLongArray, iLongIndex) => {
      iLongArray.forEach((iRect, iLatIndex) => {
        if (iRect?.count === 0) {
          iLongArray[iLatIndex] = undefined
        }
      })
    })
  }

  clear(): void {
    this.rectRecords = []
  }
}
