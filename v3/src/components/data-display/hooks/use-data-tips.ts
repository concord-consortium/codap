import {select} from "d3"
import React, {useEffect} from "react"
import {tip as d3tip} from "d3-v6-tip"
import {IDataSet} from "../../../models/data/data-set"
import {IDotsRef, transitionDuration} from "../data-display-types"
import {CaseData} from "../d3-types"
import {getCaseTipText} from "../data-display-utils"
import {IGraphContentModel} from "../../graph/models/graph-content-model"
import {RoleAttrIDPair} from "../models/data-configuration-model"
import {urlParams} from "../../../utilities/url-params"
import {IMapPointLayerModel} from "../../map/models/map-point-layer-model"
import {isGraphDataConfigurationModel} from "../../graph/models/graph-data-configuration-model"

const dataTip = d3tip().attr('class', 'graph-d3-tip')/*.attr('opacity', 0.8)*/
  .attr('data-testid', 'graph-point-data-tip')
  .html((d: string) => {
    return `<p>${d}</p>`
  })

interface IUseDataTips {
  dotsRef: IDotsRef,
  dataset: IDataSet | undefined,
  displayModel: IGraphContentModel | IMapPointLayerModel,
  enableAnimation: React.MutableRefObject<boolean>
}

export const useDataTips = ({dotsRef, dataset, displayModel, enableAnimation}: IUseDataTips) => {
  const hoverPointRadius = displayModel.getPointRadius('hover-drag'),
    pointRadius = displayModel.getPointRadius(),
    selectedPointRadius = displayModel.getPointRadius('select'),
    dataConfiguration = displayModel.dataConfiguration,
    yAttrIDs = isGraphDataConfigurationModel(dataConfiguration)
      ? dataConfiguration.yAttributeIDs : undefined

  useEffect(() => {

    function okToTransition(target: any) {
      return !enableAnimation.current && target.node()?.nodeName === 'circle' && dataset &&
        !target.property('isDragging')
    }

    function showDataTip(event: MouseEvent) {
      const roleAttrIDPairs: RoleAttrIDPair[] = displayModel.dataConfiguration.uniqueTipAttributes ?? [],
        target = select(event.target as SVGSVGElement)
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
        const tipText = getCaseTipText(caseID, attrIDsToUse, dataset)
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
    displayModel.dataConfiguration.uniqueTipAttributes])
}
