import {axisBottom, axisLeft, scaleLinear, scaleLog, scaleOrdinal, select} from "d3"
import {autorun, reaction} from "mobx"
import {useCallback, useEffect} from "react"
import {IAxisModel, INumericAxisModel} from "../models/axis-model"
import {useGraphLayoutContext} from "../models/graph-layout"

export interface IUseAxis {
  axisModel: IAxisModel
  axisElt: SVGGElement | null
}

export const useAxis = ({axisModel, axisElt}: IUseAxis) => {
  const layout = useGraphLayoutContext(),
    scale = layout.axisScale(axisModel.place),
    axisFunc = axisModel.place === 'bottom' ? axisBottom : axisLeft,
    isNumeric = axisModel.isNumeric

  const refreshAxis = useCallback((duration = 0) => {
    if (axisElt && scale) {
      select(axisElt)
        .transition().duration(duration)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        .call(axisFunc(scale))
    }
  }, [axisElt, axisFunc, scale])

  // update d3 scale and axis when scale type changes
  useEffect(() => {
    const disposer = reaction(
      () => {
        const {place, scale: scaleType} = axisModel
        return {place, scaleType}
      },
      ({place, scaleType}) => {
        const newScale =
          scaleType === 'log' ? scaleLog() :
            scaleType === 'linear' ? scaleLinear() :
              scaleOrdinal()
        layout.setAxisScale(place, newScale)
        refreshAxis()
      }
    )
    return () => disposer()
  }, [isNumeric, axisModel, layout, refreshAxis])

  // update d3 scale and axis when axis domain changes
  useEffect(() => {
    if (isNumeric) {
      const disposer = autorun(() => {
        const numericModel = axisModel as INumericAxisModel
        if (numericModel.domain) {
          const {domain} = numericModel
          scale?.domain(domain)
          refreshAxis()
        }
      })
      return () => disposer()
    }
  }, [isNumeric, axisModel, refreshAxis, scale])

  // update d3 scale and axis when layout/range changes
  useEffect(() => {
    const disposer = reaction(
      () => {
        const {place} = axisModel
        return layout.axisLength(place)
      },
      () => {
        refreshAxis()
      }
    )
    return () => disposer()
  }, [axisModel, layout, refreshAxis])
}
