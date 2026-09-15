import { observer } from "mobx-react-lite"
import { useEffect } from "react"
import { measureText } from "../../../../hooks/use-measure-text"
import { t } from "../../../../utilities/translation/translate"
import { axisGap } from "../../../axis/axis-types"
import { kDataDisplayFont } from "../../data-display-types"
import { useDataConfigurationContext } from "../../hooks/use-data-configuration-context"
import { useDataDisplayLayout } from "../../hooks/use-data-display-layout"
import { labelHeight, padding } from "./categorical-legend-model"
import { IBaseLegendProps } from "./legend-common"

import "./legend.scss"

const kLineHeight = 16

// Greedy word wrap. SVG text does not wrap, and this message is a sentence rather than a label, so
// it is broken into lines here and drawn as one tspan each.
export function wrapTextToWidth(text: string, maxWidth: number, font = kDataDisplayFont): string[] {
  const words = text.split(/\s+/).filter(word => !!word)
  if (!words.length) return []

  const lines: string[] = []
  let line = words[0]
  for (const word of words.slice(1)) {
    const candidate = `${line} ${word}`
    if (measureText(candidate, font) <= maxWidth) {
      line = candidate
    } else {
      lines.push(line)
      line = word
    }
  }
  lines.push(line)
  return lines
}

/*
 * Stands in for the keys when the assigned legend attribute is one this display cannot honor.
 *
 * The keys are the wrong thing to draw -- there is no per-category encoding to key -- but drawing
 * nothing was worse: the legend collapsed entirely, taking the attribute's name and its remove
 * action with it, so the assignment the user made became invisible and unreachable.
 */
export const InoperableLegendMessage = observer(function InoperableLegendMessage(
  { layerIndex, setDesiredExtent }: IBaseLegendProps
) {
  const dataConfiguration = useDataConfigurationContext()
  const dataDisplayLayout = useDataDisplayLayout()
  const attrID = dataConfiguration?.assignedLegendAttributeID
  const attrName = (attrID && dataConfiguration?.dataset?.attrFromID(attrID)?.name) || ""
  // Both gaps, so a long word cannot push the text past the edge the keys stop at.
  const maxWidth = Math.max(dataDisplayLayout.tileWidth - 2 * axisGap, 1)
  const lines = wrapTextToWidth(t("V3.Legend.attributeNotOperable", { vars: [attrName] }), maxWidth)

  useEffect(() => {
    setDesiredExtent(layerIndex, labelHeight + lines.length * kLineHeight + padding + axisGap)
    return () => setDesiredExtent(layerIndex, 0)
  }, [layerIndex, lines.length, setDesiredExtent])

  return (
    <text className="legend-inoperable-message" data-testid="legend-inoperable-message"
      x={axisGap} y={labelHeight + padding}>
      {lines.map((line, i) => (
        // Keyed by position: a wrapped line has no identity apart from where it sits, and two of
        // them can hold the same text once an attribute name repeats a word or the tile narrows.
        <tspan key={i} x={axisGap} dy={i === 0 ? 0 : kLineHeight}>{line}</tspan>
      ))}
    </text>
  )
})
