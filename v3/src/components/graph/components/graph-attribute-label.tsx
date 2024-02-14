import React, {useCallback, useEffect, useRef} from "react"
import {select} from "d3"
import { t } from "../../../utilities/translation/translate"
import {useGraphDataConfigurationContext} from "../hooks/use-graph-data-configuration-context"
import {useGraphContentModelContext} from "../hooks/use-graph-content-model-context"
import {useGraphLayoutContext} from "../hooks/use-graph-layout-context"
import {AttributeType} from "../../../models/data/attribute"
import {IDataSet} from "../../../models/data/data-set"
import {GraphPlace, isVertical} from "../../axis-graph-shared"
import {AttributeLabel} from "../../data-display/components/attribute-label"
import {graphPlaceToAttrRole} from "../../data-display/data-display-types"
import {useTileModelContext} from "../../../hooks/use-tile-model-context"
import {getStringBounds} from "../../axis/axis-utils"

import vars from "../../vars.scss"

interface IAttributeLabelProps {
  place: GraphPlace
  onChangeAttribute?: (place: GraphPlace, dataSet: IDataSet, attrId: string) => void
  onRemoveAttribute?: (place: GraphPlace, attrId: string) => void
  onTreatAttributeAs?: (place: GraphPlace, attrId: string, treatAs: AttributeType) => void
}

export const GraphAttributeLabel =
  function GraphAttributeLabel({place, onTreatAttributeAs, onRemoveAttribute,
                                 onChangeAttribute}: IAttributeLabelProps) {
    const graphModel = useGraphContentModelContext(),
      dataConfiguration = useGraphDataConfigurationContext(),
      layout = useGraphLayoutContext(),
      {isTileSelected} = useTileModelContext(),
      dataset = dataConfiguration?.dataset,
      labelRef = useRef<SVGGElement>(null)

    const getAttributeIDs = useCallback(() => {
      const isScatterPlot = graphModel.plotType === 'scatterPlot',
        yAttributeDescriptions = dataConfiguration?.yAttributeDescriptionsExcludingY2 || [],
        role = graphPlaceToAttrRole[place],
        attrID = dataConfiguration?.attributeID(role) || ''
      return place === 'left' && isScatterPlot
        ? yAttributeDescriptions.map((desc) => desc.attributeID)
        : [attrID]
    }, [dataConfiguration, graphModel.plotType, place])

    const getClickHereCue = useCallback(() => {
      const useClickHereCue = dataConfiguration?.placeCanShowClickHereCue(place) ?? false
      const hideClickHereCue = useClickHereCue &&
        !dataConfiguration?.placeAlwaysShowsClickHereCue(place) && !isTileSelected()
      const className = useClickHereCue ? 'empty-label' : 'attribute-label'
      const unusedClassName = useClickHereCue ? 'attribute-label' : 'empty-label'
      const visibility = hideClickHereCue ? 'hidden' : 'visible'
      const labelFont = useClickHereCue ? vars.emptyLabelFont : vars.labelFont
      return { useClickHereCue, className, unusedClassName, labelFont, visibility }
    }, [dataConfiguration, isTileSelected, place])

    const getLabel = useCallback(() => {
      const { useClickHereCue } = getClickHereCue()
      if (useClickHereCue) {
        return t('DG.AxisView.emptyGraphCue')
      }
      const attrIDs = getAttributeIDs()
      return attrIDs.map(anID => dataset?.attrFromID(anID)?.name)
        .filter(aName => aName !== '').join(', ')
    }, [dataset, getAttributeIDs, getClickHereCue])

    const refreshAxisTitle = useCallback(() => {
      const {labelFont, className, visibility} = getClickHereCue(),
        bounds = layout.getComputedBounds(place),
        layoutIsVertical = isVertical(place),
        halfRange = layoutIsVertical ? bounds.height / 2 : bounds.width / 2,
        label = getLabel(),
        labelBounds = getStringBounds(label, labelFont),
        labelTransform = `translate(${bounds.left}, ${bounds.top})`,
        tX = place === 'left' ? labelBounds.height
          : place === 'legend' ? bounds.left
            : ['rightNumeric', 'rightCat'].includes(place) ? bounds.width - labelBounds.height / 2
              : halfRange,
        tY = isVertical(place) ? halfRange
          : place === 'legend' ? labelBounds.height / 2
            : place === 'top' ? labelBounds.height : bounds.height - labelBounds.height / 2,
        tRotation = isVertical(place) ? ` rotate(-90,${tX},${tY})` : ''
      select(labelRef.current)
        .selectAll(`text.${className}`)
        .data([1])
        .join(
          enter => enter,
          (update) =>
            update
              .attr("transform", labelTransform + tRotation)
              .attr('class', className)
              .attr('data-testid', className)
              .style('visibility', visibility)
              .attr('x', tX)
              .attr('y', tY)
              .text(label)
        )
    }, [getClickHereCue, getLabel, layout, place])

    useEffect(function setupTitle() {

      const { className, unusedClassName } = getClickHereCue()

      const removeUnusedLabel = () => {
        select(labelRef.current)
          .selectAll(`text.${unusedClassName}`)
          .remove()
      }

      if (labelRef.current) {
        removeUnusedLabel()
        select(labelRef.current)
          .selectAll(`text.${className}`)
          .data([1])
          .join(
            (enter) =>
              enter.append('text')
                .attr('class', className)
                .attr('text-anchor', 'middle')
                .attr('data-testid', className)
          )
        refreshAxisTitle()
      }
    }, [getClickHereCue, place, refreshAxisTitle])

    return (
      <AttributeLabel
        ref={labelRef}
        place={place}
        refreshLabel={refreshAxisTitle}
        onChangeAttribute={onChangeAttribute}
        onRemoveAttribute={onRemoveAttribute}
        onTreatAttributeAs={onTreatAttributeAs}
      />
    )
  }
