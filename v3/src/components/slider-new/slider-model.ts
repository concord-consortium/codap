import { comparer, observable, reaction, runInAction } from "mobx"
import { addDisposer, Instance, SnapshotIn, types} from "mobx-state-tree"
import { GlobalValue } from "../../models/global/global-value"
import { getGlobalValueManager } from "../../models/global/global-value-manager"
import { applyModelChange } from "../../models/history/apply-model-change"
import { IDataSet } from "../../models/data/data-set"
import { withoutUndo } from "../../models/history/without-undo"
import { getDataSetFromId } from "../../models/shared/shared-data-utils"
import { ISharedModel } from "../../models/shared/shared-model"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import {
  convertToDate, DatePrecision, DateUnit, dateUnits, determineLevels, unitsStringToMilliseconds
} from "../../utilities/date-utils"
import { AxisPlace } from "../axis/axis-types"
import { AxisHelper } from "../axis/helper-models/axis-helper"
import { IAxisModel } from "../axis/models/axis-model"
import { IBaseNumericAxisModel } from "../axis/models/base-numeric-axis-model"
import {
  DateAxisModel, isAnyNumericAxisModel, isDateAxisModel, NumericAxisModel
} from "../axis/models/numeric-axis-models"
import { kSliderTileType } from "./slider-defs"
import {
  AnimationDirection, AnimationDirections, AnimationMode, AnimationModes, FixValueFn, ISliderScaleType,
  kDefaultAnimationDirection, kDefaultAnimationMode, kDefaultAnimationRate, kDefaultDateMultipleOfUnit,
  kDefaultSliderAxisMax, kDefaultSliderAxisMin, kDefaultSliderScaleType, SliderScaleTypes,
  ISliderType, kDefaultRangeFraction, kDefaultSliderType, SliderTypes
} from "./slider-types"

// PROTOTYPE: the start of the year/month/day/hour/minute/second that a date (in seconds) falls in, local time
function startOfDateUnit(seconds: number, unit: DatePrecision) {
  const d = new Date(seconds * 1000)
  switch (unit) {
    case "year": return new Date(d.getFullYear(), 0, 1).getTime() / 1000
    case "month": return new Date(d.getFullYear(), d.getMonth(), 1).getTime() / 1000
    case "day": return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 1000
    case "hour": d.setMinutes(0, 0, 0); return d.getTime() / 1000
    case "minute": d.setSeconds(0, 0); return d.getTime() / 1000
    case "second": d.setMilliseconds(0); return d.getTime() / 1000
    default: return seconds
  }
}

// PROTOTYPE: how many times a visibility slider has hidden or shown cases in each dataset. A selection slider on
// the same dataset follows these changes (CODAP-1518: newly hidden cases deselected, newly visible ones in its
// range selected), whereas other hide/show changes pause it (CODAP-1519).
const visibilitySliderChanges = observable.map<string, number>()

