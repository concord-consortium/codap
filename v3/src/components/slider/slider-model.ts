import { reaction } from "mobx"
import { addDisposer, Instance, SnapshotIn, types} from "mobx-state-tree"
import { GlobalValue } from "../../models/global/global-value"
import { getGlobalValueManager } from "../../models/global/global-value-manager"
import { applyModelChange } from "../../models/history/apply-model-change"
import { ISharedModel } from "../../models/shared/shared-model"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { DateUnit, dateUnits, determineLevels, unitsStringToMilliseconds } from "../../utilities/date-utils"
import { IAxisModel } from "../axis/models/axis-model"
import {
  DateAxisModel, IBaseNumericAxisModel, isAnyNumericAxisModel, isDateAxisModel, NumericAxisModel
} from "../axis/models/numeric-axis-models"
import { kSliderTileType } from "./slider-defs"
import {
  AnimationDirection, AnimationDirections, AnimationMode, AnimationModes, FixValueFn, ISliderScaleType,
  kDefaultAnimationDirection, kDefaultAnimationMode, kDefaultAnimationRate, kDefaultDateMultipleOfUnit,
  kDefaultSliderAxisMax, kDefaultSliderAxisMin, kDefaultSliderScaleType, SliderScaleTypes
} from "./slider-types"

