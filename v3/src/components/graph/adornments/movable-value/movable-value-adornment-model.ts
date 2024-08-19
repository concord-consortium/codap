import { Instance, types } from "mobx-state-tree"
import { AdornmentModel, IAdornmentModel, IUpdateCategoriesOptions } from "../adornment-models"
import { kMovableValueType } from "./movable-value-adornment-types"
import { IBaseNumericAxisModel } from "../../../axis/models/axis-model"

export const MovableValueAdornmentModel = AdornmentModel
  .named("MovableValueAdornmentModel")
  .props({
    type: types.optional(types.literal(kMovableValueType), kMovableValueType),
    values: types.map(types.array(types.number)),
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
    get firstValueArray() {
      return self.values.values().next().value
    },
    valuesForKey(key="{}") {
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
    newValue(key="{}") {
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
        const newValue = !aValue ? self.newValue(`${key}`) : aValue
        const newValues = [...values]
        newValues.push(newValue)
        self.values.set(key, newValues)
      })
    },
    replaceValue(aValue: number, key="{}", index=0) {
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
    setInitialValue(aValue=10, key="{}") {
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
      const { xAxis, yAxis, resetPoints, dataConfig } = options
      const axisMin = xAxis?.isNumeric ? (xAxis as IBaseNumericAxisModel).min
        : (yAxis as IBaseNumericAxisModel).min
      const axisMax = xAxis?.isNumeric ? (xAxis as IBaseNumericAxisModel).max
        : (yAxis as IBaseNumericAxisModel).max

      self.setAxisMin(axisMin)
      self.setAxisMax(axisMax)

      dataConfig.getAllCellKeys().forEach(cellKey => {
        const instanceKey = self.instanceKey(cellKey)
        // Each array in the model's values map should have the same length as all the others. If there are no existing
        // values for the current instance key, check if there is at least one array in the map. If there is, copy those
        // values. Otherwise, set the array to []. We will add any new values to the array after the loop.
        const existingValues = self.values.get(instanceKey) || self.firstValueArray || []
        self.values.set(instanceKey, [...existingValues])
      })

      // If this action was triggered by the attributes changing (i.e., resetPoints is true), do not add a new value.
      if (resetPoints) return

      self.addValue()
    }
  }))

export interface IMovableValueAdornmentModel extends Instance<typeof MovableValueAdornmentModel> {}
export function isMovableValueAdornment(adornment: IAdornmentModel): adornment is IMovableValueAdornmentModel {
  return adornment.type === kMovableValueType
}