export const SliderModel = TileContentModel
  .named("SliderNewModel")
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
    // PROTOTYPE: visibility/selection sliders have a range instead of a single value
    sliderType: types.optional(types.enumeration([...SliderTypes]), kDefaultSliderType),
    rangeLower: types.maybe(types.number),
    rangeUpper: types.maybe(types.number),
    // the attribute a visibility/selection slider works on
    dataSetId: types.maybe(types.string),
    attributeId: types.maybe(types.string),
    // selection slider: paused when the selection changes elsewhere, until the slider is touched. Saved
    // with the document, so it reopens active or paused as it was; never part of undo/redo.
    paused: types.optional(types.boolean, false),
    // the items this slider has set aside, and in which dataset, so it only ever restores its own (never ones
    // the user hid). Saved, not volatile: undoing a tile close or reopening a document rebuilds the slider from
    // its snapshot, and a volatile list came back empty, so the slider then mistook its own set-aside cases for
    // the user's and left in-range cases hidden (ship-check finding #1). Never part of undo/redo -- it records
    // ownership, and syncDataToRange reconciles it with the dataset's actual set-aside list every time.
    hiddenItemIds: types.array(types.string),
    hiddenDataSetId: types.maybe(types.string)
  })
  .volatile(() => ({
    axisHelper: undefined as Maybe<AxisHelper>,
    _isAxisAnimating: false,
    // the range while it's being dragged; committed to rangeLower/rangeUpper when the drag ends
    dynamicRange: undefined as Maybe<[number, number]>,
    // the dataset's selectionChanges count after the slider last set the selection itself
    ownSelectionChange: -1
   }))
  .views(self => ({
    get isPaused() {
      return self.paused
    },
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
    get isRangeSlider() {
      return self.sliderType !== "variable"
    },
    get dataSet(): IDataSet | undefined {
      return self.dataSetId ? getDataSetFromId(self, self.dataSetId) : undefined
    },
    get hiddenInDataSet(): IDataSet | undefined {
      return self.hiddenDataSetId ? getDataSetFromId(self, self.hiddenDataSetId) : undefined
    },
    get defaultRange(): [number, number] {
      const { min, max } = self.axis
      return [min, min + (max - min) * kDefaultRangeFraction]
    }
  }))
  .views(self => ({
    get attribute() {
      return self.attributeId ? self.dataSet?.attrFromID(self.attributeId) : undefined
    },
    get hasAttribute() {
      return !!(self.dataSet && self.attributeId && self.dataSet.attrFromID(self.attributeId))
    }
  }))
  .views(self => ({
    get isDateAttribute() {
      return self.attribute?.type === "date"
    },
    // every item (including hidden ones) with its numeric value; dates are seconds, like the date scale
    get itemValues(): Array<{ id: string, value: number }> {
      const { dataSet, attribute } = self
      if (!dataSet || !attribute) return []
      // attribute values aren't observable themselves; changeCount is bumped when they're edited
      void attribute.changeCount
      const isDate = attribute.type === "date"
      return dataSet._itemIds.map((id, index) => {
        let value = NaN
        if (isDate) {
          const date = convertToDate(attribute.strValue(index))
          if (date) value = date.getTime() / 1000
        }
        else {
          value = attribute.numValue(index)
        }
        return { id, value }
      })
    }
  }))
  .views(self => ({
    // the distinct values present, ascending -- a collapsed range snaps to one of these
    get sortedValues(): number[] {
      const values = self.itemValues.map(({ value }) => value).filter(value => isFinite(value))
      return Array.from(new Set(values)).sort((a, b) => a - b)
    }
  }))
  .views(self => ({
    nearestValue(value: number) {
      const values = self.sortedValues
      if (!values.length) return value
      return values.reduce((best, v) => Math.abs(v - value) < Math.abs(best - value) ? v : best, values[0])
    }
  }))
  .views(self => ({
    get range(): [number, number] {
      if (self.dynamicRange) return self.dynamicRange
      if (self.rangeLower != null && self.rangeUpper != null) return [self.rangeLower, self.rangeUpper]
      return self.defaultRange
    },
    // a date range counts whole units at the precision its readout shows (ship-check #6): the readout says
    // "6/1/2005 - 6/14/2005", so every case on the 1st and the 14th is in, though the ends themselves sit
    // part-way through those days. Rounding the test rather than the ends keeps keyboard steps smaller than
    // the readout's unit working, and a collapsed thumb collapsed (it then covers one whole day). Same rule
    // as the readout (range-format.ts): the attribute's date precision if set, else the date axis's.
    get rangeDateUnit(): DatePrecision | undefined {
      if (self.scaleType !== "date" || !isDateAxisModel(self.axis)) return undefined
      const attr = self.attribute
      const unit = attr?.type === "date" && attr.datePrecision ? attr.datePrecision : self.axis.precisionForDisplay
      return unit && unit !== "millisecond" ? unit : undefined
    }
  }))
  .views(self => ({
    // is a value (a number, or a date in seconds) inside the range? Both ends are included.
    isValueInRange(value: number, range: [number, number] = self.range) {
      if (!isFinite(value)) return false
      const [lo, hi] = range
      const unit = self.rangeDateUnit
      if (!unit) return value >= lo && value <= hi
      const start = startOfDateUnit(value, unit)
      return start >= startOfDateUnit(lo, unit) && start <= startOfDateUnit(hi, unit)
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
    },
    getAxisHelper(place: AxisPlace, subAxisIndex: number) {
      return self.axisHelper
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
    // keeps the range inside the axis and in order; with `snap`, a collapsed range snaps to a value in
    // the data, so something is always visible or selected
    constrainRange(lower: number, upper: number, snap = true): [number, number] {
      const { min, max } = self.axis
      let lo = Math.max(min, Math.min(lower, upper))
      let hi = Math.min(max, Math.max(lower, upper))
      if (snap && self.hasAttribute && hi - lo <= 1e-9 * Math.max(1, Math.abs(max - min))) {
        lo = hi = self.nearestValue(lo)
      }
      // CODAP-1516: "the range can never be empty of cases" -- a range over a gap in the data extends its
      // nearer end to the closest value
      else if (snap && self.hasAttribute) {
        // only values on the scale (Minimum/Maximum can be set inside the data's span)
        const values = self.sortedValues.filter(v => v >= min && v <= max)
        if (values.length && !values.some(v => self.isValueInRange(v, [lo, hi]))) {
          const below = values.filter(v => v < lo).pop()
          const above = values.find(v => v > hi)
          if (below != null && (above == null || lo - below <= above - hi)) lo = below
          else if (above != null) hi = above
        }
      }
      return [lo, hi]
    }
  }))
  .actions(self => ({
    // while dragging (or playing) there's no snapping, so a joined thumb follows the pointer smoothly;
    // it settles onto a value in the data when the range is committed with setRange
    setDynamicRange(lower: number, upper: number) {
      self.dynamicRange = self.constrainRange(lower, upper, false)
    },
    setRange(lower: number, upper: number) {
      const [lo, hi] = self.constrainRange(lower, upper)
      self.rangeLower = lo
      self.rangeUpper = hi
      self.dynamicRange = undefined
    },
    setPaused(paused: boolean) {
      self.paused = paused
    },
    setOwnSelectionChange(count: number) {
      self.ownSelectionChange = count
    },
    setSliderType(sliderType: ISliderType) {
      if (sliderType === self.sliderType) return
      self.sliderType = sliderType
      // only a selection slider pauses
      self.paused = false
      // a slider switching into range mode starts with the default range
      if (sliderType !== "variable" && (self.rangeLower == null || self.rangeUpper == null)) {
        const [lo, hi] = self.defaultRange
        self.rangeLower = lo
        self.rangeUpper = hi
      }
    }
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
    setAxisHelper(place: AxisPlace, subAxisIndex: number, helper: AxisHelper) {
      self.axisHelper = helper
    },
    setIsAxisAnimating(animating: boolean) {
      self._isAxisAnimating = animating
    }
  }))
  // PROTOTYPE: linking a visibility/selection slider to an attribute
  .actions(self => ({
    // records which items this slider has set aside -- saved, but kept out of undo/redo (like pausing).
    // Only call it from a top-level action (the sync reaction): withoutUndo inside another action would
    // take that whole action out of undo.
    setHiddenItemsWithoutUndo(ids: string[], dataSetId?: string) {
      const newDataSetId = ids.length ? dataSetId : undefined
      if (newDataSetId === self.hiddenDataSetId && comparer.structural(ids, [...self.hiddenItemIds])) return
      self.applyModelChange(() => {
        withoutUndo({ suppressWarning: true })
        self.hiddenItemIds.replace(ids)
        self.hiddenDataSetId = newDataSetId
      })
    },
    // brings back every item this slider set aside (never the ones the user hid), in the dataset only;
    // the caller updates the slider's own list
    showOwnHiddenItems() {
      // here, not just inside data.applyModelChange: CODAP ignores withoutUndo in a nested action, so a
      // tile close used to leave this as its own undo step, and the next undo set cases aside behind the
      // slider's back (ship-check finding #1)
      withoutUndo({ suppressWarning: true })
      const data = self.hiddenInDataSet
      const ids = self.hiddenItemIds.filter(id => data?.isItemSetAside(id))
      if (data && ids.length) {
        data.applyModelChange(() => {
          withoutUndo({ suppressWarning: true })
          data.showHiddenCasesAndItems(ids)
        })
      }
    }
  }))
  .actions(self => ({
    // makes the dataset match the slider: visibility sets aside the items outside the range,
    // selection selects the visible items inside it (unless paused)
    // `applySelection` false: keep the visibility in step but leave the selection alone (data changes)
    syncDataToRange(applySelection = true) {
      // the dataset follows the slider, so none of this is an undo step of its own (see showOwnHiddenItems)
      withoutUndo({ suppressWarning: true })
      const data = self.isRangeSlider && self.hasAttribute ? self.dataSet : undefined
      // a different dataset (or none): give back everything set aside in the old one
      if (self.hiddenDataSetId && self.hiddenDataSetId !== data?.id) {
        self.showOwnHiddenItems()
        self.setHiddenItemsWithoutUndo([])
      }
      if (!data) return
      const [lo, hi] = self.range
      const inRange = (value: number) => self.isValueInRange(value, [lo, hi])
      const values = self.itemValues
      const ownHidden = new Set(self.hiddenItemIds)

      // visibility: hide the out-of-range items the user hasn't already hidden themselves
      const wantHidden = self.sliderType === "visibility"
        ? values.filter(({ id, value }) => !inRange(value) && (ownHidden.has(id) || !data.isItemSetAside(id)))
                .map(({ id }) => id)
        : []
      const wantSet = new Set(wantHidden)
      // compare with what the dataset actually has set aside, not with the list: after an undo or a reopen the
      // two can disagree (e.g. a tile close showed the cases, then its undo brought the slider and its list back)
      const toHide = wantHidden.filter(id => !data.isItemSetAside(id))
      const toShow = self.hiddenItemIds.filter(id => !wantSet.has(id) && data.isItemSetAside(id))

      runInAction(() => {
        if (toHide.length || toShow.length) {
          data.applyModelChange(() => {
            withoutUndo({ suppressWarning: true })
            toShow.length && data.showHiddenCasesAndItems(toShow)
            toHide.length && data.hideCasesOrItems(toHide)
          })
        }
        self.setHiddenItemsWithoutUndo(wantHidden, data.id)
        if (toHide.length || toShow.length) {
          visibilitySliderChanges.set(data.id, (visibilitySliderChanges.get(data.id) ?? 0) + 1)
        }

        // selection: replace the selection with the visible items in range
        if (applySelection && self.sliderType === "selection" && !self.isPaused) {
          const selected = values.filter(({ id, value }) => inRange(value) && !data.isItemHidden(id))
                                 .map(({ id }) => id)
          data.applyModelChange(() => {
            withoutUndo({ suppressWarning: true })
            data.setSelectedCases(selected)
          })
          // remember the count our own change produced, so the pause watcher can ignore it
          self.ownSelectionChange = data.selectionChanges
        }
      })
    },
    // pausing and resuming aren't edits: they're saved but kept out of undo/redo
    setPausedWithoutUndo(paused: boolean) {
      if (paused === self.paused) return
      self.applyModelChange(() => {
        withoutUndo({ suppressWarning: true })
        self.setPaused(paused)
      })
    }
  }))
  .views(self => ({
    // selection slider: does the dataset's selection still match the range (the visible items in it)?
    get selectionMatchesRange() {
      const data = self.dataSet
      if (!data) return true
      return self.itemValues.every(({ id, value }) => {
        const wanted = self.isValueInRange(value) && !data.isItemHidden(id)
        return wanted === data.isCaseSelected(id)
      })
    }
  }))
  .actions(self => ({
    afterCreate() {
      addDisposer(self, reaction(
        () => self.axis.domain,
        ([axisMin, axisMax]) => {
          // skip constraining value during axis animation (value is intentionally outside bounds)
          if (self._isAxisAnimating) return
          // keep the thumbnail within axis bounds when axis bounds are changed
          if (self.value < axisMin) self.setDynamicValueIfDynamic(axisMin)
          if (self.value > axisMax) self.setDynamicValueIfDynamic(axisMax)
          // PROTOTYPE: keep a stored range within the axis bounds too
          if (self.rangeLower != null && self.rangeUpper != null &&
              (self.rangeLower < axisMin || self.rangeUpper > axisMax)) {
            self.setRange(self.rangeLower, self.rangeUpper)
          }
        }, { name: "SliderModel [axis.domain]" }
      ))
    },
    beforeDestroy() {
      // leave the list alone: the closed tile's snapshot (kept for undo) must still name the cases it had
      // set aside, so undoing the close hands them back to the slider
      self.showOwnHiddenItems()
    },
    afterAttachToDocument() {
      // PROTOTYPE: keep the dataset in step with the slider's type, attribute and range. When only the
      // number of cases changed, the visibility follows but the selection is left alone -- editing data never
      // selects anything on its own (the data watcher below pauses the slider instead).
      addDisposer(self, reaction(
        () => {
          const [lo, hi] = self.range
          return {
            type: self.sliderType, dataSetId: self.dataSetId, attributeId: self.attributeId,
            hasAttribute: self.hasAttribute, lo, hi, unit: self.rangeDateUnit, paused: self.isPaused,
            count: self.itemValues.length,
            visibilityChanges: self.dataSetId ? visibilitySliderChanges.get(self.dataSetId) ?? 0 : 0
          }
        },
        (key, prev) => {
          const onlyCountChanged = !!prev && key.count !== prev.count &&
            comparer.structural({ ...key, count: 0 }, { ...prev, count: 0 })
          self.syncDataToRange(!onlyCountChanged)
        },
        { name: "SliderModel [syncDataToRange]", equals: comparer.structural, fireImmediately: true }
      ))
      // PROTOTYPE: a selection slider pauses when something else changes the selection
      addDisposer(self, reaction(
        () => self.dataSet?.selectionChanges,
        count => {
          if (self.sliderType === "selection" && self.hasAttribute && !self.isPaused &&
              count != null && count !== self.ownSelectionChange) {
            self.setPausedWithoutUndo(true)
          }
        }, { name: "SliderModel [selection pause]" }
      ))
      // PROTOTYPE: ...and when the data changes under it (values edited, cases added, hidden cases shown) so
      // that its selection no longer covers its range. Changes of type, attribute or range are the slider's
      // own and re-select, as are a visibility slider's hide/show changes, so they're ignored here.
      addDisposer(self, reaction(
        () => ({
          context: [self.sliderType, self.dataSetId, self.attributeId, ...self.range,
            self.dataSetId ? visibilitySliderChanges.get(self.dataSetId) ?? 0 : 0],
          data: self.itemValues.map(({ id, value }) => [value, !!self.dataSet?.isItemHidden(id)])
        }),
        ({ context }, prev) => {
          if (!comparer.structural(context, prev.context)) return
          if (self.sliderType === "selection" && self.hasAttribute && !self.isPaused &&
              !self.selectionMatchesRange) {
            self.setPausedWithoutUndo(true)
          }
        }, { name: "SliderModel [data pause]", equals: comparer.structural }
      ))

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
    // the doc's "configure itself": a dropped/chosen numeric or date attribute sets the slider's type
    // (a variable slider becomes a visibility slider), scale, bounds (the attribute's min and max) and
    // a starting range at the left (kDefaultRangeFraction of the axis)
    setAttribute(dataSetId: string, attributeId: string) {
      // the sync reaction gives back the cases set aside in the old dataset
      self.dataSetId = dataSetId
      self.attributeId = attributeId
      if (self.sliderType === "variable") self.sliderType = "visibility"
      self.paused = false
      const values = self.sortedValues
      if (!values.length) return
      self.setScaleType(self.isDateAttribute ? "date" : "numeric")
      let min = values[0]
      let max = values[values.length - 1]
      if (min === max) {
        // a single value still needs an axis to sit on: a day either side for dates, 1 for numbers
        const pad = self.isDateAttribute ? 24 * 60 * 60 : 1
        min -= pad
        max += pad
      }
      // set max first when moving the axis up, min first when moving it down, so min < max throughout
      if (min >= self.axis.max) { self.setAxisMax(max); self.setAxisMin(min) }
      else { self.setAxisMin(min); self.setAxisMax(max) }
      self.dynamicRange = undefined
      self.rangeLower = min
      self.rangeUpper = min + (max - min) * kDefaultRangeFraction
    },
    removeAttribute() {
      // the sync reaction gives back the cases this slider set aside
      self.dataSetId = undefined
      self.attributeId = undefined
      self.paused = false
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
