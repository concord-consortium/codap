import { FValue } from "../formula-types"
import { UNDEF_RESULT } from "./function-utils"
import { formatDate } from "../../../utilities/date-utils"
import { fixYear } from "../../../utilities/date-parser"

/**
 Returns true if the specified value should be treated as epoch
 seconds when provided as the only argument to the date() function,
 false if the value should be treated as a year.
 date(2000) should be treated as a year, but date(12345) should not.
 */
export function defaultToEpochSecs(iValue: number) {
  return Math.abs(iValue) >= 5000
}

function formatDateWithUndefFallback(date: Date) {
  return formatDate(date) || UNDEF_RESULT
}

export const dateFunctions = {
  date: {
    numOfRequiredArguments: 1,
    evaluate: (...args: FValue[]) => {
      if (args.length === 0) {
        return formatDateWithUndefFallback(new Date())
      }

      const yearOrSeconds = args[0] != null ? Number(args[0]) : null

      if (args.length === 1 && yearOrSeconds != null && defaultToEpochSecs(yearOrSeconds)) {
        // Only one argument and it's a number that should be treated as epoch seconds.
        // Convert from seconds to milliseconds.
        return formatDateWithUndefFallback(new Date(yearOrSeconds * 1000))
      }

      let year = yearOrSeconds // at this point, yearOrSeconds is always interpreted as a year
      const monthIndex = args[1] != null ? Math.max(0, Number(args[1]) - 1) : 0
      const day = args[2] != null ? Number(args[2]) : 1
      const hours = args[3] != null ? Number(args[3]) : 0
      const minutes = args[4] != null ? Number(args[4]) : 0
      const seconds = args[5] != null ? Number(args[5]) : 0
      const milliseconds = args[6] != null ? Number(args[6]) : 0

      // Logic ported from V2 for backwards compatibility
      if (year == null) {
        year = new Date().getFullYear() // default to current year
      }
      // Apply the same interpretation of the year value  as the date parser
      // (e.g. numbers below 100 are treated as 20xx or 19xx).
      year = fixYear(year)

      const date = new Date(year, monthIndex, day, hours, minutes, seconds, milliseconds)
      return isNaN(date.valueOf()) ? UNDEF_RESULT : formatDateWithUndefFallback(date)
    }
  }
}
