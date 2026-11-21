import { isTimeOfDayString, parseTimeOfDay } from "../../utilities/date-parser"
import { convertToDate, DatePrecision, formatDate } from "../../utilities/date-utils"
import { uniqueName } from "../../utilities/js-utils"
import { dateFunctions } from "../formula/functions/date-functions"
import { asFormulaIdentifier } from "../formula/utils/name-mapping-utils"
import { IAttribute } from "./attribute"
import { IDataSet } from "./data-set"

interface ITimeInfo {
  // every non-empty value is a time of day with no date, e.g. "13:45" or "1:45 PM"
  isTimeOnly: boolean
  // the values can supply a time of day: time-only values, or dates with a time other than midnight
  hasTimeOfDay: boolean
  // at least one value has a non-zero number of seconds, so the combined attribute needs `second` precision
  hasSeconds: boolean
}
interface ITimeInfoCacheEntry extends ITimeInfo {
  changeCount: number
  strValues: string[]
  type: IAttribute["type"]
}
const timeInfoCache = new WeakMap<IAttribute, ITimeInfoCacheEntry>()

function hasNonMidnightTime(value: string) {
  const date = convertToDate(value)
  return !!date && (date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0)
}

function hasNonZeroSeconds(value: string) {
  const seconds = convertToDate(value)?.getSeconds() ?? parseTimeOfDay(value)?.seconds
  return !!seconds
}

/**
 * Classifies the attribute's values as time-only and/or able to supply a time of day, and notes whether any
 * value has seconds.
 * Reads `changeCount`, `strValues` and `type` so observers react to value edits and type changes, and caches
 * the result until any of them changes, so repeated calls don't rescan the values.
 */
function getTimeInfo(attr: IAttribute): ITimeInfo {
  // a type change (e.g. setUserType) doesn't change changeCount or strValues, so the type is part of the key
  const { changeCount, strValues, type } = attr
  const cached = timeInfoCache.get(attr)
  if (cached?.changeCount === changeCount && cached.strValues === strValues && cached.type === type) return cached

  let count = 0
  const isEveryValueTimeOrEmpty = strValues.every(value => {
    if (value == null || value === "") return true
    ++count
    return isTimeOfDayString(value)
  })
  // a Numeric attribute's formula values are numbers extracted from the strings ("13:45" becomes 1345),
  // so its values can't supply a time even when the strings look like times
  const isTimeOnly = type !== "numeric" && isEveryValueTimeOrEmpty && count > 0
  const hasTime = isTimeOnly ||
    (type === "date" && strValues.some(value => !!value && hasNonMidnightTime(value)))
  const hasSeconds = strValues.some(value => !!value && hasNonZeroSeconds(value))
  const entry = { changeCount, strValues, type, isTimeOnly, hasTimeOfDay: hasTime, hasSeconds }
  timeInfoCache.set(attr, entry)
  return entry
}

/** True if the attribute has at least one value and every non-empty value is a time of day with no date. */
export function isTimeOnlyAttribute(attr: IAttribute) {
  return getTimeInfo(attr).isTimeOnly
}

/** True if the attribute can supply a time of day: it's time-only, or it holds dates with non-midnight times. */
export function hasTimeOfDay(attr: IAttribute) {
  return getTimeInfo(attr).hasTimeOfDay
}

/** True if the attribute holds dates (with or without times) or times of day. */
export function isDateOrTimeAttribute(attr: IAttribute) {
  return attr.type === "date" || isTimeOnlyAttribute(attr)
}

/**
 * Returns the collection a combined attribute is added to: the more deeply nested of the two source
 * collections, so the formula can reference both sources.
 */
export function getCombinedAttributeCollection(data: IDataSet, attr1: IAttribute, attr2: IAttribute) {
  const index1 = data.getCollectionIndexForAttribute(attr1.id) ?? 0
  const index2 = data.getCollectionIndexForAttribute(attr2.id) ?? 0
  return data.collections[Math.max(index1, index2)]
}

export interface ICombinePartnerOptions {
  // rejects collections the combined attribute can't be added to, e.g. ones a plugin locks
  canAddToCollection?: (collectionId: string) => boolean
  // excludes attributes the user can't see
  isHidden?: (attrId: string) => boolean
}

/**
 * Returns the attributes that can be combined with the specified attribute: the other date/time attributes
 * in the data set for which the pair has a date and a time of day. That excludes pairs of time-only
 * attributes (no date) and pairs in which neither attribute has a time of day (the result would always be
 * midnight). Hidden attributes and pairs whose combined attribute would go in a rejected collection are
 * excluded too. Returns an empty array if the specified attribute isn't itself a date/time attribute.
 */
