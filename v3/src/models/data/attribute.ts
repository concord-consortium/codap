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

import {Instance, SnapshotIn, types} from "mobx-state-tree"
import { parseColor } from "../../utilities/color-utils"
import { typedId } from "../../utilities/js-utils"
import { cachedFnFactory } from "../../utilities/mst-utils"
import { Formula, IFormula } from "../formula/formula"
import { applyUndoableAction } from "../history/apply-undoable-action"
import { withoutUndo } from "../history/without-undo"
import { V2Model } from "./v2-model"

export const kDefaultFormatStr = ".3~f"

const isDevelopment = () => process.env.NODE_ENV !== "production"

export type IValueType = string | number | boolean | undefined

export function importValueToString(value: IValueType) {
  return value == null ? "" : typeof value === "string" ? value : value.toString()
}

export const attributeTypes = [
  "categorical", "numeric", "date", "qualitative", "boundary", "checkbox", "color"
] as const
export type AttributeType = typeof attributeTypes[number]
export function isAttributeType(type?: string | null): type is AttributeType {
  return type != null && (attributeTypes as readonly string[]).includes(type)
}

export const Attribute = V2Model.named("Attribute").props({
  id: types.optional(types.identifier, () => typedId("ATTR")),
  clientKey: "",
  sourceID: types.maybe(types.string),
  description: types.maybe(types.string),
  userType: types.maybe(types.enumeration([...attributeTypes])),
  // userFormat: types.maybe(types.string),
  units: types.maybe(types.string),
  precision: types.maybe(types.number),
  editable: true,
  formula: types.maybe(Formula),
  // simple array -- _not_ MST all the way down to the array elements
  // due to its frozen nature, clients should _not_ use `values` directly
  // volatile `strValues` and `numValues` can be accessed directly, but
  // should not be modified directly.
  values: types.maybe(types.frozen<string[]>())
})
.preProcessSnapshot(snapshot => {
  const { formula: inFormula, values: inValues, ...others } = snapshot
  // early development versions of v3 had a `title` property
  const _title = snapshot._title ?? ((snapshot as any).title || undefined)
  // don't import empty formulas
  const formula = inFormula?.display?.length ? inFormula : undefined
  // map all non-string values to strings
  const values = (inValues || []).map(v => importValueToString(v))
  return { formula, values, ...others, _title }
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
  toNumeric(value: string) {
    if (value == null || value === "") return NaN
    return Number(value)
  },
  getEmptyCount: cachedFnFactory<number>(() => {
    // Note that `self.changeCount` is absolutely not necessary here. However, historically, this function used to be
    // a MobX computed property, and `self.changeCount` was used to invalidate the cache. Also, there are tests
    // (and possibly some features?) that depend on MobX reactivity. Hence, this is left here for now.
    self.changeCount // eslint-disable-line no-unused-expressions
    return self.strValues.reduce((prev, current) => current === "" ? ++prev : prev, 0)
  }),
  getNumericCount: cachedFnFactory<number>(() => {
    // Note that `self.changeCount` is absolutely not necessary here. However, historically, this function used to be
    // a MobX computed property, and `self.changeCount` was used to invalidate the cache. Also, there are tests
    // (and possibly some features?) that depend on MobX reactivity. Hence, this is left here for now.
    self.changeCount // eslint-disable-line no-unused-expressions
    return self.numValues.reduce((prev, current) => isFinite(current) ? ++prev : prev, 0)
  }),
  getStrictColorCount: cachedFnFactory<number>(() => {
    // Note that `self.changeCount` is absolutely not necessary here. However, historically, this function used to be
    // a MobX computed property, and `self.changeCount` was used to invalidate the cache. Also, there are tests
    // (and possibly some features?) that depend on MobX reactivity. Hence, this is left here for now.
    self.changeCount // eslint-disable-line no-unused-expressions
    return self.strValues.reduce((prev, current) => parseColor(current) ? ++prev : prev, 0)
  }),
  get hasFormula() {
    return !!self.formula && !self.formula.empty
  },
  get hasValidFormula() {
    return !!self.formula?.valid
  },
  get shouldSerializeValues() {
    return !this.hasFormula
  }
}))
.actions(self => ({
  incChangeCount() {
    ++self.changeCount
    self.getEmptyCount.invalidate()
    self.getNumericCount.invalidate()
    self.getStrictColorCount.invalidate()
  }
}))
.actions(self => ({
  afterCreate() {
    // frozen properties are not modifiable in development (because MST freezes them with Object.freeze),
    // so we copy the data to volatile properties during runtime. Clients must call preSerialize() before
    // and postSerialize() after serialization for this to work under these conditions. MST doesn't
    // actually freeze the values in production, so preSerialize()/postSerialize() are NOPs in production.
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
    // cache the numeric conversion of each value in volatile `numValues`
    self.numValues = self.strValues.map(v => self.toNumeric(v))
  },
  // should be called before retrieving snapshot (i.e. before serialization)
  prepareSnapshot() {
    if (isDevelopment() && self.shouldSerializeValues) {
      // In development, values is undefined (see .afterCreate()). If the attribute values should be serialized
      // (no formula), we need to temporarily update it to the current values.
      withoutUndo({ suppressWarning: true })
      self.values = [...self.strValues]
    }
    if (!isDevelopment() && !self.shouldSerializeValues) {
      // In development, values is set to the volatile strValues (see .afterCreate()). If the attribute values should
      // NOT be serialized (non-empty formula) we need to temporarily set it to undefined.
      withoutUndo({ suppressWarning: true })
      self.values = undefined
    }
  },
  // should be called after retrieving snapshot (i.e. after serialization)
  completeSnapshot() {
    if (isDevelopment() && self.shouldSerializeValues) {
      // values should be set back to undefined in development mode.
      withoutUndo({ suppressWarning: true })
      self.values = undefined
    }
    if (!isDevelopment() && !self.shouldSerializeValues) {
      // values should be set back to the volatile strValues in production mode.
      withoutUndo({ suppressWarning: true })
      self.values = self.strValues
    }
  }
}))
.views(self => ({
  get length() {
    self.changeCount  // eslint-disable-line no-unused-expressions
    return self.strValues.length
  },
  get type() {
    if (self.userType) return self.userType
    self.changeCount  // eslint-disable-line no-unused-expressions
    if (this.length === 0) return

    // only infer color if all non-empty values are strict colors
    const colorCount = self.getStrictColorCount()
    if (colorCount > 0 && colorCount === this.length - self.getEmptyCount()) return "color"

    // only infer numeric if all non-empty values are numeric (CODAP2)
    const numCount = self.getNumericCount()
    if (numCount > 0 && numCount === this.length - self.getEmptyCount()) return "numeric"

    return "categorical"
  },
  get format() {
    return self.precision != null ? `.${self.precision}~f` : kDefaultFormatStr
  },
  get isEditable() {
    return self.editable && !self.hasFormula
  },
  value(index: number) {
    return self.strValues[index]
  },
  isNumeric(index: number) {
    return !isNaN(self.numValues[index])
  },
  numeric(index: number) {
    return self.numValues[index]
  },
  boolean(index: number) {
    return ["true", "yes"].includes(self.strValues[index].toLowerCase()) ||
            (!isNaN(this.numeric(index)) ? this.numeric(index) !== 0 : false)
  },
  derive(name?: string) {
    return { id: self.id, name: name || self.name, values: [] }
  }
}))
.actions(self => ({
  setName(newName: string) {
    self.name = newName
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
  setPrecision(precision?: number) {
    self.precision = precision
  },
  setEditable(editable: boolean) {
    self.editable = editable
  },
  clearFormula() {
    self.formula = undefined
  },
  setDisplayExpression(displayFormula: string) {
    if (displayFormula) {
      if (!self.formula) {
        self.formula = Formula.create({ display: displayFormula })
      }
      else {
        self.formula.setDisplayExpression(displayFormula)
      }
    }
    else {
      this.clearFormula()
    }
  },
  addValue(value: IValueType = "", beforeIndex?: number) {
    const strValue = self.importValue(value)
    const numValue = self.toNumeric(strValue)
    if ((beforeIndex != null) && (beforeIndex < self.strValues.length)) {
      self.strValues.splice(beforeIndex, 0, strValue)
      self.numValues.splice(beforeIndex, 0, numValue)
    }
    else {
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
    }
    else {
      self.strValues.push(...strValues)
      self.numValues.push(...numValues)
    }
    self.incChangeCount()
  },
  setValue(index: number, value: IValueType) {
    if ((index >= 0) && (index < self.strValues.length)) {
      self.strValues[index] = self.importValue(value)
      self.numValues[index] = self.toNumeric(self.strValues[index])
      self.incChangeCount()
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
  removeValues(index: number, count = 1) {
    if ((index != null) && (index < self.strValues.length) && (count > 0)) {
      self.strValues.splice(index, count)
      self.numValues.splice(index, count)
      self.incChangeCount()
    }
  },
  clearValues() {
    for (let i = self.strValues.length - 1; i >= 0; --i) {
      self.strValues[i] = ""
      self.numValues[i] = self.toNumeric(self.strValues[i])
    }
  }
}))
.actions(applyUndoableAction)

export interface IAttribute extends Instance<typeof Attribute> {}
export interface IAttributeSnapshot extends SnapshotIn<typeof Attribute> {}

export interface IAttributeWithFormula extends IAttribute {
  formula: IFormula
}

export function isFormulaAttr(attr?: IAttribute): attr is IAttributeWithFormula {
  return !!attr?.hasFormula
}

export function isValidFormulaAttr(attr?: IAttribute): attr is IAttributeWithFormula {
  return !!attr?.hasValidFormula
}
