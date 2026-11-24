// PROTOTYPE scaffolding: the options box at the bottom right of the workspace -- two columns of radio buttons that
// switch the new slider's design live (see prototype-options.ts). Not part of the design being prototyped.
import { observer } from "mobx-react-lite"
import { createRoot } from "react-dom/client"
import {
  kBandHeights, kDecorationOpacityPasses, kDecorationOpacityStops, kSplitDecorations, kThumbDecorations,
  prototypeOptions
} from "./prototype-options"

import "./prototype-options-panel.scss"

const kThumbLabels: Record<string, string> = { none: "None", lines: "Grip Lines" }
const kBandLabels: Record<string, string> = {
  full: "Full Height", "top-inset": "Top Inset", body: "Height of Thumb Body",
  "top-bottom-inset": "Top and Bottom Body Inset"
}
const kSplitLabels: Record<string, string> = {
  none: "None", lines: "Vertical Lines", "full-lines": "Vertical Lines (Full Height)", diagonal: "Diagonal Lines",
  dots: "Row of Dots", "dot-pattern": "Dot Pattern", gradient: "Gradient"
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
      <RadioGroup legend="Split Thumb Range Band" name="prototype-band-height" choices={kBandHeights}
                  value={prototypeOptions.bandHeight} labels={kBandLabels}
                  onChange={v => prototypeOptions.setBandHeight(v)} />
      <div className="prototype-options-column">
        <RadioGroup legend="Split Thumb Decoration" name="prototype-split-decoration" choices={kSplitDecorations}
                    value={prototypeOptions.splitDecoration} labels={kSplitLabels}
                    onChange={v => prototypeOptions.setSplitDecoration(v)} />
        {/* the decoration's opacity: four stops, 100% at the left (prototype-options.ts); the slider moves by
            stop index, and each stop's label sits under its thumb position, with a check under the ones that keep
            3:1 */}
        <div className="prototype-option-slider">
          <label htmlFor="prototype-decoration-opacity">Decoration Opacity</label>
          <input type="range" id="prototype-decoration-opacity" min={0} max={kDecorationOpacityStops.length - 1}
                 step={1} data-testid="prototype-decoration-opacity"
                 value={kDecorationOpacityStops.indexOf(
                   prototypeOptions.decorationOpacity as typeof kDecorationOpacityStops[number])}
                 aria-valuetext={`${prototypeOptions.decorationOpacity}%${
                   kDecorationOpacityPasses(prototypeOptions.decorationOpacity) ? ", passes 3 to 1 contrast" : ""}`}
                 onChange={e => prototypeOptions.setDecorationOpacity(kDecorationOpacityStops[Number(e.target.value)])}
          />
          <div className="prototype-slider-stops" aria-hidden="true">
            {kDecorationOpacityStops.map((stop, i) => (
              <span key={stop} className="prototype-slider-stop"
                    style={{ left: `calc(8px + (100% - 16px) * ${i} / ${kDecorationOpacityStops.length - 1})` }}>
                {stop}%
                {kDecorationOpacityPasses(stop) && <span className="prototype-slider-check">✓</span>}
              </span>
            ))}
          </div>
          {/* "WCAG-compliant" would overstate it: the decoration carries no information, so WCAG asks nothing of it */}
          <p className="prototype-slider-note">
            <span className="prototype-slider-check" aria-hidden="true">✓</span> 3:1 contrast
          </p>
        </div>
      </div>
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
