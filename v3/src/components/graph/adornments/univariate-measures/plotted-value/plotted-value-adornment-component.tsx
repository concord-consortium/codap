import React, { useEffect } from "react"
import { observer } from "mobx-react-lite"
import { useGraphContentModelContext } from "../../../hooks/use-graph-content-model-context"
import { isPlottedValueAdornment } from "./plotted-value-adornment-model"
import { IAdornmentComponentProps } from "../../adornment-component-info"
import { mstAutorun } from "../../../../../utilities/mst-autorun"
import { UnivariateMeasureAdornmentSimpleComponent } from "../univariate-measure-adornment-simple-component"

export const PlottedValueComponent = observer(
  function PlottedValueComponent (props: IAdornmentComponentProps) {
    const {cellKey={}, containerId, model, plotHeight, plotWidth,
      spannerRef, labelsDivRef, xAxis, yAxis} = props
    const graphModel = useGraphContentModelContext()

    // Refresh values on Plotted Value expression changes
    useEffect(function refreshExpressionChange() {
      return mstAutorun(() => {
        // The next line should not be needed, but without it this autorun doesn't get triggered.
        // TODO: Figure out exactly why this is needed and adjust accordingly.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const modelValue = isPlottedValueAdornment(model) ? model.expression : undefined
        model.updateCategories(graphModel.getUpdateCategoriesOptions())
      }, { name: "UnivariateMeasureAdornmentComponent.refreshExpressionChange" }, model)
    }, [graphModel, model])

    return (
      <UnivariateMeasureAdornmentSimpleComponent
        cellKey={cellKey}
        cellCoords={{row: 0, col: 0}} // Not used in Plotted Value
        containerId={containerId}
        model={model}
        plotHeight={plotHeight}
        plotWidth={plotWidth}
        spannerRef={spannerRef}
        labelsDivRef={labelsDivRef}
        xAxis={xAxis}
        yAxis={yAxis}
      />
    )
  }
)
