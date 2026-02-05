import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { isAnyNumericAxisModel } from "../../../axis/models/numeric-axis-models"
import { kDefaultCellKey, migrateInstanceKeyMap } from "../../utilities/cell-key-utils"
import { AdornmentModel, IAdornmentModel, IUpdateCategoriesOptions } from "../adornment-models"
import { kMovableValueType } from "./movable-value-adornment-types"

export const MovableValueAdornmentModel = AdornmentModel
  .named("MovableValueAdornmentModel")
  .props({
    type: types.optional(types.literal(kMovableValueType), kMovableValueType),
    // key is instanceKey (derived from cellKey); value is array of movable values for a given cell
    values: types.map(types.array(types.number))
  })
  .preProcessSnapshot(snapshot => {
    const values = migrateInstanceKeyMap(snapshot.values)
    return values ? { ...snapshot, values } : snapshot
  })
  .volatile(() => ({
    axisMin: 0,
    axisMax: 0,
    dragIndex: -1,
    dragKey: "",
    dragValue: 0
  }))
  .views(self => ({
    get isDragging() {
      return self.dragIndex >= 0
    },
  }))
  .views(self => ({
    get hasValues() {
      return [...self.values.values()].some(valueArray => valueArray.length > 0)
    },
    get firstValueArray(): number[] {
      return self.values.values().next().value
    },
    valuesForKey(key = kDefaultCellKey) {
      const values = self.values.get(key) || []
      if (!self.isDragging || key !== self.dragKey) return values
      const latestValues = [...values]
      latestValues[self.dragIndex] = self.dragValue
      return latestValues
    }
  }))
  .views(self => ({
    sortedValues(key?: string) {
      const values = self.valuesForKey(key) ?? self.firstValueArray
      return [...values].sort((a, b) => a - b)
    }
  }))
  .views(self => ({
    newValue(key = kDefaultCellKey) {
      // New movable values are always placed within the largest gap existing between the
      // axis min, any existing movable values, and the axis max. The exact placement is
      // 1/3 of the way into the gap from the lower bound.
      const sortedValues = self.sortedValues(key)
      const validValues = sortedValues.filter(value => value >= self.axisMin && value <= self.axisMax)
      const allValues = [self.axisMin, ...validValues, self.axisMax]
      const gaps = allValues.map((value, index) => {
        const size = index < allValues.length - 1 ? Math.abs(value - allValues[index + 1]) : 0
        return { start: value, size }
      })
      const largestGap = gaps.reduce((prev, curr) => prev.size > curr.size ? prev : curr)
      return largestGap.start + largestGap.size / 3
    }
  }))
  .actions(self => ({
    addValue(aValue?: number) {
      self.values.forEach((values, key) => {
        const newValue = aValue == null ? self.newValue(`${key}`) : aValue
        const newValues = [...values]
        newValues.push(newValue)
        self.values.set(key, newValues)
      })
    },
    replaceValue(aValue: number, key = kDefaultCellKey, index = 0) {
      const newValues = [...self.valuesForKey(key)]
      newValues[index] = aValue
      self.values.set(key, newValues)
    },
    deleteValue() {
      self.values.forEach((values, key) => {
        const newValues = [...values]
        const lastValueIndex = newValues.length > 0 ? newValues.length - 1 : 0
        newValues.splice(lastValueIndex, 1)
        self.values.set(key, newValues)
        if (lastValueIndex <= 0) {
          self.values.set(key, [])
        }
      })
    },
    deleteAllValues() {
      self.values.forEach((value, key) => {
        self.values.set(key, [])
      })
    }
  }))
  .actions(self => ({
    setAxisMin(aValue: number) {
      self.axisMin = aValue
    },
    setAxisMax(aValue: number) {
      self.axisMax = aValue
    },
    setInitialValue(aValue = 10, key = "") {
      self.deleteAllValues()
      self.values.set(key, [])
      self.addValue(aValue)
    },
    updateDrag(value: number, instanceKey: string, index: number) {
      self.dragIndex = index
      self.dragKey = instanceKey
      self.dragValue = value
    },
    endDrag(value: number, instanceKey: string, index: number) {
      self.replaceValue(value, instanceKey, index)
      self.dragIndex = -1
      self.dragKey = ""
      self.dragValue = 0
    }
  }))
  .actions(self => ({
    updateCategories(options: IUpdateCategoriesOptions) {
      const { xAxis, yAxis, addMovableValue, dataConfig } = options
      const [axisMin, axisMax] = isAnyNumericAxisModel(xAxis)
                                  ? xAxis.domain
                                  : isAnyNumericAxisModel(yAxis) ? yAxis.domain : []

      if (axisMin != null) self.setAxisMin(axisMin)
      if (axisMax != null) self.setAxisMax(axisMax)

      dataConfig.getAllCellKeys().forEach(cellKey => {
        const instanceKey = self.instanceKey(cellKey)
        // Each array in the model's values map should have the same length as all the others. If there are no existing
        // values for the current instance key, check if there is at least one array in the map. If there is, copy those
        // values. Otherwise, set the array to []. We will add any new values to the array after the loop.
        const existingValues = self.values.get(instanceKey) || self.firstValueArray || []
        self.values.set(instanceKey, [...existingValues])
      })

      // Add a new movable value when requested.
      if (addMovableValue) self.addValue()
    }
  }))

export interface IMovableValueAdornmentModelSnapshot extends SnapshotIn<typeof MovableValueAdornmentModel> {}
export interface IMovableValueAdornmentModel extends Instance<typeof MovableValueAdornmentModel> {}
export function isMovableValueAdornment(adornment: IAdornmentModel): adornment is IMovableValueAdornmentModel {
  return adornment.type === kMovableValueType
}
