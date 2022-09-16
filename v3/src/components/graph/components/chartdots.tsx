import {ScaleBand, select} from "d3"
import React, {memo, useCallback} from "react"
import {defaultRadius, transitionDuration} from "../graphing-types"
import {usePlotResponders} from "../hooks/graph-hooks"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {ScaleType, useGraphLayoutContext} from "../models/graph-layout"
import {setPointSelection} from "../utilities/graph_utils"

export const ChartDots = memo(function ChartDots(props: {
  xAttrID: string,
  dotsRef: React.RefObject<SVGSVGElement>
  enableAnimation: React.MutableRefObject<boolean>
}) {
  useInstanceIdContext()
  const {dotsRef, enableAnimation, xAttrID} = props,
    dataset = useDataSetContext(),
    layout = useGraphLayoutContext(),
    xScale = layout.axisScale('bottom') as ScaleType,
    yScale = layout.axisScale('left') as ScaleType

  const refreshPointSelection = useCallback(() => {
    setPointSelection({dotsRef, dataset})
  }, [dataset, dotsRef])

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
    const
      selection = select(dotsRef.current).selectAll(selectedOnly ? '.graph-dot-highlighted' : '.graph-dot'),
      duration = enableAnimation.current ? transitionDuration : 0,
      onComplete = enableAnimation.current ? () => {
        enableAnimation.current = false
      } : undefined,
      halfBandWidth = (xScale as ScaleBand<string>).bandwidth() / 2
    selection
      .transition()
      .duration(duration)
      .on('end', (id, i) => (i === selection.size() - 1) && onComplete?.())
      .attr('cx', (anID: string, index) => {
        const value = dataset?.getValue(anID, xAttrID)
        return xScale(value) + halfBandWidth
      })
      .attr('cy', (anID: string, index) => {
        return yScale.range()[0] - index * defaultRadius
      })
  }, [dotsRef, enableAnimation, xScale, yScale, dataset, xAttrID])

  usePlotResponders({
    dataset, layout, refreshPointPositions, refreshPointSelection, enableAnimation
  })

  return (
    <></>
  )
})
// (ScatterDots as any).whyDidYouRender = true
