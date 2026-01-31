import { ForwardedRef, forwardRef, useEffect, useState } from "react"
import { autorun } from "mobx"
import { useDataDisplayLayout } from "../../data-display/hooks/use-data-display-layout"
import { GraphPlace } from "../../axis-graph-shared"

interface IProps {
  place: GraphPlace
  refreshLabel: () => void
  onClickHandler: () => void
}

export const ClickableAxisLabel = forwardRef((props: IProps, labelRef: ForwardedRef<SVGGElement>) => {
  const { place, refreshLabel, onClickHandler } = props
  const layout = useDataDisplayLayout()
  const [ , setLayoutBounds] = useState("")

  useEffect(() => {
    return autorun(() => {
      // accessing layout triggers autorun on change
      const bounds = layout.getComputedBounds(place)
      const layoutBounds = JSON.stringify(bounds)
      // trigger re-render on layout position change
      setLayoutBounds(layoutBounds)
      // render label and trigger autorun on change to observables within
      refreshLabel()
    }, { name: "ClickableAxisLabel.autorun [refreshLabel]" })
  }, [layout, place, refreshLabel])

  return (
    <>
      <g ref={labelRef}
      className='clickable-axis-label' data-testid='clickable-axis-label'
      onClick={onClickHandler}
      />
    </>
  )
})
ClickableAxisLabel.displayName = "ClickableAxisLabel"
