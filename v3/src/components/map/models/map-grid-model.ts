import {reaction} from "mobx"
import { addDisposer, Instance, types } from "mobx-state-tree"
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
    _latLngGrid: new LatLngGrid(),
    _gridSize: 0,  // degrees
    _dynamicGridMultiplier: undefined as number | undefined,  // Used during slider drag
    changeCount: 0
  }))
  .views(self => ({
    get gridSize() {
      return self._gridSize
    }
  }))
  .actions(self => ({
    incrementChangeCount() {
      self.changeCount++
    },
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
  .extend((self) => {
    let startingCorners: { startWest: number, startSouth: number } | undefined
    const setupLatLngGrid = () => {
      startingCorners = self._latLngGrid.setupGridFromBounds(
        self.dataConfiguration ? getLatLongBounds(self.dataConfiguration) : undefined,
        self.setGridSize, () => self.gridSize)
    }

    const computeCounts = () => {
      if (self.dataConfiguration) {
        const {
            dataConfiguration: {dataset, caseDataArray},
            _latLngGrid, gridSize
          } = self,
          dataConfiguration = self.dataConfiguration

        _latLngGrid.zeroCounts()
        caseDataArray.forEach(({caseID}: { plotNum: number, caseID: string }) => {
          const long = dataset?.getNumeric(caseID, dataConfiguration.attributeID('long')),
            lat = dataset?.getNumeric(caseID, dataConfiguration.attributeID('lat'))
          if (long !== undefined && lat !== undefined) {
            const longIndex = Math.floor((long - (startingCorners?.startWest ?? 0)) / gridSize),
              latIndex = Math.floor((lat - (startingCorners?.startSouth ?? 0)) / gridSize)
            _latLngGrid.addCaseToGridCell(longIndex, latIndex, caseID)
          }
        })
      }
    }
    const _updateSelection = () => {
      self._latLngGrid.forEachGridCell((gridCell) => {
        gridCell.selected = gridCell.cases.every((aCase) => self.dataConfiguration?.dataset?.isCaseSelected(aCase))
      })
    }
    const _initializeGrid = () => {
      if (!self.isVisible) return
      const cases = self.dataConfiguration?.caseDataArray,
        bounds = self.dataConfiguration ? getLatLongBounds(self.dataConfiguration) : undefined
      if (cases?.length && bounds?.isValid()) {
        setupLatLngGrid()
        computeCounts()
        self._latLngGrid.deleteGridCellsWithZeroCount()
      }
      _updateSelection()
      self._latLngGrid.initialized = true
    }
    return {
      views: {
        get latLngGrid() {
          if (!self._latLngGrid.initialized) {
            _initializeGrid()
          }
          return self._latLngGrid
        },
      },
      actions: {
        updateSelection() {
          if (!self._latLngGrid.initialized) {
            _initializeGrid()
          }
          _updateSelection()
        },
        initializeGrid() {
          _initializeGrid()
        }
      }
    }
  })
  .actions(self => ({
    clear() {
      self.latLngGrid.clear()
    },
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
    },
    casesInRect(longIndex: number, latIndex: number) {
      return self.latLngGrid.getGridCell(longIndex, latIndex)?.cases
    },
    clearGridSelection() {
      self.latLngGrid.forEachGridCell((gridCell) => {
        gridCell.selected = false
      })
    }
  }))
  .actions(self => ({
    afterCreate() {
      addDisposer(self, reaction(
        () => [self.dataConfiguration, self.dataConfiguration?.caseDataHash,
          self.dataConfiguration?.hiddenCases.length, self.gridMultiplier, self._gridSize],
        () => {
          self.initializeGrid()
          self.updateSelection()
          self.incrementChangeCount()
        },
        {name: "MapGridModel.afterCreate.reaction [dataConfiguration]", fireImmediately: true}
      ))
      addDisposer(self, reaction(
        () => [self.dataConfiguration?.selection?.length],
        () => {
          self.updateSelection()
          self.incrementChangeCount()
        },
        {name: "MapGridModel.afterCreate.reaction [selection]"}
      ))
    },
  }))
  .actions(applyModelChange)

export interface IMapGridModel extends Instance<typeof MapGridModel> {

}
