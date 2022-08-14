import {axisBottom, axisLeft, scaleLinear, scaleLog, select} from "d3"
import {autorun, reaction} from "mobx"
import React, {useCallback, useEffect} from "react"
import {INumericAxisModel} from "../models/axis-model"
import { useGraphLayoutContext } from "../models/graph-layout"
import { prf } from "../../../utilities/profiler"

export interface IUseNumericAxis {
  axisModel: INumericAxisModel
  axisRef:  React.MutableRefObject<any>
}
export const useNumericAxis = ({ axisModel, axisRef }: IUseNumericAxis) => {
  const layout = useGraphLayoutContext()
  const scale = layout.axisScale(axisModel.place)
  const axisFunc = axisModel.place === 'bottom' ? axisBottom : axisLeft

  const refreshAxis = useCallback(() => {
    prf.measure("Graph.useNumericAxis[refreshAxisCallback]", () => {
      select(axisRef.current)
        .call(axisFunc(scale))
    })
  }, [axisRef, axisFunc, scale])

  // update d3 scale and axis when scale type changes
  useEffect(()=> {
    const disposer = reaction(
      () => {
        const { place, scale: scaleType } = axisModel
        return { place, scaleType }
      },
      ({ place, scaleType }) => {
        layout.setAxisScale(place, scaleType === "log" ? scaleLog() : scaleLinear())
        refreshAxis()
      }
    )
    return () => disposer()
  }, [axisModel, layout, refreshAxis])

  // update d3 scale and axis when axis domain changes
  useEffect(() => {
    prf.measure("Graph.refreshAxisEffectDomain", () => {
      const disposer = autorun(() => {
        prf.measure("Graph.useNumericAxis[refreshAxisDomainReaction]", () => {
          const { domain } = axisModel
          scale.domain(domain)
          refreshAxis()
        })
      })
      return () => disposer()
    })
  }, [axisModel, refreshAxis, scale])

  // update d3 scale and axis when layout/range changes
  useEffect(() => {
    prf.measure("Graph.useNumericAxis[refreshAxisRange]", () => {
      const disposer = reaction(
        () => {
          const { place } = axisModel
          return layout.axisLength(place)
        },
        () => {
          prf.measure("Graph.useNumericAxis[refreshAxisRangeReaction]", () => {
            refreshAxis()
          })
        }
      )
      return () => disposer()
    })
  }, [axisModel, layout, refreshAxis, scale])
}
