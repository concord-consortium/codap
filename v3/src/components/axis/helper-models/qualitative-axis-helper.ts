import { AxisHelper } from "./axis-helper"

export class QualitativeAxisHelper extends AxisHelper {

  get newRange() {
    return this.isVertical ? [this.rangeMax, this.rangeMin] : [this.rangeMin, this.rangeMax]
  }

  render() {
    // Qualitative axes do not have special rendering needs at this time
  }
}
