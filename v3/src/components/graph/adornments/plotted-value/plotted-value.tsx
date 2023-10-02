import React, { useCallback, useEffect, useRef } from "react"
import { autorun } from "mobx"
import { select, Selection } from "d3"
import { IPlottedValueModel } from "./plotted-value-model"
import { INumericAxisModel } from "../../../axis/models/axis-model"
import { useAxisLayoutContext } from "../../../axis/models/axis-layout-context"
import { ScaleNumericBaseType } from "../../../axis/axis-types"
import { useDataConfigurationContext } from "../../hooks/use-data-configuration-context"
import { observer } from "mobx-react-lite"
import { kPlottedValueType } from "./plotted-value-types"
import { useGraphContentModelContext } from "../../hooks/use-graph-content-model-context"
import { usePrevious } from "../../hooks/use-previous"

import "./plotted-value.scss"

interface IValueObject {
  line?: Selection<SVGLineElement, unknown, null, undefined>
  cover?: Selection<SVGLineElement, unknown, null, undefined>
  valueLabel?: Selection<SVGTextElement, unknown, null, undefined>
}

interface IProps {
  cellKey: Record<string, string>
  containerId?: string
  model: IPlottedValueModel
  plotHeight: number
  plotWidth: number
  xAxis: INumericAxisModel
  yAxis: INumericAxisModel
}

