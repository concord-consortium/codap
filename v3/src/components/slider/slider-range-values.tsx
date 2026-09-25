import { observer } from "mobx-react-lite"
import { t } from "../../utilities/translation/translate"
import { MultiScale } from "../axis/models/multi-scale"
import { ISliderModel } from "./slider-model"

interface IProps {
  sliderModel: ISliderModel
  multiScale?: MultiScale
}

// A range slider's value row, e.g. "visible value(s) = 4.8 - 6.1", in place of the variable's name and value
export const SliderRangeValues = observer(function SliderRangeValues({ sliderModel, multiScale }: IProps) {
  const isDate = sliderModel.scaleType === "date"
  const format = (value: number) => multiScale?.formatValueForScale(value, isDate) ?? String(value)
  const low = format(sliderModel.rangeLow)
  const high = format(sliderModel.rangeHigh)
  // a collapsed range shows its one value; a narrow range whose ends format alike still shows both
  const labelKey = sliderModel.sliderType === "selection" ? "V3.Slider.selectedValues" : "V3.Slider.visibleValues"
  return (
    <span className="slider-range-values" data-testid="slider-range-values">
      <span className="range-label">{t(labelKey)}</span>
      <span className="equals-sign">&nbsp;=&nbsp;</span>
      <span className="range-text">{sliderModel.width === 0 ? low : `${low} - ${high}`}</span>
    </span>
  )
})
