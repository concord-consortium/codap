import {observer} from "mobx-react-lite"
import {useCallback} from "react"
import { createPortal } from "react-dom"
import { useInstanceIdContext } from "../../../../hooks/use-instance-id-context"
import { circleAnchor } from "../../../data-display/renderer"
import {IPlotProps} from "../../graphing-types"
import { useBinBoundaryDrag } from "../../hooks/use-bin-boundary-drag"
import { useBinnedPlotResponders } from "../../hooks/use-binned-plot-responders"
import { useDotPlot } from "../../hooks/use-dot-plot"
import { useDotPlotDragDrop } from "../../hooks/use-dot-plot-drag-drop"
import {useRendererDragHandlers, usePlotResponders} from "../../hooks/use-plot"
import { setPointCoordinates } from "../../utilities/graph-utils"
import { isBinnedDotPlotModel } from "./binned-dot-plot-model"

export const BinnedDotPlot = observer(function BinnedDotPlot({renderer, abovePointsGroupRef}: IPlotProps) {
  const { dataset, dataConfig, getPrimaryScreenCoord, getSecondaryScreenCoord, graphModel, isAnimating, layout,
          pointColor, pointDisplayType, pointStrokeColor, primaryAxisScale, primaryIsBottom, primaryPlace,
          refreshPointSelection } = useDotPlot(renderer)
  const binnedPlot = isBinnedDotPlotModel(graphModel.plot) ? graphModel.plot : undefined
  const instanceId = useInstanceIdContext()
  const primaryAxisModel = graphModel.getNumericAxis(primaryPlace)

  const { onDrag, onDragEnd, onDragStart } = useDotPlotDragDrop()
  useRendererDragHandlers(renderer, {start: onDragStart, drag: onDrag, end: onDragEnd})

  const { binBoundariesRef, drawBinBoundaries, addBinBoundaryDragHandlers } = useBinBoundaryDrag({
    binnedPlot, dataConfig, graphModel, layout, primaryAxisScale, primaryIsBottom, primaryPlace
  })

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
    if (!dataConfig || !binnedPlot) return

    // Draw lines to delineate the bins in the plot
    drawBinBoundaries()
    if (!binnedPlot.isDraggingBinBoundary) {
      addBinBoundaryDragHandlers()
    }

    const getScreenX = primaryIsBottom ? getPrimaryScreenCoord : getSecondaryScreenCoord
    const getScreenY = primaryIsBottom ? getSecondaryScreenCoord : getPrimaryScreenCoord

    const getLegendColor = dataConfig?.attributeID("legend")
      ? dataConfig?.getLegendColorForCase : undefined

    setPointCoordinates({
      pointRadius: graphModel.getPointRadius(),
      selectedPointRadius: graphModel.getPointRadius("select"),
      renderer, selectedOnly, pointColor, pointStrokeColor,
      getScreenX, getScreenY, getLegendColor, getAnimationEnabled: isAnimating,
      pointDisplayType, anchor: circleAnchor, dataset
    })
  }, [addBinBoundaryDragHandlers, binnedPlot, dataConfig, dataset, drawBinBoundaries,
      getPrimaryScreenCoord, getSecondaryScreenCoord, graphModel, isAnimating,
      renderer, pointColor, pointDisplayType, pointStrokeColor, primaryIsBottom])

  usePlotResponders({renderer, refreshPointPositions, refreshPointSelection})
  useBinnedPlotResponders(refreshPointPositions)

  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  primaryAxisModel?.labelsAreRotated  // Observe labelsAreRotated to force re-render
  return (
    abovePointsGroupRef?.current && createPortal(
      <><g data-testid={`bin-ticks-${instanceId}`} className="bin-ticks" ref={binBoundariesRef}/></>,
      abovePointsGroupRef.current
    )
  )
})
