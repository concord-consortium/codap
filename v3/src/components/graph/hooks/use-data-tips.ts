import {select} from "d3"
import React, {useEffect} from "react"
import {tip as d3tip} from "d3-v6-tip"
import {IGraphModel} from "../models/graph-model"
import {transitionDuration} from "../graphing-types"
import {IDataSet} from "../../../models/data/data-set"
import {getPointTipText} from "../utilities/graph-utils"

const dataTip = d3tip().attr('class', 'graph-d3-tip')/*.attr('opacity', 0.8)*/
  .attr('data-testid', 'graph-point-data-tip')
  .html((d: string) => {
    return `<p>${d}</p>`
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
