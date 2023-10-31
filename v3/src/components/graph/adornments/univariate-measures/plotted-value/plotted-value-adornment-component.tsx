import React, { useEffect } from "react"
import { observer } from "mobx-react-lite"
import { INumericAxisModel } from "../../../../axis/models/axis-model"
import { useGraphContentModelContext } from "../../../hooks/use-graph-content-model-context"
import { IPlottedValueAdornmentModel, isPlottedValueAdornment } from "./plotted-value-adornment-model"
import { mstAutorun } from "../../../../../utilities/mst-autorun"
import { UnivariateMeasureAdornmentSimpleComponent } from "../univariate-measure-adornment-simple-component"

interface IProps {
  cellKey: Record<string, string>
  containerId?: string
  model: IPlottedValueAdornmentModel
  plotHeight: number
  plotWidth: number
  xAxis: INumericAxisModel
  yAxis: INumericAxisModel
}

export const PlottedValueComponent = observer(
  function PlottedValueComponent (props: IProps) {
    const {cellKey={}, containerId, model, plotHeight, plotWidth, xAxis, yAxis} = props
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
        containerId={containerId}
        model={model}
        plotHeight={plotHeight}
        plotWidth={plotWidth}
        xAxis={xAxis}
        yAxis={yAxis}
      />
    )
  }
)
