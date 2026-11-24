// PROTOTYPE (CODAP-1513): the units a date range's width can be set in, from the Config palette. Same rules as
// mapping-time-sliders' getSliderWidthUnitChoices: the three consecutive units starting with the largest the
// span holds at least one of (a span under an hour offers hours, minutes and seconds, so there are always three).
// A year is 365 days and a month 30, as in CODAP's unitsStringToMilliseconds.

export const kWidthUnits = ["year", "month", "week", "day", "hour", "minute", "second"] as const
export type WidthUnit = typeof kWidthUnits[number]

const kDay = 24 * 60 * 60
export const kWidthUnitSeconds: Record<WidthUnit, number> = {
  year: 365 * kDay,
  month: 30 * kDay,
  week: 7 * kDay,
  day: kDay,
  hour: 60 * 60,
  minute: 60,
  second: 1
}

const kWidthUnitLabels: Record<WidthUnit, [string, string]> = {
  year: ["year", "years"],
  month: ["month", "months"],
  week: ["week", "weeks"],
  day: ["day", "days"],
  hour: ["hour", "hours"],
  minute: ["minute", "minutes"],
  second: ["second", "seconds"]
}

// "1 day" but "1.5 days" and "0 days"
export function widthUnitLabel(unit: WidthUnit, count: number) {
  return kWidthUnitLabels[unit][count === 1 ? 0 : 1]
}

// every label a unit can show, so a menu can be as wide as its longest
export function allWidthUnitLabels(units: readonly WidthUnit[]) {
  return units.flatMap(unit => kWidthUnitLabels[unit])
}

export function getWidthUnitChoices(spanSeconds: number): WidthUnit[] {
  const lastStart = kWidthUnits.length - 3
  const index = kWidthUnits.findIndex(unit => spanSeconds >= kWidthUnitSeconds[unit])
  const start = index < 0 ? lastStart : Math.min(index, lastStart)
  return kWidthUnits.slice(start, start + 3)
}
