import { isTimeOfDayString } from "../../utilities/date-parser"
import { formatDate } from "../../utilities/date-utils"
import { uniqueName } from "../../utilities/js-utils"
import { dateFunctions } from "../formula/functions/date-functions"
import { asFormulaIdentifier } from "../formula/utils/name-mapping-utils"
import { IAttribute } from "./attribute"
import { IDataSet } from "./data-set"

/**
 * True if the attribute has at least one value and every non-empty value is a time of day with no date,
 * e.g. "13:45" or "1:45 PM".
 */
export function isTimeOnlyAttribute(attr: IAttribute) {
  let count = 0
  const isEveryValueTimeOrEmpty = attr.strValues.every(value => {
    if (value == null || value === "") return true
    ++count
    return isTimeOfDayString(value)
  })
  return isEveryValueTimeOrEmpty && count > 0
}

/** True if the attribute holds dates (with or without times) or times of day. */
export function isDateOrTimeAttribute(attr: IAttribute) {
  return attr.type === "date" || isTimeOnlyAttribute(attr)
}

/**
 * Returns the attributes that can be combined with the specified attribute: the other date/time attributes
 * in the data set, excluding pairs in which both attributes are times of day (there would be no date).
 * Returns an empty array if the specified attribute isn't itself a date/time attribute.
 */
export function getCombineDateTimePartners(data: IDataSet, attrId: string): IAttribute[] {
  const attr = data.getAttribute(attrId)
  if (!attr || !isDateOrTimeAttribute(attr)) return []
  const isAttrTimeOnly = isTimeOnlyAttribute(attr)
  return data.attributes.filter(other => {
    if (!other || other.id === attrId || !isDateOrTimeAttribute(other)) return false
    return !(isAttrTimeOnly && isTimeOnlyAttribute(other))
  })
}

export interface IDateTimeRoles {
  dateAttr: IAttribute
  timeAttr: IAttribute
}

/**
 * Decides which attribute supplies the date and which supplies the time. A time-only attribute always
 * supplies the time. If both attributes contain dates, the first one supplies the date.
 */
export function getDateTimeRoles(first: IAttribute, second: IAttribute): IDateTimeRoles {
  return isTimeOnlyAttribute(first)
    ? { dateAttr: second, timeAttr: first }
    : { dateAttr: first, timeAttr: second }
}

export function combineDateTimeFormula(dateName: string, timeName: string) {
  const d = asFormulaIdentifier(dateName)
  const tm = asFormulaIdentifier(timeName)
  return `date(year(${d}), month(${d}), dayOfMonth(${d}), hours(${tm}), minutes(${tm}), seconds(${tm}))`
}

export interface ICombineDateTimePreview {
  dateValue: string
  timeValue: string
  result: string
}

/**
 * Returns an example of the combination, using the first case that has both a date and a time value.
 * It evaluates the same functions as the generated formula, so it matches what the new attribute will show.
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

  const result = formatDate(combined, combined.getSeconds() ? "second" : "minute")
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
 * It's placed after whichever source attribute comes last, in the more deeply nested of the two
 * source collections, so the formula can reference both sources. Call within `applyModelChange`.
 */
export function addCombinedDateTimeAttribute(data: IDataSet, roles: IDateTimeRoles, name: string) {
  const { dateAttr, timeAttr } = roles
  const dateCollectionIndex = data.getCollectionIndexForAttribute(dateAttr.id) ?? 0
  const timeCollectionIndex = data.getCollectionIndexForAttribute(timeAttr.id) ?? 0
  const collection = data.collections[Math.max(dateCollectionIndex, timeCollectionIndex)]
  if (!collection) return

  const attrIds = collection.attributes.map(attr => attr?.id)
  const lastSourceIndex = Math.max(attrIds.indexOf(dateAttr.id), attrIds.indexOf(timeAttr.id))
  const before = lastSourceIndex >= 0 ? attrIds[lastSourceIndex + 1] : undefined

  return data.addAttribute({
    name: uniqueAttributeName(data, name.trim() || `${dateAttr.name}_${timeAttr.name}`),
    formula: { display: combineDateTimeFormula(dateAttr.name, timeAttr.name) }
  }, { collection: collection.id, before })
}
