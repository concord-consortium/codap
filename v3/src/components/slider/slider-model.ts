import { comparer, reaction } from "mobx"
import { addDisposer, Instance, isAlive, SnapshotIn, types} from "mobx-state-tree"
import { IDataSet } from "../../models/data/data-set"
import { GlobalValue } from "../../models/global/global-value"
import { getGlobalValueManager } from "../../models/global/global-value-manager"
import { applyModelChange } from "../../models/history/apply-model-change"
import { getAllTileDataSets } from "../../models/shared/shared-data-tile-utils"
import { getDataSetFromId, getSharedDataSetFromDataSetId } from "../../models/shared/shared-data-utils"
import { ISharedModel } from "../../models/shared/shared-model"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { getTileModel } from "../../models/tiles/tile-model"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { DateUnit, dateUnits, determineLevels, unitsStringToMilliseconds } from "../../utilities/date-utils"
import { AxisPlace } from "../axis/axis-types"
import { AxisHelper } from "../axis/helper-models/axis-helper"
import { IAxisModel } from "../axis/models/axis-model"
import { IBaseNumericAxisModel } from "../axis/models/base-numeric-axis-model"
import {
  DateAxisModel, isAnyNumericAxisModel, isDateAxisModel, NumericAxisModel
} from "../axis/models/numeric-axis-models"
import { dataDisplayGetNumericExtent, dataDisplayGetNumericValue } from "../data-display/data-display-value-utils"
import { kSliderTileType } from "./slider-defs"
import {
  AnimationDirection, AnimationDirections, AnimationMode, AnimationModes, FixValueFn, ISliderScaleType,
  kDefaultAnimationDirection, kDefaultAnimationMode, kDefaultAnimationRate, kDefaultDateMultipleOfUnit,
  kDefaultRangeFraction, kDefaultSliderAxisMax, kDefaultSliderAxisMin, kDefaultSliderScaleType, kDefaultSliderType,
  SliderScaleTypes, SliderType, SliderTypes
} from "./slider-types"

