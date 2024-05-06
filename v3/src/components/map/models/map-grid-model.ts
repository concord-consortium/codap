import {reaction} from "mobx"
import {addDisposer, types} from "mobx-state-tree"
import {applyModelChange} from "../../../models/history/apply-model-change"
import {IDataConfigurationModel} from "../../data-display/models/data-configuration-model"
import {LatLngGrid} from "../utilities/lat-lng-grid"
import {getLatLongBounds} from "../utilities/map-utils"

export const MapGridModel = types.model("MapGridModel", {
  isVisible: false,
  _gridMultiplier: 1,
})
  .volatile(() => ({
    dataConfiguration: undefined as IDataConfigurationModel | undefined,
    latLngGrid: new LatLngGrid(),
    _gridSize: 0,  // degrees
    _dynamicGridMultiplier: undefined as number | undefined  // Used during slider drag
  }))
  .actions(self => ({
    setIsVisible(isVisible: boolean) {
      self.isVisible = isVisible
    },
    setGridSize(gridSize: number) {
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
      return self.latLngGrid.maxCount
    }
  }))
  .extend((self) => {
    let startingCorners: { startWest: number, startSouth: number } | undefined
    const setupLatLngGrid = () => {
      startingCorners = self.latLngGrid.setupGridFromBounds(
        self.dataConfiguration ? getLatLongBounds(self.dataConfiguration) : undefined,
        self.setGridSize, () => self.gridSize)
    }

    const computeCounts = () => {
      if (self.dataConfiguration) {
        const {
            dataConfiguration: {dataset, caseDataArray},
            latLngGrid, gridSize
          } = self,
          dataConfiguration = self.dataConfiguration

        self.latLngGrid.zeroCounts()
        caseDataArray.forEach(({caseID}: { plotNum: number, caseID: string }) => {
          const long = dataset?.getNumeric(caseID, dataConfiguration.attributeID('long')),
            lat = dataset?.getNumeric(caseID, dataConfiguration.attributeID('lat'))
          if (long !== undefined && lat !== undefined) {
            const longIndex = Math.floor((long - (startingCorners?.startWest ?? 0)) / gridSize),
              latIndex = Math.floor((lat - (startingCorners?.startSouth ?? 0)) / gridSize)
            latLngGrid.addCaseToGridCell(longIndex, latIndex, caseID)
          }
        })
      }
    }

    return {
      actions: {
        initializeGrid() {
          const cases = self.dataConfiguration?.caseDataArray,
            bounds = self.dataConfiguration ? getLatLongBounds(self.dataConfiguration) : undefined
          if (cases?.length && bounds?.isValid()) {
            setupLatLngGrid()
            computeCounts()
            self.latLngGrid.deleteGridCellsWithZeroCount()
          }
        },
        clear() {
          self.latLngGrid.clear()
        },
        updateSelection() {
          self.latLngGrid.forEachGridCell((gridCell) => {
            gridCell.selected = gridCell.cases.every((aCase) => self.dataConfiguration?.dataset?.isCaseSelected(aCase))
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
          self.initializeGrid()
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
        rect = self.latLngGrid.getGridCell(longIndex, latIndex)
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
        self.latLngGrid.forEachGridCell((gridCell) => {
          gridCell.selected = false
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
  .actions(applyModelChange)
