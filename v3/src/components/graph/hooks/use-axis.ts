import {axisBottom, axisLeft, scaleLinear, scaleLog, scaleOrdinal, select} from "d3"
import {autorun, reaction} from "mobx"
import {MutableRefObject, useCallback, useEffect, useRef} from "react"
import {otherPlace, IAxisModel, INumericAxisModel} from "../models/axis-model"
import {ScaleNumericBaseType, useGraphLayoutContext} from "../models/graph-layout"
import {between} from "../utilities/math-utils"
import {transitionDuration} from "../graphing-types"

export interface IUseAxis {
  axisModel?: IAxisModel
  axisElt: SVGGElement | null
  enableAnimation: MutableRefObject<boolean>
  showGridLines: boolean,
  scale: any
}

export const useAxis = ({axisModel, axisElt, showGridLines, enableAnimation, scale}: IUseAxis) => {
  const layout = useGraphLayoutContext(),
    place = axisModel?.place ?? 'bottom',
    //scale = layout.axisScale(place),
    axisFunc = place === 'bottom' ? axisBottom : axisLeft,
    isNumeric = axisModel?.isNumeric,
    // By all rights, the following three lines should not be necessary to get installDomainSync to run when
    // GraphController:processV2Document installs a new axis model.
    // Todo: Revisit and figure out whether we can remove the workaround.
    previousAxisModel = useRef<IAxisModel>(),
    axisModelChanged = previousAxisModel.current !== axisModel
  previousAxisModel.current = axisModel

  const refreshAxis = useCallback(() => {
    const duration = enableAnimation.current ? transitionDuration : 0
    if (axisElt) {
      // When switching from one axis type to another, e.g. a categorical axis to an
      // empty axis, d3 will use existing ticks (in DOM) to initialize the new scale.
      // To avoid that, we manually remove the ticks before initializing the axis.
      select(axisElt).selectAll('.tick').remove()

      select(axisElt)
        .transition().duration(duration)
        // @ts-expect-error scale type
        .call(axisFunc(scale)
          .tickSizeOuter(0))
      select(axisElt).selectAll('.zero').remove()
      select(axisElt).selectAll('.grid').remove()

      if (showGridLines) {
        const tickLength = layout.axisLength(otherPlace(place)) ?? 0,
          numericScale = scale as ScaleNumericBaseType
        select(axisElt).append('g')
          .attr('class', 'grid')
          // @ts-expect-error scale type
          .call(axisFunc(scale)
            .tickSizeInner(-tickLength))
        select(axisElt).select('.grid').selectAll('text').remove()

        if (between(0, numericScale.domain()[0], numericScale.domain()[1])) {
          select(axisElt).append('g')
            .attr('class', 'zero')
            // @ts-expect-error scale type
            .call(axisFunc(scale)
              .tickSizeInner(-tickLength)
              .tickValues([0]))
          select(axisElt).select('.zero').selectAll('text').remove()
        }
      }
    }
  }, [axisElt, place, axisFunc, layout, showGridLines, scale, enableAnimation])

  // update d3 scale and axis when scale type changes
  useEffect(() => {
    if (axisModel) {
      const disposer = reaction(
        () => {
          const {place: aPlace, scale: scaleType} = axisModel
          return {place: aPlace, scaleType}
        },
        ({place: aPlace, scaleType}) => {
          const newScale =
            scaleType === 'log' ? scaleLog() :
              scaleType === 'linear' ? scaleLinear() :
                scaleOrdinal()
          layout.setAxisScale(aPlace, newScale)
          refreshAxis()
        }
      )
      return () => disposer()
    }
  }, [isNumeric, axisModel, layout, refreshAxis])

  // update d3 scale and axis when axis domain changes
  useEffect(function installDomainSync() {
    if (isNumeric) {
      const disposer = autorun((aReaction) => {
        const numericModel = axisModel as INumericAxisModel
        if (numericModel.domain) {
          const {domain} = numericModel
          scale?.domain(domain)
          refreshAxis()
        }
      })
      return () => disposer()
    }
    // Note axisModelChanged as a dependent. Shouldn't be necessary.
  }, [axisModelChanged, isNumeric, axisModel, refreshAxis, scale])

  // update d3 scale and axis when layout/range changes
  useEffect(() => {
    const disposer = reaction(
      () => {
        return layout.axisLength(place)
      },
      () => {
        refreshAxis()
      }
    )
    return () => disposer()
  }, [axisModel, layout, refreshAxis, place])

  useEffect(() => {
    refreshAxis()
  },[refreshAxis])

}
