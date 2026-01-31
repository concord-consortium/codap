/*
  The Attribute model is part of the data model originally designed for CLUE updated for CODAP 3,
  which represents a "column" of data. It is a MobX State Tree model in which the metadata
  properties are MST properties (and hence are observable) but the data values are stored in a
  "frozen" array, which means that individual data values are not observable. This is to avoid
  the memory and performance overhead of wrapping each individual value in MST proxies and event
  handlers for potentially tens of thousands of values in a large data set (cf.
  https://github.com/mobxjs/mobx-state-tree/issues/1683).

  Note that due to a limitation of MST's `frozen` type, namely that frozen values are made
  immutable at runtime in development mode (literally by calling `Object.freeze()`), we must
  do a bit of sleight-of-hand to allow Attribute values to be modifiable in development mode.
  To enable mutability, we move the values into `volatile` storage at creation time and then
  move it back to its `frozen` location for serialization. For this to work, clients must
  call the `preSerialize()` and `postSerialize()` functions before and after serialization.

  Like Fathom and and CODAP 2, we need to be able to store heterogeneous values, e.g. strings,
  numbers, boolean values, eventually possibly things like image URLs, etc. Unlike those prior
  implementations, rather than making the native or underlying representation heterogeneous,
  the Attribute model represents all values natively as strings. All values must be representable
  as strings for serialization purposes, and even most numeric values enter the system as strings
  via user input or CSV import, etc. Conversion functions make it easy to retrieve other
  representations and converted numeric values are cached at runtime so that those conversions
  can be minimized. In addition to simplifying the code this should have performance benefits as
  JavaScript engines can optimize operations on homogeneous arrays more than heterogeneous ones.
 */

import { reaction } from "mobx"
import { addDisposer, Instance, SnapshotIn, types } from "mobx-state-tree"
import { kAttrIdPrefix, typeV3Id } from "../../utilities/codap-utils"
import { parseColor } from "../../utilities/color-utils"
import { isDateString } from "../../utilities/date-parser"
import { DatePrecision, datePrecisions } from "../../utilities/date-utils"
import { hashString } from "../../utilities/js-utils"
import { extractNumeric } from "../../utilities/math-utils"
import { cachedFnFactory } from "../../utilities/mst-utils"
import { isDevelopment, isProduction } from "../../utilities/environment-utils"
import { isBoundaryString, kPolygonNames } from "../boundaries/boundary-types"
import { Formula, IFormula } from "../formula/formula"
import { applyModelChange } from "../history/apply-model-change"
import { withoutUndo } from "../history/without-undo"
import {
  AttributeType, attributeTypes, importValueToString, IValueType
} from "./attribute-types"
import { V2Model } from "./v2-model"

export interface ISetValueOptions {
  noInvalidate?: boolean
}

export const kHashMapSizeThreshold = 64
const kHashMapEntryOverhead = 20 // estimated overhead per hash map entry in chars

function hashKey(value: string): string {
  return `${value.length}:${hashString(value)}`
}
function hashKeyString(key: string): string {
  return `__hash__${key}__`
}
function hashKeyFromString(value: string) {
  const result = /^__hash__(.+:.+)__$/.exec(value)
  return result?.[1]
}

