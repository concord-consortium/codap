import { ForwardedRef, forwardRef, useEffect, useState } from "react"
import { autorun } from "mobx"
import { useDataDisplayLayout } from "../../data-display/hooks/use-data-display-layout"
import { GraphPlace } from "../../axis-graph-shared"

interface IProps {
  place: GraphPlace
  refreshLabel: () => void
}

// Non-interactive axis label. Used for axis places that don't correspond to a user-assignable
// attribute (e.g. the Residual Plot's "leftLower" axis). Mirrors ClickableAxisLabel's autorun
// pattern for re-rendering on layout / observable changes, but omits click and drop handling.
export const StaticAxisLabel = forwardRef((props: IProps, labelRef: ForwardedRef<SVGGElement>) => {
  const { place, refreshLabel } = props
  const layout = useDataDisplayLayout()
  const [, setLayoutBounds] = useState("")

  useEffect(() => {
    return autorun(() => {
      const bounds = layout.getComputedBounds(place)
      setLayoutBounds(JSON.stringify(bounds))
      refreshLabel()
    }, { name: "StaticAxisLabel.autorun [refreshLabel]" })
  }, [layout, place, refreshLabel])

  return <g ref={labelRef} className='static-axis-label' data-testid='static-axis-label' />
})
StaticAxisLabel.displayName = "StaticAxisLabel"
