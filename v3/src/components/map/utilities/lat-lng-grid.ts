import {LatLngBounds} from "leaflet"

export class LatLngGridCell {
  bounds: LatLngBounds
  cases: string[]
  selected: boolean

  constructor(bounds: LatLngBounds) {
    this.bounds = bounds
    this.cases = []
    this.selected = false
  }

  get count(): number {
    return this.cases.length
  }
}

export class LatLngGrid {
  initialized: boolean
  maxCount: number
  gridCells: (LatLngGridCell | undefined)[][]

  constructor() {
    this.initialized = false
    this.maxCount = 0
    this.gridCells = []
  }

  getGridCell(iLongIndex: number, iLatIndex: number): LatLngGridCell | undefined {
    return this.gridCells[iLongIndex]?.[iLatIndex]
  }

  setGridCell(iLongIndex: number, iLatIndex: number, latLngGridCell: LatLngGridCell): void {
    if (!this.gridCells[iLongIndex]) {
      this.gridCells[iLongIndex] = []
    }
    this.gridCells[iLongIndex][iLatIndex] = latLngGridCell
  }

  forEachGridCell(iFunc: (gridCell: LatLngGridCell, longIndex: number, latIndex: number) => void): void {
    this.gridCells.forEach((iLongArray, iLongIndex) => {
      iLongArray.forEach((iGridCell, iLatIndex) => {
        iGridCell && iFunc(iGridCell, iLongIndex, iLatIndex)
      })
    })
  }

  setupGridFromBounds(latLongBounds: LatLngBounds | undefined,
                      setGridSize: (iSize: number) => void, getGridSize: () => number):
    { startWest: number, startSouth: number } {


    const kGridCellCount = 20,
      boundsCenter = latLongBounds?.getCenter(),
      refLong = boundsCenter?.lng ?? 0,
      refLat = boundsCenter?.lat ?? 0
    let boundsWest = latLongBounds?.getWest() ?? 0,
      boundsEast = latLongBounds?.getEast() ?? 0,
      boundsSouth = latLongBounds?.getSouth() ?? 0,
      boundsNorth = latLongBounds?.getNorth() ?? 0

    if (boundsWest === boundsEast) {
      boundsWest -= 5 // arbitrary offset
      boundsEast += 5
    }
    if (boundsNorth === boundsSouth) {
      boundsNorth += 5 // arbitrary offset
      boundsSouth -= 5
    }

    setGridSize(Math.min((boundsEast - boundsWest) /
      kGridCellCount, (boundsNorth - boundsSouth) / kGridCellCount))

    const gridSize = getGridSize(),
      numToWest = Math.ceil((refLong - boundsWest) / gridSize),
      startWest = refLong - gridSize * numToWest

    const numToSouth = Math.ceil((refLat - boundsSouth) / gridSize),
      startSouth = refLat - gridSize * numToSouth

    for (let longIndex = 0; longIndex < 2 * numToWest; longIndex++) {
      for (let latIndex = 0; latIndex < 2 * numToSouth; latIndex++) {
        this.setGridCell(longIndex, latIndex, new LatLngGridCell(new LatLngBounds([
          [startSouth + (latIndex + 1) * gridSize, startWest + longIndex * gridSize],
          [startSouth + latIndex * gridSize, startWest + (longIndex + 1) * gridSize]
        ])))
      }
    }
    return {startWest, startSouth}
  }

  zeroCounts(): void {
    this.forEachGridCell((gridCell) => {
      gridCell.cases = []
    })
    this.maxCount = 0
  }

  addCaseToGridCell(iLongIndex: number, iLatIndex: number, iCase: string): void {
    const gridCell = this.getGridCell(iLongIndex, iLatIndex)
    if (gridCell) {
      gridCell.cases.push(iCase)
      this.maxCount = Math.max(this.maxCount, gridCell.count)
    }
  }

  deleteGridCellsWithZeroCount(): void {
    this.gridCells.forEach((iLongArray) => {
      iLongArray.forEach((iGridCell, iLatIndex) => {
        if (iGridCell?.count === 0) {
          iLongArray[iLatIndex] = undefined
        }
      })
    })
  }

  clear(): void {
    this.gridCells = []
  }
}