export function getCombineDateTimePartners(
  data: IDataSet, attrId: string, options: ICombinePartnerOptions = {}
): IAttribute[] {
  const { canAddToCollection, isHidden } = options
  const attr = data.getAttribute(attrId)
  if (!attr || !isDateOrTimeAttribute(attr)) return []
  return data.attributes.filter(other => {
    if (!other || other.id === attrId || isHidden?.(other.id) || !isDateOrTimeAttribute(other)) return false
    if (isTimeOnlyAttribute(attr) && isTimeOnlyAttribute(other)) return false
    if (!hasTimeOfDay(attr) && !hasTimeOfDay(other)) return false
    if (!canAddToCollection) return true
    const collection = getCombinedAttributeCollection(data, attr, other)
    return !!collection && canAddToCollection(collection.id)
  })
}

export interface IDateTimeRoles {
  dateAttr: IAttribute
  timeAttr: IAttribute
}

/**
 * Decides which attribute supplies the date and which supplies the time. A time-only attribute always
 * supplies the time. Otherwise, if only one attribute has a time of day, it supplies the time. If both do,
 * the first one supplies the date.
 */
export function getDateTimeRoles(first: IAttribute, second: IAttribute): IDateTimeRoles {
  const isFirstTime = isTimeOnlyAttribute(first) ||
    (!isTimeOnlyAttribute(second) && hasTimeOfDay(first) && !hasTimeOfDay(second))
  return isFirstTime
    ? { dateAttr: second, timeAttr: first }
    : { dateAttr: first, timeAttr: second }
}

export function combineDateTimeFormula(dateName: string, timeName: string) {
  const d = asFormulaIdentifier(dateName)
  const tm = asFormulaIdentifier(timeName)
  return `date(year(${d}), month(${d}), dayOfMonth(${d}), hours(${tm}), minutes(${tm}), seconds(${tm}))`
}

/**
 * Returns the date precision for the combined attribute: "second" if any time value has seconds, otherwise
 * "minute". The combined attribute stores it, so the column shows the time even at midnight, and the preview
 * uses it too, so the two match.
 */
export function getCombinedDatePrecision(timeAttr: IAttribute): DatePrecision {
  return getTimeInfo(timeAttr).hasSeconds ? "second" : "minute"
}

export interface ICombineDateTimePreview {
  dateValue: string
  timeValue: string
  result: string
}

/**
 * Returns an example of the combination, using the first case that has both a date and a time value.
 * It evaluates the same functions as the generated formula and formats the result with the precision the
 * combined attribute is created with, so it matches what the new attribute will show.
 */
export function getCombineDateTimePreview(roles: IDateTimeRoles): ICombineDateTimePreview | undefined {
  const { dateAttr, timeAttr } = roles
  const index = dateAttr.strValues.findIndex((value, i) => !!value && !!timeAttr.strValues[i])
  if (index < 0) return

  const dateValue = dateAttr.strValues[index]
  const timeValue = timeAttr.strValues[index]
  const { date, year, month, dayOfMonth, hours, minutes, seconds } = dateFunctions
  const combined = date.evaluate(
    year.evaluate(dateValue), month.evaluate(dateValue), dayOfMonth.evaluate(dateValue),
    hours.evaluate(timeValue), minutes.evaluate(timeValue), seconds.evaluate(timeValue)
  )
  if (!(combined instanceof Date)) return

  const result = formatDate(combined, getCombinedDatePrecision(timeAttr))
  return result ? { dateValue, timeValue, result } : undefined
}

export function uniqueAttributeName(data: IDataSet, baseName: string) {
  return uniqueName(baseName, (aName: string) => !data.attributes.find(attr => attr?.name === aName))
}

export function defaultCombinedAttributeName(data: IDataSet, roles: IDateTimeRoles) {
  return uniqueAttributeName(data, `${roles.dateAttr.name}_${roles.timeAttr.name}`)
}

/**
 * Adds a formula attribute that combines the date from one attribute with the time from another.
 * It's placed after whichever source attribute comes last, in the collection chosen by
 * `getCombinedAttributeCollection`. Call within `applyModelChange`.
 */
export function addCombinedDateTimeAttribute(data: IDataSet, roles: IDateTimeRoles, name: string) {
  const { dateAttr, timeAttr } = roles
  const collection = getCombinedAttributeCollection(data, dateAttr, timeAttr)
  if (!collection) return

  const attrIds = collection.attributes.map(attr => attr?.id)
  const lastSourceIndex = Math.max(attrIds.indexOf(dateAttr.id), attrIds.indexOf(timeAttr.id))
  const before = lastSourceIndex >= 0 ? attrIds[lastSourceIndex + 1] : undefined

  return data.addAttribute({
    name: uniqueAttributeName(data, name.trim() || `${dateAttr.name}_${timeAttr.name}`),
    formula: { display: combineDateTimeFormula(dateAttr.name, timeAttr.name) },
    precision: getCombinedDatePrecision(timeAttr)
  }, { collection: collection.id, before })
}