export const Attribute = V2Model.named("Attribute").props({
  id: typeV3Id(kAttrIdPrefix),
  _cid: types.maybe(types.string), // cid was a v2 property that is used by some plugins (Collaborative)
  clientKey: "",
  sourceID: types.maybe(types.string),
  description: types.maybe(types.string),
  userType: types.maybe(types.enumeration([...attributeTypes])),
  // userFormat: types.maybe(types.string),
  units: types.maybe(types.string),
  precision: types.maybe(types.union(types.number, types.enumeration(datePrecisions))),
  formula: types.maybe(Formula),
  // simple array -- _not_ MST all the way down to the array elements
  // due to its frozen nature, clients should _not_ use `values` directly
  // volatile `strValues` and `numValues` can be accessed directly, but
  // should not be modified directly.
  values: types.maybe(types.frozen<string[]>()),
  // for serialization, large values are stored in a hash map to eliminate redundancy
  hashMap: types.maybe(types.frozen<Record<string, string>>())
})
  .preProcessSnapshot(snapshot => {
    const {formula: inFormula, values: inValues, hashMap, precision: inPrecision, ...others} = snapshot
    // early development versions of v3 had a `title` property
    const _title = snapshot._title ?? ((snapshot as any).title || undefined)
    // don't import empty formulas
    const formula = inFormula?.display?.length ? inFormula : undefined
    // map all non-string values to strings
    let values = (inValues || []).map(v => importValueToString(v))
    // reconstruct large values from hash map
    if (hashMap) {
      values = values.map(value => {
        const key = hashKeyFromString(value)
        return key ? hashMap[key] || value : value
      })
    }
    // convert null precision to undefined (null can occur from JSON serialization)
    const precision = inPrecision === null ? undefined : inPrecision
    return {formula, values, precision, ...others, _title}
  })
  .postProcessSnapshot(snapshot => {
    const {values: inValues = [], hashMap = {}, ...others} = snapshot
    let charsSaved = 0
    const values = inValues.map(value => {
      if (value.length >= kHashMapSizeThreshold) {
        const key = hashKey(value)
        if (!hashMap[key]) {
          hashMap[key] = value
        }
        else if (hashMap[key] !== value) {
          /* istanbul ignore next */
          console.error(`Hash collision detected for attribute value: "${value}"`)
        }
        else {
          charsSaved += value.length
        }
        return hashKeyString(key)
      }
      return value
    })
    // only include the hash map if it actually saves space
    const hashMapSize = Object.keys(hashMap).length
    return hashMapSize > 0 && charsSaved > hashMapSize * kHashMapEntryOverhead
            ? {...others, values, hashMap}
            : snapshot
  })
  .volatile(self => ({
    strValues: [] as string[],
    numValues: [] as number[],
    changeCount: 0
  }))
  .views(self => {
    const baseMatchNameOrId = self.matchNameOrId
    return {
      matchNameOrId(nameOrId: string | number) {
        return self.id === nameOrId || baseMatchNameOrId(nameOrId)
      }
    }
  })
  .views(self => ({
    importValue(value: IValueType) {
      // may eventually want to do something more sophisticated here, like convert
      // numeric values using an attribute-specific number of decimal places
      return importValueToString(value)
    },
    get isNumeric() {
      // An attribute is considered numeric if any of its values is a number.
      return self.numValues.some(value => !isNaN(value))
    },
    toNumeric(value: string) {
      if (value == null || value === "") return NaN
      if (self.userType === "numeric") return extractNumeric(value) ?? NaN
      return Number(value)
    },
    get numPrecision() {
      return typeof self.precision === "number" ? self.precision : undefined
    },
    get datePrecision() {
      return typeof self.precision === "string" ? self.precision : undefined
    },
    isInferredNumericType: cachedFnFactory<boolean>(() => {
      let numCount = 0
      const isEveryValueNumericOrEmpty = self.strValues.every((strValue, index) => {
        if (strValue == null || strValue === "") return true
        if (isFinite(self.numValues[index])) {
          ++numCount
          return true
        }
        return false
      })
      return numCount > 0 && isEveryValueNumericOrEmpty
    }),
    // tracks whether every non-empty value could be a year (1000-2999)
    isInferredYearType: cachedFnFactory<boolean>(() => {
      let potentialYearCount = 0
      const isEveryValuePotentialYearOrEmpty = self.strValues.every((strValue, index) => {
        if (strValue == null || strValue === "") return true
        const num = self.numValues[index]
        if (isFinite(num) && Number.isInteger(num) && 1000 <= num && num < 3000) {
          ++potentialYearCount
          return true
        }
        return false
      })
      return potentialYearCount > 0 && isEveryValuePotentialYearOrEmpty
    }),
    isInferredColorType: cachedFnFactory<boolean>(() => {
      let colorCount = 0
      const isEveryValueColorOrEmpty = self.strValues.every((strValue, index) => {
        if (strValue == null || strValue === "") return true
        if (parseColor(strValue)) {
          ++colorCount
          return true
        }
        return false
      })
      return colorCount > 0 && isEveryValueColorOrEmpty
    }),
    isInferredDateType: cachedFnFactory<boolean>(() => {
      let dateCount = 0
      const isEveryValueDateOrEmpty = self.strValues.every((strValue, index) => {
        if (strValue == null || strValue === "") return true
        if (isDateString(strValue)) {
          ++dateCount
          return true
        }
        return false
      })
      return dateCount > 0 && isEveryValueDateOrEmpty
    }),
    isInferredBoundaryType: cachedFnFactory<boolean>(() => {
      let boundaryCount = 0
      const isEveryValueBoundaryOrEmpty = self.strValues.every((strValue, index) => {
        if (strValue == null || strValue === "") return true
        if (isBoundaryString(strValue)) {
          ++boundaryCount
          return true
        }
        return false
      })
      return boundaryCount > 0 && isEveryValueBoundaryOrEmpty
    }),
    get hasFormula() {
      return !!self.formula && !self.formula.empty
    },
    get hasValidFormula() {
      return !!self.formula?.valid
    },
    get shouldSerializeValues() {
      return !this.hasFormula
    },
    get cid() {
      return self._cid ?? self.id
    }
  }))
  .actions(self => ({
    incChangeCount() {
      self.isInferredNumericType.invalidate()
      self.isInferredYearType.invalidate()
      self.isInferredColorType.invalidate()
      self.isInferredBoundaryType.invalidate()
      self.isInferredDateType.invalidate()
      ++self.changeCount
    },
    setCid(cid?: string) {
      self._cid = cid
    },
    updateNumValues() {
      // cache the numeric conversion of each value in volatile `numValues`
      self.numValues = self.strValues.map(v => self.toNumeric(v))
      self.isInferredNumericType.invalidate()
      self.isInferredYearType.invalidate()
    }
  }))
  .volatile(self => ({
    // This in a volatile section instead of an action section so that when it is called by afterCreate it doesn't
    // show up as a change in the history. Changes made in afterCreate directly are ignored by the history system.
    initializeVolatileState() {
      // frozen properties are not modifiable in development (because MST freezes them with Object.freeze),
      // so we copy the data to volatile properties during runtime. Clients must call prepareSnapshot() before
      // and completeSnapshot() after serialization for this to work under these conditions. MST doesn't
      // actually freeze the values in production, so prepareSnapshot()/completeSnapshot() are NOPs in production.
      if (isDevelopment()) {
        // copy the frozen values into volatile `strValues`
        self.strValues = [...(self.values || [])]
        // clear frozen `values` so clients aren't tempted to access them and
        // so we're not maintaining a triplicate copy of the data in memory.
        self.values = undefined
      }
      else {
        // in production mode, `strValues` can share the `values` array since it isn't frozen
        if (!self.values) self.values = []
        self.strValues = self.values
      }

      // Update the numeric values cache
      self.updateNumValues()

      // NOTE: we don't need to increment changeCount here. We are replacing the entire value
      // of strValues. And the volatile object itself is observable (but by default not its contents). So
      // any view that is reading strValues will be updated.
    }

  }))
  .actions(self => ({
    afterCreate() {
      self.initializeVolatileState()
      addDisposer(self, reaction(
        () => self.userType === "numeric",
        () => self.updateNumValues(),
        { name: "Attribute.userType.reaction" })
      )
    },
    // should be called before retrieving snapshot (i.e. before serialization)
    prepareSnapshot() {
      if (isDevelopment() && self.shouldSerializeValues) {
        // In development, values is undefined (see .afterCreate()). If the attribute values should be serialized
        // (no formula), we need to temporarily update it to the current values.
        withoutUndo({ noDirty: true, suppressWarning: true })
        self.values = [...self.strValues]
      }
      if (isProduction() && !self.shouldSerializeValues) {
        // In development, values is set to the volatile strValues (see .afterCreate()). If the attribute values should
        // NOT be serialized (non-empty formula) we need to temporarily set it to undefined.
        withoutUndo({ noDirty: true, suppressWarning: true })
        self.values = undefined
      }
    },
    // should be called after retrieving snapshot (i.e. after serialization)
    completeSnapshot() {
      if (isDevelopment() && self.shouldSerializeValues) {
        // values should be set back to undefined in development mode.
        withoutUndo({ noDirty: true, suppressWarning: true })
        self.values = undefined
      }
      if (isProduction() && !self.shouldSerializeValues) {
        // values should be set back to the volatile strValues in production mode.
        withoutUndo({ noDirty: true, suppressWarning: true })
        self.values = self.strValues
      }
    },
    afterApplySnapshot() {
      self.initializeVolatileState()
    }
  }))
  .views(self => ({
    get length() {
      self.changeCount  // eslint-disable-line @typescript-eslint/no-unused-expressions
      return self.strValues.length
    },
    get type() {
      if (self.userType) return self.userType
      self.changeCount  // eslint-disable-line @typescript-eslint/no-unused-expressions
      if (this.length === 0) return

      // only infer numeric if all non-empty values are numeric (CODAP2)
      if (self.isInferredNumericType()) return "numeric"

      // only infer date if all non-empty values are dates
      if (self.isInferredDateType()) return "date"

      // only infer color if all non-empty values are strict colors
      if (self.isInferredColorType()) return "color"

      // only infer boundary if all non-empty values are boundaries or if the attribute has a special name
      if (kPolygonNames.includes(self.title) || self.isInferredBoundaryType()) {
        return "boundary"
      }

      return "categorical"
    },
    value(index: number) {
      const numValue = self.numValues[index]
      return !isNaN(numValue) ? numValue : self.strValues[index]
    },
    isValueNumeric(index: number) {
      return !isNaN(self.numValues[index])
    },
    numValue(index: number) {
      return self.numValues[index]
    },
    strValue(index: number) {
      return self.strValues[index]
    },
    boolean(index: number) {
      return ["true", "yes"].includes(self.strValues[index].toLowerCase()) ||
        (!isNaN(this.numValue(index)) ? this.numValue(index) !== 0 : false)
    },
    derive(name?: string) {
      return {id: self.id, name: name || self.name, values: []}
    }
  }))
  .actions(self => ({
    setName(newName: string) {
      self.name = newName.trim()
    },
    setUnits(units?: string) {
      self.units = units
    },
    setDescription(description?: string) {
      self.description = description
    },
    setUserType(type?: AttributeType) {
      self.userType = type
    },
    // setUserFormat(precision: string) {
    //   self.userFormat = `.${precision}~f`
    // },
    setPrecision(precision?: number | DatePrecision) {
      self.precision = precision
    },
    clearFormula() {
      self.formula = undefined
    },
    setDisplayExpression(displayFormula: string) {
      if (displayFormula) {
        if (!self.formula) {
          self.formula = Formula.create({display: displayFormula})
        } else {
          self.formula.setDisplayExpression(displayFormula)
        }
      } else {
        this.clearFormula()
      }
    },
    addValue(value: IValueType = "", beforeIndex?: number) {
      const strValue = self.importValue(value)
      const numValue = self.toNumeric(strValue)
      if ((beforeIndex != null) && (beforeIndex < self.strValues.length)) {
        self.strValues.splice(beforeIndex, 0, strValue)
        self.numValues.splice(beforeIndex, 0, numValue)
      } else {
        self.strValues.push(strValue)
        self.numValues.push(numValue)
      }
      self.incChangeCount()
    },
    addValues(values: IValueType[], beforeIndex?: number) {
      const strValues = values.map(v => self.importValue(v))
      const numValues = strValues.map(s => self.toNumeric(s))
      if ((beforeIndex != null) && (beforeIndex < self.strValues.length)) {
        self.strValues.splice(beforeIndex, 0, ...strValues)
        self.numValues.splice(beforeIndex, 0, ...numValues)
      } else {
        self.strValues.push(...strValues)
        self.numValues.push(...numValues)
      }
      self.incChangeCount()
    },
    setValue(index: number, value: IValueType, options?: ISetValueOptions) {
      if ((index >= 0) && (index < self.strValues.length)) {
        if (typeof value === "string") {
          const trimmedValue = value.trim()
          self.strValues[index] = trimmedValue
          self.numValues[index] = self.toNumeric(trimmedValue)
        } else if (typeof value === "number") {
          self.strValues[index] = value.toString()
          self.numValues[index] = value
        } else {
          self.strValues[index] = self.importValue(value)
          self.numValues[index] = self.toNumeric(self.strValues[index])
        }
        if (!options?.noInvalidate) self.incChangeCount()
      }
    },
    setValues(indices: number[], values: IValueType[]) {
      const length = indices.length <= values.length ? indices.length : values.length
      for (let i = 0; i < length; ++i) {
        const index = indices[i]
        if ((index >= 0) && (index < self.strValues.length)) {
          self.strValues[index] = self.importValue(values[i])
          self.numValues[index] = self.toNumeric(self.strValues[index])
        }
      }
      self.incChangeCount()
    },
    setLength(length: number) {
      if (self.strValues.length < length) {
        self.strValues = self.strValues.concat(new Array(length - self.strValues.length).fill(""))
        if (isProduction()) {
          // in production mode, `strValues` shares the `values` array since it isn't frozen
          self.values = self.strValues
        }
      }
      if (self.numValues.length < length) {
        self.numValues = self.numValues.concat(new Array(length - self.numValues.length).fill(NaN))
      }
    },
    removeValues(index: number, count = 1) {
      if ((index != null) && (index < self.strValues.length) && (count > 0)) {
        self.strValues.splice(index, count)
        self.numValues.splice(index, count)
        self.incChangeCount()
      }
    },
    // order the values of the attribute according to the provided indices
    orderValues(indices: number[]) {
      const _strValues = self.strValues.slice()
      const _numValues = self.numValues.slice()
      for (let i = 0; i < _strValues.length; ++i) {
        self.strValues[i] = _strValues[indices[i]]
        self.numValues[i] = _numValues[indices[i]]
      }
    },
    clearValues() {
      for (let i = self.strValues.length - 1; i >= 0; --i) {
        self.strValues[i] = ""
        self.numValues[i] = self.toNumeric(self.strValues[i])
      }
    }
  }))
  .actions(applyModelChange)

export interface IAttribute extends Instance<typeof Attribute> {
}

export interface IAttributeSnapshot extends SnapshotIn<typeof Attribute> {
}

export interface IAttributeWithFormula extends IAttribute {
  formula: IFormula
}

export function isFormulaAttr(attr?: IAttribute): attr is IAttributeWithFormula {
  return !!attr?.hasFormula
}

export function isValidFormulaAttr(attr?: IAttribute): attr is IAttributeWithFormula {
  return !!attr?.hasValidFormula
}
