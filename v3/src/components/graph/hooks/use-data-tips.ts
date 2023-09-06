import {select} from "d3"
import React, {useEffect} from "react"
import {tip as d3tip} from "d3-v6-tip"
import {IDataSet} from "../../../models/data/data-set"
import { CaseData } from "../../data-display/d3-types"
import {IDotsRef, transitionDuration} from "../../data-display/data-display-types"
import {IGraphContentModel} from "../models/graph-content-model"
import {getPointTipText} from "../utilities/graph-utils"
import {RoleAttrIDPair} from "../../data-display/models/data-configuration-model"
import { urlParams } from "../../../utilities/url-params"

const dataTip = d3tip().attr('class', 'graph-d3-tip')/*.attr('opacity', 0.8)*/
  .attr('data-testid', 'graph-point-data-tip')
  .html((d: string) => {
    return `<p>${d}</p>`
  })

interface IUseDataTips {
  dotsRef: IDotsRef,
  dataset: IDataSet | undefined,
  graphModel: IGraphContentModel,
  enableAnimation: React.MutableRefObject<boolean>
}
export const useDataTips = ({dotsRef, dataset, graphModel, enableAnimation}:IUseDataTips) => {
  const hoverPointRadius = graphModel.getPointRadius('hover-drag'),
    pointRadius = graphModel.getPointRadius(),
    selectedPointRadius = graphModel.getPointRadius('select'),
    yAttrIDs = graphModel.dataConfiguration.yAttributeIDs

  useEffect(() => {
    const roleAttrIDPairs: RoleAttrIDPair[] = graphModel.dataConfiguration.uniqueTipAttributes ?? []

    function okToTransition(target: any) {
      return !enableAnimation.current && target.node()?.nodeName === 'circle' && dataset &&
        !target.property('isDragging')
    }

    function showDataTip(event: MouseEvent) {
      const target = select(event.target as SVGSVGElement)
      if (okToTransition(target)) {
        target.transition().duration(transitionDuration).attr('r', hoverPointRadius)
        const caseID = (target.datum() as CaseData).caseID,
          plotNum = (target.datum() as CaseData).plotNum, // Only can be non-zero for scatter plots
          attrIDsToUse = roleAttrIDPairs.filter((aPair) => {
            return plotNum > 0 || aPair.role !== 'rightNumeric'
          }).map((aPair) => {
            return plotNum === 0
              ? aPair.attributeID
              : aPair.role === 'y' ? (yAttrIDs?.[plotNum] ?? '') : aPair.attributeID
          })
        const tipText = getPointTipText(caseID, attrIDsToUse, dataset)
        tipText !== '' && dataTip.show(tipText, event.target)
      }
    }

    function hideDataTip(event: MouseEvent) {
      const target = select(event.target as SVGSVGElement)
      dataTip.hide()
      if (okToTransition(target)) {
        const caseID = (select(event.target as SVGSVGElement).datum() as CaseData).caseID,
          isSelected = dataset?.isCaseSelected(caseID)
        select(event.target as SVGSVGElement)
          .transition().duration(transitionDuration)
          .attr('r', isSelected ? selectedPointRadius : pointRadius)
      }
    }

    // support disabling data tips via url parameter for jest tests
    if (urlParams.noDataTips === undefined) {
      dotsRef.current && select(dotsRef.current)
        .on('mouseover', showDataTip)
        .on('mouseout', hideDataTip)
        .call(dataTip)
    }
  }, [dotsRef, dataset, enableAnimation, yAttrIDs, hoverPointRadius, pointRadius, selectedPointRadius,
      graphModel.dataConfiguration.uniqueTipAttributes])
}
