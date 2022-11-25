import {select} from "d3"
import React, {useCallback, useEffect, useRef} from "react"
import {reaction} from "mobx"
import {onAction} from "mobx-state-tree"
import {tip as d3tip} from "d3-v6-tip"
import {isSelectionAction, isSetCaseValuesAction} from "../../../models/data/data-set-actions"
import {INumericAxisModel} from "../models/axis-model"
import {GraphLayout} from "../models/graph-layout"
import {useCurrent} from "../../../hooks/use-current"
import {IGraphModel} from "../models/graph-model"
import {transitionDuration} from "../graphing-types"
import {IDataSet} from "../../../models/data/data-set"
import {getPointTipText, matchCirclesToData} from "../utilities/graph-utils"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"

interface IDragHandlers {
  start: (event: MouseEvent) => void
  drag: (event: MouseEvent) => void
  end: (event: MouseEvent) => void
}

export const useDragHandlers = (target: any, {start, drag, end}: IDragHandlers) => {
  useEffect(() => {
    target.addEventListener('mousedown', start)
    target.addEventListener('mousemove', drag)
    target.addEventListener('mouseup', end)
    // On cleanup, remove event listeners
    return () => {
      target.removeEventListener('mousedown', start)
      target.removeEventListener('mousemove', drag)
      target.removeEventListener('mouseup', end)
    }
  }, [target, start, drag, end])
}

export interface IPlotResponderProps {
  graphModel: IGraphModel
  primaryAttrID?: string
  secondaryAttrID?: string
  legendAttrID?: string
  layout: GraphLayout
  refreshPointPositions: (selectedOnly: boolean) => void
  refreshPointSelection: () => void
  dotsRef: React.RefObject<SVGSVGElement>
  enableAnimation: React.MutableRefObject<boolean>
}

export const usePlotResponders = (props: IPlotResponderProps) => {
  const {
      graphModel, primaryAttrID, secondaryAttrID, legendAttrID, enableAnimation,
      refreshPointPositions, refreshPointSelection, dotsRef, layout
    } = props,
    dataset = graphModel.config.dataset,
    xNumeric = graphModel.getAxis('bottom') as INumericAxisModel,
    yNumeric = graphModel.getAxis('left') as INumericAxisModel,
    refreshPointsRef = useCurrent(refreshPointPositions),
    instanceId = useInstanceIdContext()

  /* This routine is frequently called many times in a row when something about the graph changes that requires
  * refreshing the plot's point positions. That, by itself, would be a reason to ensure that
  * the actual refreshPointPositions function is only called once. But another, even more important reason is
  * that there is no guarantee that when callRefreshPointPositions is invoked, the d3 points in the plot
  * have been synched with the data configuration's notion of which cases are plottable. Delaying the actual
  * plotting of points until the next event cycle ensures that the data configuration's filter process will
  * have had a chance to take place. */
  const timer = useRef<any>()
  const callRefreshPointPositions = useCallback((selectedOnly: boolean) => {
    if (timer.current) {
      return
    }
    timer.current = setTimeout(() => {
      refreshPointsRef.current(selectedOnly)
      timer.current = null
    }, 10)
  }, [refreshPointsRef])

  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current)
      }
    }
  }, [])

  // respond to axis domain changes (e.g. axis dragging)
  useEffect(() => {
    const disposer = reaction(
      () => [xNumeric?.domain, yNumeric?.domain],
      () => {
        callRefreshPointPositions(false)
      }, {fireImmediately: true}
    )
    return () => disposer()
  }, [callRefreshPointPositions, xNumeric?.domain, yNumeric?.domain])

  // respond to axis range changes (e.g. component resizing)
  useEffect(() => {
    const disposer = reaction(
      () => [layout.axisLength('left'), layout.axisLength('bottom')],
      () => {
        callRefreshPointPositions(false)
      }
    )
    return () => disposer()
  }, [layout, callRefreshPointPositions])

  // respond to selection and value changes
  useEffect(() => {
    if (dataset) {
      const disposer = onAction(dataset, action => {
        if (isSelectionAction(action)) {
          refreshPointSelection()
        } else if (isSetCaseValuesAction(action)) {
          // assumes that if we're caching then only selected cases are being updated
          callRefreshPointPositions(dataset.isCaching)
          // TODO: handling of add/remove cases was added specifically for the case plot.
          // Bill has expressed a desire to refactor the case plot to behave more like the
          // other plots, which already handle removal of cases (and perhaps addition of cases?)
          // without this. Should check to see whether this is necessary down the road.
        } else if (["addCases", "removeCases"].includes(action.name)) {
          callRefreshPointPositions(false)
        }
      }, true)
      return () => disposer()
    }
  }, [dataset, callRefreshPointPositions, refreshPointSelection])

  // respond to dataset, x, y or legend attribute id change
  useEffect(() => {
    enableAnimation.current = true
    callRefreshPointPositions(false)
  }, [callRefreshPointPositions, primaryAttrID, secondaryAttrID, legendAttrID, enableAnimation])

  // respond to added or removed cases and change in attribute type
  useEffect(function handleAddRemoveCases() {
    const dataConfiguration = graphModel.config
    const disposer = dataConfiguration.onAction(action => {
      if (['addCases', 'removeCases', 'setAttributeType'].includes(action.name)) {
        matchCirclesToData({
          dataset,
          caseIDs: dataConfiguration.cases,
          pointRadius: graphModel.getPointRadius(),
          dotsElement: dotsRef.current,
          enableAnimation, instanceId
        })
        callRefreshPointPositions(false)
      }
    })
    return () => disposer()
  }, [dataset, enableAnimation, graphModel, callRefreshPointPositions, dotsRef, instanceId])

}

const dataTip = d3tip().attr('class', 'graph-d3-tip')/*.attr('opacity', 0.8)*/
  .attr('data-testid', 'graph-point-data-tip')
  .html((d: string) => {
    return "<p>" + d + "</p>"
  })

export const useDataTips = (dotsRef: React.RefObject<SVGSVGElement>,
                            dataset: IDataSet | undefined, graphModel: IGraphModel) => {
  const hoverPointRadius = graphModel.getPointRadius('hover-drag'),
    pointRadius = graphModel.getPointRadius(),
    selectedPointRadius = graphModel.getPointRadius('select'),
    attrIDs = graphModel.config.uniqueTipAttributes

  useEffect(() => {

    function okToTransition(target: any) {
      return target.node()?.nodeName === 'circle' && dataset && /*!active(target.node()) &&*/
        !target.property('isDragging')
    }

    function showDataTip(event: MouseEvent) {
      const target = select(event.target as SVGSVGElement)
      if (okToTransition(target)) {
        target.transition().duration(transitionDuration).attr('r', hoverPointRadius)
        const [, caseID] = target.property('id').split("_"),
          tipText = getPointTipText(caseID, attrIDs, dataset)
        tipText !== '' && dataTip.show(tipText, event.target)
      }
    }

    function hideDataTip(event: MouseEvent) {
      const target = select(event.target as SVGSVGElement)
      dataTip.hide()
      if (okToTransition(target)) {
        const [, caseID] = select(event.target as SVGSVGElement).property('id').split("_"),
          isSelected = dataset?.isCaseSelected(caseID)
        select(event.target as SVGSVGElement)
          .transition().duration(transitionDuration)
          .attr('r', isSelected ? selectedPointRadius : pointRadius)
      }
    }

    select(dotsRef.current)
      .on('mouseover', showDataTip)
      .on('mouseout', hideDataTip)
      .call(dataTip)
  }, [dotsRef, dataset, attrIDs, hoverPointRadius, pointRadius, selectedPointRadius])
}