export const PlottedValue = observer(function PlottedValue (props: IProps) {
  const {cellKey={}, containerId, model, plotWidth, xAxis, yAxis} = props
  const graphModel = useGraphContentModelContext()
  const value = model.value
  const layout = useAxisLayoutContext()
  const dataConfig = useDataConfigurationContext()
  const xScale = layout.getAxisScale("bottom") as ScaleNumericBaseType
  const xAttrId = dataConfig?.attributeID("x")
  const xAttrType = dataConfig?.attributeType("x")
  const yScale = layout.getAxisScale("left") as ScaleNumericBaseType
  const yAttrId = dataConfig?.attributeID("y")
  const yAttrType = dataConfig?.attributeType("y")
  const classFromKey = model.classNameFromKey(cellKey)
  const valueRef = useRef<SVGGElement>(null)
  const isVertical = useRef(!!(xAttrType && xAttrType === "numeric"))
  const previousAttrTypes = usePrevious({ xAttrType, yAttrType})
  // TODO: The offset value below shouldn't be needed once there's a method available for adding
  // space to the top of the graph to accommodate the Plotted Value's UI elements.
  const offsetTop = 20

  // Updates the coordinates of the line, its cover, and text label
  const refreshValue = useCallback(() => {
    if (!value || !dataConfig) return
    const attrId = dataConfig.attributeType("x") === "numeric"
      ? xAttrId
      : dataConfig.attributeType("y") === "numeric"
        ? yAttrId : undefined
    const caseValues = attrId ? model.getCaseValues(attrId, cellKey, dataConfig) : []
    if (caseValues.length < 1) return

    const valueIsInteger = Number.isInteger(Number(value))
    const finalValue = !valueIsInteger ? model.evalFnString(value.toString(), caseValues) : Number(value)
    const plotValue = valueIsInteger ? finalValue : Math.round(finalValue * 10) / 10
    const newValueObject: IValueObject = {}
    const selection = select(valueRef.current)
    const [left, right] = xScale?.range() || [0, 1]
    const [bottom, top] = yScale?.range() || [0, 1]
    const xSubAxesCount = layout.getAxisMultiScale("bottom")?.repetitions ?? 1
    const ySubAxesCount = layout.getAxisMultiScale("left")?.repetitions ?? 1
    const xCatSet = layout.getAxisMultiScale("bottom")?.categorySet
    const xCats = xAttrType === "categorical" && xCatSet ? Array.from(xCatSet.values) : [""]
    const yCatSet = layout.getAxisMultiScale("left")?.categorySet
    const yCats = yAttrType === "categorical" && yCatSet ? Array.from(yCatSet.values) : [""]
    const xCellCount = xCats.length * xSubAxesCount
    const yCellCount = yCats.length * ySubAxesCount
    const x1 = isVertical.current ? xScale(plotValue) / xCellCount : right / xCellCount
    const x2 = isVertical.current ? xScale(plotValue) / xCellCount : left / xCellCount
    const y1 = isVertical.current ? top / yCellCount : yScale(plotValue) / yCellCount
    const y2 = isVertical.current ? bottom / yCellCount + offsetTop : yScale(plotValue) / yCellCount

    // Remove the previous value's elements
    selection.html(null)

    newValueObject.line = selection.append("line")
      .attr("class", `plotted-value-line plotted-value${classFromKey ? `-${classFromKey}` : ""}`)
      .attr("data-testid", `plotted-value-line${classFromKey ? `-${classFromKey}` : ""}`)
      .attr("x1", x1)
      .attr("x2", x2)
      .attr("y1", y1)
      .attr("y2", y2)

    newValueObject.cover = selection.append("line")
      .attr("class", "plotted-value-cover")
      .attr("data-testid", `plotted-value-cover${classFromKey ? `-${classFromKey}` : ""}`)
      .attr("x1", x1)
      .attr("x2", x2)
      .attr("y1", y1)
      .attr("y2", y2)

    newValueObject.valueLabel = selection.append("text")
      .text(`${plotValue}`)
      .attr("class", "plotted-value-tip")
      .attr("id", `plotted-value-tip-${containerId}-${classFromKey}`)
      .attr("data-testid", `plotted-value-tip${classFromKey ? `-${classFromKey}` : ""}`)
      .attr("x", isVertical.current ? xScale(plotValue) / xCellCount + 5 : plotWidth / xCellCount - 25)
      .attr("y", isVertical.current ? offsetTop + 10 : yScale(plotValue) / yCellCount - 5)

  }, [value, dataConfig, xAttrId, yAttrId, model, cellKey, layout, xAttrType, yAttrType,
      xScale, plotWidth, yScale, classFromKey, containerId])

  // Refresh the value when it changes
  useEffect(function refreshValueChange() {
    const disposer = autorun(() => {
      refreshValue()
    }, { name: "PlottedValue.refreshValueChange" })
    return () => disposer()
  }, [refreshValue])

  // Refresh the value when the axis changes
  useEffect(function refreshAxisChange() {
    return autorun(() => {
      // We observe changes to the axis domains within the autorun by extracting them from the axes below.
      // We do this instead of including domains in the useEffect dependency array to prevent domain changes
      // from triggering a reinstall of the autorun.
      const { domain: xDomain } = xAxis // eslint-disable-line @typescript-eslint/no-unused-vars
      const { domain: yDomain } = yAxis // eslint-disable-line @typescript-eslint/no-unused-vars
      // If a Plotted Value has already been added and set, and the axis attributes are 
      // reconfigured so that both x and y are numeric whereas only one of them was
      // numeric previously, then remove the Plotted Value.
      if (
        xAttrType === "numeric" && yAttrType === "numeric" &&
        (previousAttrTypes?.xAttrType !== "numeric" || previousAttrTypes?.yAttrType !== "numeric")
      ) {
        model.setValue("")
        graphModel.adornmentsStore.hideAdornment(kPlottedValueType)
      } else {
        isVertical.current = dataConfig?.attributeType("x") === "numeric"
      }
      refreshValue()
    }, { name: "PlottedValue.refreshAxisChange" })
  }, [dataConfig, graphModel, model, previousAttrTypes?.xAttrType, previousAttrTypes?.yAttrType,
      refreshValue, xAttrType, xAxis, yAttrType, yAxis])

  return (
    <>
      <div className="plotted-value-container" id={`plotted-value-${containerId}`}>
        { value != null && model.isVisible &&
            <svg
              className={`plotted-value-${classFromKey}`}
              data-testid={`plotted-value-${classFromKey}`}
              style={{height: "100%", width: "100%"}}
              x={0}
              y={0}
            >
              <g>
                <g className="plotted-value" ref={valueRef}/>
              </g>
            </svg>
        }
      </div>
    </>
  )
})
