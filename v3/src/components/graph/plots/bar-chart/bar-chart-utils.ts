import { AttributeType } from "../../../../models/data/attribute-types"
import { numericSortComparator } from "../../../../utilities/data-utils"
import { convertToDate } from "../../../../utilities/date-utils"

// Returns a new array of legend category strings sorted for display. The input is left untouched:
// callers pass the CategorySet's shared observable `values` array, which must not be sorted in place.
// Numeric and date legends are sorted descending; NaN values (categories without a numeric/date
// value) are handled by numericSortComparator. Other legend types keep their original order.
export function sortLegendCategories(legendCats: readonly string[], legendType?: AttributeType): string[] {
  const sortedLegendCats = Array.from(legendCats)
  if (legendType === "numeric") {
    sortedLegendCats.sort((cat1, cat2) => {
      return numericSortComparator({ a: Number(cat1), b: Number(cat2), order: "desc" })
    })
  } else if (legendType === "date") {
    // Precompute one epoch key per category so convertToDate isn't re-parsed on every comparison.
    const dateKeys = new Map(legendCats.map(cat => [cat, convertToDate(cat)?.valueOf() ?? NaN]))
    sortedLegendCats.sort((cat1, cat2) => {
      return numericSortComparator({
        a: dateKeys.get(cat1) ?? NaN, b: dateKeys.get(cat2) ?? NaN, order: "desc"
      })
    })
  }
  return sortedLegendCats
}