function areSetsEqual<T>(a: ReadonlySet<T>, b: ReadonlySet<T>) {
  if (a.size !== b.size) return false
  for (const item of a) {
    if (!b.has(item)) return false
  }
  return true
}

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
      () => NumericAxisModel.create({ place: 'bottom', min: kDefaultSliderAxisMin, max: kDefaultSliderAxisMax })),
    sliderType: types.optional(types.enumeration([...SliderTypes]), kDefaultSliderType),
    // the bound attribute; plain ids like DataConfigurationModel, not MST references
    dataSetId: types.maybe(types.string),
    attributeId: types.maybe(types.string),
    // width of the range thumb, in axis units (epoch seconds for dates); the global value is its low end
    rangeWidth: types.maybe(types.number)
  })
  .volatile(() => ({
    axisHelper: undefined as Maybe<AxisHelper>,
    _isAxisAnimating: false,
    dynamicRangeWidth: undefined as number | undefined
   }))
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
    },
    get dataSet(): IDataSet | undefined {
      return self.dataSetId ? getDataSetFromId(self, self.dataSetId) : undefined
    },
    get attribute() {
      return self.attributeId ? this.dataSet?.getAttribute(self.attributeId) : undefined
    },
    // The bound attribute's numeric values (epoch seconds for dates) for the cases that aren't set aside or
    // filtered out by the filter formula. Cases hidden by sliders are included, so that the slider's own
    // hiding doesn't narrow what it hides, snaps to, or plays through.
    get attributeValues(): Array<{ itemId: string, value?: number | null }> {
      const dataSet = this.dataSet
      const attr = this.attribute
      if (!dataSet || !attr) return []
      // attribute values live in a volatile array; changeCount is what signals that they changed
      void attr.changeCount
      return dataSet.itemIdsIgnoringSliderFilters.map(itemId =>
        ({ itemId, value: dataDisplayGetNumericValue(dataSet, itemId, attr.id) }))
    },
    get isRangeSlider() {
      return self.sliderType !== "variable"
    },
    get width() {
      return self.dynamicRangeWidth ?? self.rangeWidth ?? 0
    },
    // sorted distinct values of the bound attribute (see attributeValues), for zero-width snapping
    get snapValues(): number[] {
      const values = new Set<number>()
      this.attributeValues.forEach(({ value }) => {
        if (value != null && isFinite(value)) values.add(value)
      })
      return Array.from(values).sort((a, b) => a - b)
    }
  }))
  .views(self => ({
    get rangeLow() {
      return self.value
    },
    get rangeHigh() {
      return self.value + self.width
    },
    // the interval the value may occupy: for a range slider, the low end, which leaves room for the width
    get valueDomain(): readonly [number, number] {
      const [min, max] = self.axis.domain
      return self.isRangeSlider ? [min, Math.max(min, max - self.width)] : self.axis.domain
    },
    // the nearest data value within the axis, or the value itself if the axis contains none
    snapToData(value: number) {
      const [axisMin, axisMax] = self.axis.domain
      const values = self.snapValues.filter(v => v >= axisMin && v <= axisMax)
      if (!values.length) return value
      // binary search for the nearest value
      let lo = 0
      let hi = values.length - 1
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2)
        if (values[mid] < value) lo = mid + 1
        else hi = mid
      }
      const above = values[lo]
      const below = lo > 0 ? values[lo - 1] : above
      return value - below <= above - value ? below : above
    }
  }))
  .views(self => ({
    // The cases a visibility slider hides: those whose value is missing or outside the inclusive range.
    // The tolerance keeps a case at either end when floating point leaves the bound a hair inside it.
    get sliderHiddenItemIds(): ReadonlySet<string> {
      const low = self.rangeLow
      const high = self.rangeHigh
      const lowTolerance = 8 * Number.EPSILON * Math.max(1, Math.abs(low))
      const highTolerance = 8 * Number.EPSILON * Math.max(1, Math.abs(high))
      const hidden = new Set<string>()
      self.attributeValues.forEach(({ itemId, value }) => {
        if (value == null || !isFinite(value) || value < low - lowTolerance || value > high + highTolerance) {
          hidden.add(itemId)
        }
      })
      return hidden
    },
    constrainValue(value: number) {
      if (self.isRangeSlider) {
        const [min, max] = self.valueDomain
        const clamped = Math.min(max, Math.max(min, value))
        return self.width === 0 ? self.snapToData(clamped) : clamped
      }
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
    // the value one playback step further; a zero-width range steps through the data's distinct values
    nextAnimationValue(sign: 1 | -1, fallbackIncrement: number) {
      const values = self.snapValues
      if (self.isRangeSlider && self.width === 0 && values.length) {
        const next = sign > 0
          ? values.find(v => v > self.value)
          : [...values].reverse().find(v => v < self.value)
        const [min, max] = self.valueDomain
        return next ?? (sign > 0 ? max + 1 : min - 1)
      }
      return self.value + sign * (self.increment ?? fallbackIncrement)
    },
    // bounded by the value domain, so a range slider's playback wraps or stops when its high end reaches the axis
    validateValue(value: number, belowMin: FixValueFn, aboveMax: FixValueFn) {
      const [min, max] = self.valueDomain
      if (value < min) return belowMin(value)
      if (value > max) return aboveMax(value)
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
    },
    getAxisHelper(place: AxisPlace, subAxisIndex: number) {
      return self.axisHelper
    },
    // axis bounds for configuring from the attribute, or undefined if it can't configure a slider
    configurationExtent(dataSet: IDataSet, attrId: string): Maybe<[number, number]> {
      const attribute = dataSet.getAttribute(attrId)
      const attrType = attribute?.type
      if (attrType !== "numeric" && attrType !== "date") return
      // A formula attribute's values can depend on which cases are visible (caseIndex, aggregates, prev/next)
      // and aren't computed for hidden cases, so a range slider can't judge cases by them yet.
      if (attribute?.hasFormula) return
      // over the cases the slider's own hiding excludes too, so re-binding sees the attribute's full extent
      const extent = dataDisplayGetNumericExtent(dataSet, attrId, dataSet.itemIdsIgnoringSliderFilters)
      if (!extent) return
      const [min, max] = extent
      if (min < max) return extent
      // a single value still needs an axis with width
      const pad = attrType === "date" ? unitsStringToMilliseconds("day") / 2000 : 0.5
      return [min - pad, max + pad]
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
      self.globalValue.setValue(self.constrainValue(value))
    },
    setRangeWidth(width: number) {
      self.rangeWidth = width
      self.dynamicRangeWidth = undefined
    }
  }))
  .actions(self => {
    // clamps [low, high] to the axis with low <= high, snapping a zero-width range to the data
    function normalizeRange(low: number, high: number): [number, number] {
      const [min, max] = self.axis.domain
      let lo = Math.min(max, Math.max(min, Math.min(low, high)))
      let hi = Math.min(max, Math.max(min, Math.max(low, high)))
      if (hi === lo) {
        lo = hi = self.snapToData(lo)
      }
      return [lo, hi]
    }
    // clamps low into the domain that leaves room for the current width
    function normalizeMove(low: number) {
      const [min, max] = self.valueDomain
      const clamped = Math.min(max, Math.max(min, low))
      return self.width === 0 ? self.snapToData(clamped) : clamped
    }
    return {
      setDynamicRange(low: number, high: number) {
        const [lo, hi] = normalizeRange(low, high)
        self.dynamicRangeWidth = hi - lo
        self.globalValue.setDynamicValue(lo)
      },
      setRange(low: number, high: number) {
        const [lo, hi] = normalizeRange(low, high)
        self.rangeWidth = hi - lo
        self.dynamicRangeWidth = undefined
        self.globalValue.setValue(lo)
      },
      moveDynamicRange(low: number) {
        self.globalValue.setDynamicValue(normalizeMove(low))
      },
      moveRange(low: number) {
        const lo = normalizeMove(low)
        self.rangeWidth = self.width
        self.dynamicRangeWidth = undefined
        self.globalValue.setValue(lo)
      }
    }
  })
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
    setAxisHelper(place: AxisPlace, subAxisIndex: number, helper: AxisHelper) {
      self.axisHelper = helper
    },
    setIsAxisAnimating(animating: boolean) {
      self._isAxisAnimating = animating
    }
  }))
  .actions(self => ({
    afterCreate() {
      addDisposer(self, reaction(
        () => self.valueDomain,
        () => {
          // skip constraining value during axis animation (value is intentionally outside bounds)
          if (self._isAxisAnimating) return
          const [axisMin, axisMax] = self.axis.domain
          // a range wider than the axis shrinks to fit it
          if (self.isRangeSlider && self.width > axisMax - axisMin) {
            self.setRangeWidth(axisMax - axisMin)
          }
          const [min, max] = self.valueDomain
          // keep the thumb within axis bounds when axis bounds are changed
          if (self.value < min) self.setDynamicValueIfDynamic(min)
          if (self.value > max) self.setDynamicValueIfDynamic(max)
        }, { name: "SliderModel [valueDomain]", equals: comparer.structural }
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
      // link the tile to the bound dataset (and only that one) so it takes part in shared-model updates
      addDisposer(self, reaction(
        () => {
          const sharedModelManager = getSharedModelManager(self)
          return { sharedModelManager, isReady: sharedModelManager?.isReady, dataSetId: self.dataSetId }
        },
        ({ sharedModelManager, isReady, dataSetId }) => {
          if (!sharedModelManager || !isReady) return
          getAllTileDataSets(self).forEach(linked => {
            if (linked.dataSet.id !== dataSetId) sharedModelManager.removeTileSharedModel(self, linked)
          })
          const sharedDataSet = dataSetId ? getSharedDataSetFromDataSetId(self, dataSetId) : undefined
          sharedDataSet && sharedModelManager.addTileSharedModel(self, sharedDataSet)
        }, { name: "SliderModel [dataSetId]", fireImmediately: true }
      ))
      // A bound visibility slider hides the cases outside its range; anything else clears its filter. The
      // filter is volatile, so it's recomputed rather than saved, and it never becomes a history entry.
      let filteredDataSet: IDataSet | undefined
      const sliderTileId = getTileModel(self)?.id
      const clearFilter = () => {
        if (sliderTileId && filteredDataSet && isAlive(filteredDataSet)) {
          filteredDataSet.clearSliderFilter(sliderTileId)
        }
        filteredDataSet = undefined
      }
      addDisposer(self, reaction(
        () => {
          const dataSet = self.dataSet
          // not while the attribute has a formula (see configurationExtent), e.g. one added after binding
          const applies = self.sliderType === "visibility" && !!dataSet && !!self.attribute &&
                          !self.attribute.hasFormula
          const hidden = applies ? self.sliderHiddenItemIds : undefined
          return { dataSet, hidden }
        },
        ({ dataSet, hidden }) => {
          if (filteredDataSet !== dataSet) clearFilter()
          if (sliderTileId && dataSet && hidden) {
            // skip a change that hides the same cases, which would regroup the whole dataset for nothing
            const current = dataSet.sliderFilteredOutItemIds.get(sliderTileId)
            if (!current || !areSetsEqual(current, hidden)) {
              dataSet.setSliderFilter(sliderTileId, hidden)
            }
            filteredDataSet = dataSet
          }
          else {
            clearFilter()
          }
        }, { name: "SliderModel [visibility filter]", fireImmediately: true }
      ))
      addDisposer(self, clearFilter)
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
        self.axisHelper = undefined
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
  .actions(self => ({
    setSliderType(sliderType: SliderType) {
      self.sliderType = sliderType
    },
    configureFromAttribute(dataSet: IDataSet, attrId: string) {
      const extent = self.configurationExtent(dataSet, attrId)
      if (!extent) return
      const [min, max] = extent
      if (self.sliderType !== "selection") self.sliderType = "visibility"
      self.dataSetId = dataSet.id
      self.attributeId = attrId
      self.setScaleType(dataSet.getAttribute(attrId)?.type === "date" ? "date" : "numeric")
      self.setAxisMin(min)
      self.setAxisMax(max)
      self.rangeWidth = (max - min) * kDefaultRangeFraction
      self.dynamicRangeWidth = undefined
      // the global value tracks the low end of the range, which a multiple restriction mustn't snap away from
      self.globalValue.setValue(min)
    }
  }))
  // performs the specified action so that response actions are included and undo/redo strings assigned
  .actions(applyModelChange)

export interface ISliderModel extends Instance<typeof SliderModel> {}
export interface ISliderSnapshot extends SnapshotIn<typeof SliderModel> {}

export function isSliderModel(model?: ITileContentModel): model is ISliderModel {
  return model?.type === kSliderTileType
}
