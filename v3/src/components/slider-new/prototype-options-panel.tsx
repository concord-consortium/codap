// PROTOTYPE scaffolding: the options box at the bottom right of the workspace -- two columns of radio buttons that
// switch the new slider's design live (see prototype-options.ts). Not part of the design being prototyped.
import { observer } from "mobx-react-lite"
import { createRoot } from "react-dom/client"
import { kSplitDecorations, kThumbDecorations, prototypeOptions } from "./prototype-options"

import "./prototype-options-panel.scss"

const kThumbLabels: Record<string, string> = { none: "None", lines: "Grip Lines" }
const kSplitLabels: Record<string, string> = {
  none: "None", lines: "Vertical Lines", "full-lines": "Vertical Lines (Full Height)", diagonal: "Diagonal Lines",
  dots: "Dots", gradient: "Gradient"
}

interface IGroupProps<T extends string> {
  legend: string
  name: string
  choices: readonly T[]
  value: T
  labels: Record<string, string>
  onChange: (value: T) => void
}

function RadioGroup<T extends string>({ legend, name, choices, value, labels, onChange }: IGroupProps<T>) {
  return (
    <fieldset className="prototype-options-group">
      <legend>{legend}</legend>
      {choices.map(choice => (
        <label key={choice} className="prototype-option">
          <input type="radio" name={name} value={choice} checked={value === choice}
                 onChange={() => onChange(choice)} data-testid={`${name}-${choice}`} />
          {labels[choice]}
        </label>
      ))}
    </fieldset>
  )
}

export const PrototypeOptionsPanel = observer(function PrototypeOptionsPanel() {
  return (
    <section className="prototype-options" aria-label="Prototype options" data-testid="prototype-options">
      <RadioGroup legend="Thumb Decoration Style" name="prototype-thumb-decoration" choices={kThumbDecorations}
                  value={prototypeOptions.thumbDecoration} labels={kThumbLabels}
                  onChange={v => prototypeOptions.setThumbDecoration(v)} />
      <RadioGroup legend="Split Thumb Decoration" name="prototype-split-decoration" choices={kSplitDecorations}
                  value={prototypeOptions.splitDecoration} labels={kSplitLabels}
                  onChange={v => prototypeOptions.setSplitDecoration(v)} />
    </section>
  )
})

let mounted = false
// called once by the prototype's startup (prototype/slider-prototype.ts)
export function mountPrototypeOptions() {
  if (mounted) return
  mounted = true
  const host = document.createElement("div")
  host.className = "prototype-options-host"
  document.body.appendChild(host)
  createRoot(host).render(<PrototypeOptionsPanel />)
}
