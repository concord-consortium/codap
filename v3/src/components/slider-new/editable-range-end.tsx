// PROTOTYPE: a range slider's ends in its readout ("visible value(s) = 10 – 45") are entry fields, like a variable
// slider's value: click or tab in, type, then Enter or leave to commit (Escape reverts). A typed value goes through
// setRange like any other change -- kept on the scale, put in order, a collapsed range snapped to the data, never an
// empty range (CODAP-1516) -- as one undoable change. It also gives each end a way to be set without dragging
// (CODAP-1729). Dates are typed as the readout shows them (e.g. 5/23/2005).
import { observer } from "mobx-react-lite"
import { KeyboardEvent, useEffect, useRef, useState } from "react"
import { convertToDate } from "../../utilities/date-utils"
import { withHyphen } from "./minus-sign"
import { ISliderModel } from "./slider-model"

interface IProps {
  sliderModel: ISliderModel
  index: 0 | 1
  // the end's value as the readout shows it
  format: (value: number) => string
  onInvalid?: (shown: string) => void
}

export const EditableRangeEnd = observer(function EditableRangeEnd({ sliderModel, index, format, onInvalid }: IProps) {
  const value = sliderModel.range[index]
  const shown = format(value)
  const [text, setText] = useState(shown)
  const isEditingRef = useRef(false)
  const revertingRef = useRef(false)

  // follow the slider, except while the field is being edited
  useEffect(() => {
    if (!isEditingRef.current) setText(shown)
  }, [shown])

  const parse = (entry: string) => {
    if (sliderModel.scaleType === "date") {
      const date = convertToDate(entry.trim())
      return date ? date.valueOf() / 1000 : NaN
    }
    // values are shown with a minus sign (U+2212), which parseFloat doesn't read
    return entry.trim() ? Number(withHyphen(entry.trim())) : NaN
  }

  const commit = () => {
    isEditingRef.current = false
    if (revertingRef.current) {
      revertingRef.current = false
      setText(shown)
      return
    }
    if (text === shown) return
    const entered = parse(text)
    if (!isFinite(entered)) {
      setText(shown)
      onInvalid?.(shown)
      return
    }
    const [lo, hi] = sliderModel.range
    sliderModel.applyModelChange(() => {
      if (index === 0) sliderModel.setRange(entered, hi)
      else sliderModel.setRange(lo, entered)
    }, { undoStringKey: "V3.Undo.slider.changeRange", redoStringKey: "V3.Redo.slider.changeRange" })
    // show the result (which can differ: kept on the scale, snapped, or the ends swapped)
    setText(format(sliderModel.range[index]))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.currentTarget.blur()
    if (e.key === "Escape") {
      revertingRef.current = true
      e.currentTarget.blur()
    }
  }

  // names contain the readout's visible label, "visible value(s)" / "selected value(s)" (WCAG 2.5.3, ship-check
  // #12); the attribute is named by the attribute button beside the fields and by the slider group
  const kind = sliderModel.sliderType === "selection" ? "selected" : "visible"
  return (
    <input
      aria-label={`${index === 0 ? "Lower" : "Upper"} ${kind} value`}
      className="value-text-input value-input range-end-input"
      data-testid={`slider-range-${index === 0 ? "lower" : "upper"}-input`}
      maxLength={30}
      type="text"
      value={text}
      onBlur={commit}
      onChange={e => setText(e.target.value)}
      // selecting the field highlights its value, per the spec
      onFocus={e => { isEditingRef.current = true; e.target.select() }}
      onKeyDown={handleKeyDown}
    />
  )
})
