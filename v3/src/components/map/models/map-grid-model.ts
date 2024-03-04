import {addDisposer, Instance, SnapshotIn, types} from "mobx-state-tree"
import {LatLngBounds} from "leaflet"
import {applyUndoableAction} from "../../../models/history/apply-undoable-action"
import {RectArray, RectRecord} from "../utilities/rect-array"
import {getLatLongBounds} from "../utilities/map-utils"
import {reaction} from "mobx"
import {IDataConfigurationModel} from "../../data-display/models/data-configuration-model"

export const MapGridModel = types.model("MapGridModel", {
  isVisible: false,
  _gridMultiplier: 1,
})
  .volatile(() => ({
    dataConfiguration: undefined as IDataConfigurationModel | undefined,
    rectArray: new RectArray(),
    _gridSize: 0,  // degrees
    _dynamicGridMultiplier: undefined as number | undefined  // Used during slider drag
  }))
  .actions(self => ({
    setIsVisible(isVisible: boolean) {
      self.isVisible = isVisible
    },
    setGridWidth(gridSize: number) {
      self._gridSize = gridSize
    },
    setDataConfiguration(dataConfiguration: IDataConfigurationModel) {
      self.dataConfiguration = dataConfiguration
    },
    setDynamicGridMultiplier(multiplier: number) {
      self._dynamicGridMultiplier = multiplier
    },
    setGridMultiplier(multiplier: number) {
      self._gridMultiplier = multiplier
      self._dynamicGridMultiplier = undefined
    }
  }))
  .views(self => ({
    get gridMultiplier() {
      return self._dynamicGridMultiplier ?? self._gridMultiplier
    },
    get gridSize() {
      return self._gridSize * this.gridMultiplier
    },
    get maxCount() {
      return self.rectArray.maxCount
    },
    forEachRect(iFunc: (rect: RectRecord, longIndex: number, latIndex: number) => void): void {
      self.rectArray.forEachRect(iFunc)
    }
  }))
  .extend((self) => {
    const kGridCellCount = 20
    let startSouth: number, startWest: number

    const setupRectangles = () => {
      const rectArray = self.rectArray,
        latLongBounds = self.dataConfiguration ? getLatLongBounds(self.dataConfiguration) : undefined,
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

      self.setGridWidth(Math.min((boundsEast - boundsWest) /
        kGridCellCount, (boundsNorth - boundsSouth) / kGridCellCount))

      const gridSize = self.gridSize,
        numToWest = Math.ceil((refLong - boundsWest) / gridSize)
      startWest = refLong - gridSize * numToWest

      const numToSouth = Math.ceil((refLat - boundsSouth) / gridSize)
      startSouth = refLat - gridSize * numToSouth

      for (let longIndex = 0; longIndex < 2 * numToWest; longIndex++) {
        for (let latIndex = 0; latIndex < 2 * numToSouth; latIndex++) {
          rectArray.setRect(longIndex, latIndex, new RectRecord(new LatLngBounds([
            [startSouth + (latIndex + 1) * gridSize, startWest + longIndex * gridSize],
            [startSouth + latIndex * gridSize, startWest + (longIndex + 1) * gridSize]
          ])))
        }
      }
    }

    const zeroCounts = () => {
      self.rectArray.forEachRect((rect) => {
        rect.count = 0
        rect.cases = []
      })
      self.rectArray.maxCount = 0
    }

    const computeCounts = () => {
      if (self.dataConfiguration) {
        const {
            dataConfiguration: {dataset, caseDataArray},
            rectArray, gridSize
          } = self,
          dataConfiguration = self.dataConfiguration

        zeroCounts()
        caseDataArray.forEach(({caseID}: { plotNum: number, caseID: string }) => {
          const long = dataset?.getNumeric(caseID, dataConfiguration.attributeID('long')),
            lat = dataset?.getNumeric(caseID, dataConfiguration.attributeID('lat'))
          if (long !== undefined && lat !== undefined) {
            const longIndex = Math.floor((long - startWest) / gridSize),
              latIndex = Math.floor((lat - startSouth) / gridSize)
            rectArray.addCaseToRect(longIndex, latIndex, caseID)
          }
        })
      }
    }

    return {
      actions: {
        initializeRectArray() {
          const cases = self.dataConfiguration?.caseDataArray,
            bounds = self.dataConfiguration ? getLatLongBounds(self.dataConfiguration) : undefined
          if (cases && cases.length > 0 && bounds && bounds.isValid()) {
            setupRectangles()
            computeCounts()
            self.rectArray.deleteZeroRects()
          }
        },
        clear() {
          self.rectArray.clear()
        },
        updateSelection() {
          self.forEachRect((rect) => {
            rect.selected = rect.cases.every((aCase) => self.dataConfiguration?.dataset?.isCaseSelected(aCase))
          })
        },
      }
    }
  })
  .actions(self => ({
    afterCreate() {
      addDisposer(self, reaction(
        () => [self.dataConfiguration,
          self.dataConfiguration?.hiddenCases.length, self.gridMultiplier, self._gridSize],
        () => {
          self.initializeRectArray()
          self.updateSelection()
        },
        {name: "MapGridModel.afterCreate.reaction [dataConfiguration]", fireImmediately: true}
      ))
      addDisposer(self, reaction(
        () => [self.dataConfiguration?.selection?.length],
        () => self.updateSelection(),
        {name: "MapGridModel.afterCreate.reaction [selection]"}
      ))
    },
  }))
  .views(self => ({
    _selectCasesInRect(longIndex: number, latIndex: number, select: boolean, extend: boolean) {
      const dataset = self.dataConfiguration?.dataset,
        rect = self.rectArray.getRect(longIndex, latIndex)
      if (rect) {
        if (extend) {
          dataset?.selectCases(rect.cases, select)
        } else {
          dataset?.setSelectedCases(rect.cases)
        }
      }
    },
    selectCasesInRect(longIndex: number, latIndex: number, select: boolean, extend: boolean) {
      if (!extend) {
        self.forEachRect((rect) => {
          rect.selected = false
        })
      }
      this._selectCasesInRect(longIndex, latIndex, select, extend)
    },
    deselectCasesInRect(longIndex: number, latIndex: number) {
      this._selectCasesInRect(longIndex, latIndex, false, false)
    },
    deselectAll() {
      self.dataConfiguration?.dataset?.selectAll(false)
    },

  }))
  .actions(applyUndoableAction)

export interface IMapGridModel extends Instance<typeof MapGridModel> {
}

export interface IMapGridModelSnapshot extends SnapshotIn<typeof MapGridModel> {
}

/*
export function isMapGridModel(layerModel?: IMapLayerModel): layerModel is IMapGridModel {
  return layerModel?.type === kMapGridType
}
*/

