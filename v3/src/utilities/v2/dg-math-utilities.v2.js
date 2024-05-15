import { DG } from "../../v2/dg-compat.v2"
import "./dg-formatter.v2"

DG.MathUtilities = {
  formatNumber(iValue, iPrecision) {
    var tNumFormat = DG.Format.number().fractionDigits(0, iPrecision)
    tNumFormat.group('') // Don't separate with commas
    return tNumFormat(iValue)
  }
}
