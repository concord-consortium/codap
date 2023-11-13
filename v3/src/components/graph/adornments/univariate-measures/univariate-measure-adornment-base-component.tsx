import React, { useEffect } from "react"
import { observer } from "mobx-react-lite"
import { IUnivariateMeasureAdornmentModel } from "./univariate-measure-adornment-model"
import { mstAutorun } from "../../../../utilities/mst-autorun"
import { useGraphDataConfigurationContext } from "../../hooks/use-graph-data-configuration-context"
import { INumericAxisModel } from "../../../axis/models/axis-model"

import "./univariate-measure-adornment-base-component.scss"

interface IProps {
  classFromKey: string
  containerId?: string
  labelRef: React.RefObject<HTMLDivElement>
  measureSlug: string
  model: IUnivariateMeasureAdornmentModel
  showLabel?: boolean
  valueRef: React.RefObject<SVGGElement>
  xAxis: INumericAxisModel
  yAxis: INumericAxisModel
  refreshValues: () => void
  setIsVertical: (isVertical: boolean) => void
}

export const UnivariateMeasureAdornmentBaseComponent = observer(
  function UnivariateMeasureAdornmentBaseComponent (props: IProps) {
    const { classFromKey, containerId, labelRef, measureSlug, model, showLabel, valueRef,
      xAxis, yAxis, refreshValues, setIsVertical } = props
    const dataConfig = useGraphDataConfigurationContext()

    // Refresh values on axis changes
    useEffect(function refreshAxisChange() {
      return mstAutorun(() => {
        // We observe changes to the axis domains within the autorun by extracting them from the axes below.
        // We do this instead of including domains in the useEffect dependency array to prevent domain changes
        // from triggering a reinstall of the autorun.
        const { domain: xDomain } = xAxis // eslint-disable-line @typescript-eslint/no-unused-vars
        const { domain: yDomain } = yAxis // eslint-disable-line @typescript-eslint/no-unused-vars
        setIsVertical(dataConfig?.attributeType("x") === "numeric")
        refreshValues()
      }, { name: "UnivariateMeasureAdornmentComponent.refreshAxisChange" }, model)
    }, [dataConfig, model, refreshValues, setIsVertical, xAxis, yAxis])

    return (
      <div className="measure-container" id={`${measureSlug}-${containerId}`}>
        <svg
          className={`${measureSlug}-${classFromKey}`}
          data-testid={`${measureSlug}-${classFromKey}`}
          style={{height: "100%", width: "100%"}}
          x={0}
          y={0}
        >
        <g>
          <g className={measureSlug} ref={valueRef}/>
        </g>
        </svg>
        {
          showLabel &&
            <div className="measure-labels" id={`measure-labels-${containerId}`} ref={labelRef} />
        }
      </div>
    )
  }
)
