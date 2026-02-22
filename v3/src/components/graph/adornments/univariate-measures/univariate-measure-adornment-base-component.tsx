import { observer } from "mobx-react-lite"
import React, { useEffect } from "react"
import { mstAutorun } from "../../../../utilities/mst-autorun"
import { IBaseNumericAxisModel } from "../../../axis/models/base-numeric-axis-model"
import { useGraphDataConfigurationContext } from "../../hooks/use-graph-data-configuration-context"
import { getAxisDomains } from "../utilities/adornment-utils"
import { IUnivariateMeasureAdornmentModel } from "./univariate-measure-adornment-model"

import "./univariate-measure-adornment-base-component.scss"

interface IProps {
  classFromKey: string
  containerId?: string
  labelRef: React.RefObject<HTMLDivElement>
  measureSlug: string
  model: IUnivariateMeasureAdornmentModel
  showLabel?: boolean
  valueRef: React.RefObject<SVGGElement>
  xAxis?: IBaseNumericAxisModel
  yAxis?: IBaseNumericAxisModel
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
        getAxisDomains(xAxis, yAxis)
        const xType = dataConfig?.attributeType("x")
        setIsVertical(xType === "numeric" || xType === "date")
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
