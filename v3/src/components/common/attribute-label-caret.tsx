import { clsx } from "clsx"

// The caret that marks an attribute label as opening a menu, shared by a graph's axis and legend labels (drawn in
// SVG by axis-utils) and the slider's attribute button. attribute-label-states.scss holds the values and mixins for
// its states, which attribute-label.scss and slider.scss apply.
export const kAttributeLabelCaretPath = "m12 15-5-5h10z"

export function AttributeLabelCaret({ className }: { className?: string }) {
  return (
    <svg className={clsx("attribute-label-arrow", className)} viewBox="0 0 24 24" aria-hidden="true"
         data-testid="attribute-label-caret">
      <path d={kAttributeLabelCaretPath}/>
    </svg>
  )
}