export const SliderModel = TileContentModel
  .named("SliderModel")
  .props({
    type: types.optional(types.literal(kSliderTileType), kSliderTileType),
    globalValue: types.reference(GlobalValue),
    multipleOf: types.maybe(types.number),
    dateMultipleOfUnit: types.optional(types.enumeration([...dateUnits]), kDefaultDateMultipleOfUnit),
    animationDirection: types.optional(types.enumeration([...AnimationDirections]), kDefaultAnimationDirection),
    animationMode: types.optional(types.enumeration([...AnimationModes]), kDefaultAnimationMode),
    // clients should use animationRate view defined below
    _animationRate: types.maybe(types.number),  // frames per second
    scaleType: types.optional(types.enumeration([...SliderScaleTypes]), kDefaultSliderScaleType),
    axis: types.optional(types.union(NumericAxisModel, DateAxisModel),
      () => NumericAxisModel.create({ place: 'bottom', min: kDefaultSliderAxisMin, max: kDefaultSliderAxisMax }))
  })
  .views(self => ({
    get name() {
      return self.globalValue.name
    },
    get value() {
      return self.globalValue.value
    },
    getAxis(): IBaseNumericAxisModel {
      return self.axis
    },
    getNumericAxis(): IBaseNumericAxisModel {
      return self.axis
    },
    get domain() {
      return self.axis.domain
    },
    get isUpdatingDynamically() {
      return self.globalValue.isUpdatingDynamically
    },
    get increment() {
      if (self.scaleType === "numeric") {
        return self.multipleOf
      }
      // date
      const multipleOf = self.multipleOf,
        multiplier = unitsStringToMilliseconds(self.dateMultipleOfUnit) / 1000
      return multipleOf ? multipleOf * multiplier : undefined
    },
    get animationRate() {
      return self._animationRate ?? kDefaultAnimationRate
    },
    get globalValueManager() {
      return getGlobalValueManager(getSharedModelManager(self))
    }
  }))
  .views(self => ({
    constrainValue(value: number) {
      // keep value in bounds of axis min and max when thumbnail is dragged
      const keepValueInBounds = (num: number) => {
        if (num < self.axis.min) return self.axis.min
        else if (num > self.axis.max) return self.axis.max
        else return num
      }

      if (self.multipleOf && self.increment) {
        value = Math.round(value / self.increment) * self.increment
        value = value > self.axis.max ? value - self.increment : value
        value = value < self.axis.min ? value + self.increment : value
      }
      return keepValueInBounds(value)
    },
    validateValue(value: number, belowMin: FixValueFn, aboveMax: FixValueFn) {
      if (value < self.axis.min) return belowMin(value)
      if (value > self.axis.max) return aboveMax(value)
      return value
    },
    hasBinnedNumericAxis(axisModel: IAxisModel) {
      return false
    },
    hasDraggableNumericAxis(axisModel: IAxisModel) {
      return isAnyNumericAxisModel(axisModel)
    },
    nonDraggableAxisTicks(formatter: (value: number) => string): { tickValues: number[], tickLabels: string[] } {
      // derived models should override
      return {tickValues: [], tickLabels: []}
    },
    // For date sliders, the axis may require two "levels"
    axisRequiresTwoLevels() {
      if (self.scaleType === "date" && isDateAxisModel(self.axis)) {
        const [min, max] = self.axis.domain
        const levels = determineLevels(min * 1000, max * 1000)
        return levels.innerLevel !== levels.outerLevel
      }
      return false
    }
  }))
  .actions(self => ({
    setDynamicValue(value: number) {
      self.globalValue.setDynamicValue(self.constrainValue(value))
    },
    setValue(value: number) {
      self.globalValue.setValue(self.constrainValue(value))
    },
    setValidatedValue(value: number) {
      self.globalValue.setValue(value)
    },
  }))
  .actions(self => ({
    setDynamicValueIfDynamic(value: number) {
      // update dynamically if either the slider or the axis is updating dynamically
      if (self.isUpdatingDynamically || self.axis.isUpdatingDynamically) {
        self.setDynamicValue(value)
      }
      else {
        self.setValue(value)
      }
    },
  }))
  .actions(self => ({
    afterCreate() {
      addDisposer(self, reaction(
        () => self.axis.domain,
        ([axisMin, axisMax]) => {
          // keep the thumbnail within axis bounds when axis bounds are changed
          if (self.value < axisMin) self.setDynamicValueIfDynamic(axisMin)
          if (self.value > axisMax) self.setDynamicValueIfDynamic(axisMax)
        }, { name: "SliderModel [axis.domain]" }
      ))
    },
    afterAttachToDocument() {
      // register our link to the global value manager when we're attached to the document
      addDisposer(self, reaction(
        () => {
          const sharedModelManager = getSharedModelManager(self)
          const isReady = sharedModelManager?.isReady
          const globalValueManager = self.globalValueManager
          return { sharedModelManager, isReady, globalValueManager }
        },
        ({ sharedModelManager, isReady, globalValueManager }) => {
          if (sharedModelManager?.isReady) {
            // once we're added to the document, update the shared model reference
            globalValueManager && sharedModelManager.addTileSharedModel(self, globalValueManager)
          }
        }, { name: "SliderModel [sharedModelManager]", fireImmediately: true }
      ))
    },
    destroyGlobalValue() {
      // the underlying global value should be removed when the slider model is destroyed
      self.globalValue && self.globalValueManager?.removeValue(self.globalValue)
    },
    updateAfterSharedModelChanges(sharedModel?: ISharedModel) {
      // nothing to do
    },
    setName(name: string) {
      self.globalValue.setName(name)
    },
    setMultipleOf(n?: number) {
      if (n) {
        self.multipleOf = Math.abs(n)
        self.setValue(self.constrainValue(self.value))
      }
      else {
        self.multipleOf = undefined
      }
    },
    setDateMultipleOfUnit(unit: DateUnit) {
      self.dateMultipleOfUnit = unit
    },
    setAnimationDirection(direction: AnimationDirection) {
      self.animationDirection = direction
    },
    setAnimationMode(mode: AnimationMode) {
      self.animationMode = mode
    },
    setAnimationRate(rate?: number) {
      if (rate) {
        // no need to store the default value
        self._animationRate = rate === kDefaultAnimationRate ? undefined : Math.abs(rate)
      }
    },
    setScaleType(scaleType: ISliderScaleType) {
      if (scaleType !== self.scaleType) {
        switch (scaleType) {
          case "numeric":
            self.axis = NumericAxisModel.create({
                          place: 'bottom', min: kDefaultSliderAxisMin, max: kDefaultSliderAxisMax })
            self.setValue(0.5)
            break
          case "date": {
            const currentDate = new Date()
            const currentYear = currentDate.getFullYear()
            const firstDayOfYear = new Date(currentYear, 0, 1).getTime() / 1000
            const lastDayOfYear = new Date(currentYear, 11, 31, 23, 59, 59).getTime() / 1000
            self.axis = DateAxisModel.create({
              place: 'bottom',
              min: firstDayOfYear,
              max: lastDayOfYear
            })
            self.setValue(currentDate.getTime() / 1000)
          }
            break
        }
        self.scaleType = scaleType
      }
    },
    setAxisMin(n: number) {
      self.axis.min = n
    },
    setAxisMax(n: number) {
      self.axis.max = n
    }
  }))
  .actions(self => ({
    encompassValue(input: number) {
      const tAxis = self.axis
      const tLower = tAxis.min
      const tUpper = tAxis.max
      const tValue = input
      if ((tValue < tLower) || (tValue > tUpper)) {
        if (tValue < tLower) {
          self.setAxisMin(tValue - (tUpper - tValue) / 10)
        } else {
          self.setAxisMax(tValue + (tValue - tLower) / 10)
        }
      }
    },
  }))
  // performs the specified action so that response actions are included and undo/redo strings assigned
  .actions(applyModelChange)

export interface ISliderModel extends Instance<typeof SliderModel> {}
export interface ISliderSnapshot extends SnapshotIn<typeof SliderModel> {}

export function isSliderModel(model?: ITileContentModel): model is ISliderModel {
  return model?.type === kSliderTileType
}
