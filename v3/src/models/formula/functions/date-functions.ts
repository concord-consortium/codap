
import { FValue } from "../formula-types"
import { UNDEF_RESULT } from "./function-utils"
import { formatDate } from "../../../utilities/date-utils"

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

      let yearOrSeconds = args[0] != null ? Number(args[0]) : null

      if (args.length === 1 && yearOrSeconds != null && defaultToEpochSecs(yearOrSeconds)) {
        // convert from seconds to milliseconds
        return formatDateWithUndefFallback(new Date(yearOrSeconds * 1000))
      }

      const monthIndex = args[1] != null ? Math.max(0, Number(args[1]) - 1) : 0
      const day = args[2] != null ? Number(args[2]) : 1
      const hours = args[3] != null ? Number(args[3]) : 0
      const minutes = args[4] != null ? Number(args[4]) : 0
      const seconds = args[5] != null ? Number(args[5]) : 0
      const milliseconds = args[6] != null ? Number(args[6]) : 0

      const currentYear = new Date().getFullYear()
      // dividing line for two-digit years is 10 yrs from now
      const cutoffYear = (currentYear + 10) % 100

      // Logic ported from V2 for backwards compatibility
      if (yearOrSeconds == null) {
        yearOrSeconds = currentYear
      }
      else if (yearOrSeconds < cutoffYear) {
        yearOrSeconds += 2000
      }
      else if (yearOrSeconds < 100) {
        yearOrSeconds += 1900
      }

      const date = new Date(yearOrSeconds, monthIndex, day, hours, minutes, seconds, milliseconds)
      return isNaN(date.valueOf()) ? UNDEF_RESULT : formatDateWithUndefFallback(date)
    }
  }
}
