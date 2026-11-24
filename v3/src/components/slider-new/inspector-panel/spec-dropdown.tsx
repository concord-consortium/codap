// PROTOTYPE: the slider's dropdowns, built to the CODAP v3 UI Sketch spec (Slider Tile > Playback Direction
// Dropdown Button States / Dropdown List); styles in slider-settings-panel.scss. The button is as wide as
// its LONGEST option (every option is stacked, hidden, in the label's grid cell), so it doesn't change
// width with the choice.
import { Button, SelectValue } from "react-aria-components"

// for the <Popover>. Keeps React Aria's own class: CODAP's palettes ignore clicks inside .react-aria-Popover,
// so choosing an option doesn't close the palette.
export const kSpecDropdownListClass = "react-aria-Popover spec-dropdown-list"
// PROTOTYPE: a unit dropdown attached to its number field (spec: Slider Tile > Playback in Multiples of Dropdown
// Button States): the field takes the "has-unit" class, the dropdown's <Select> "attached-unit", and its list this
export const kAttachedUnitListClass = `${kSpecDropdownListClass} attached-unit-list`

interface IProps {
  labels: string[]
  testId: string
}

export function SpecDropdownButton({ labels, testId }: IProps) {
  return (
    <Button className="spec-dropdown" data-testid={testId}>
      <span className="spec-dropdown-label">
        <SelectValue />
        {labels.map(label => <span key={label} className="sizer" aria-hidden="true">{label}</span>)}
      </span>
      {/* the spec's 24x24 Dropdown Arrow ICON */}
      <svg className="spec-dropdown-arrow" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <polygon points="12 15 7 10 17 10" />
      </svg>
    </Button>
  )
}
