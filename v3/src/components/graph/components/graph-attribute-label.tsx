import React, {useCallback, useEffect, useRef} from "react"
import {select} from "d3"
import t from "../../../utilities/translation/translate"
import {useGraphDataConfigurationContext} from "../hooks/use-graph-data-configuration-context"
import {useGraphContentModelContext} from "../hooks/use-graph-content-model-context"
import {useGraphLayoutContext} from "../hooks/use-graph-layout-context"
import {AttributeType} from "../../../models/data/attribute"
import {IDataSet} from "../../../models/data/data-set"
import {GraphPlace, isVertical} from "../../axis-graph-shared"
import {AttributeLabel} from "../../data-display/components/attribute-label"
import {graphPlaceToAttrRole, kPortalClassSelector} from "../../data-display/data-display-types"
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
      labelRef = useRef<SVGGElement>(null),
      useClickHereCue = dataConfiguration?.placeCanShowClickHereCue(place) ?? false,
      hideClickHereCue = useClickHereCue &&
        !dataConfiguration?.placeAlwaysShowsClickHereCue(place) && !isTileSelected(),
      parentElt = labelRef.current?.closest(kPortalClassSelector) as HTMLDivElement ?? null

    const getAttributeIDs = useCallback(() => {
      const isScatterPlot = graphModel.plotType === 'scatterPlot',
        yAttributeDescriptions = dataConfiguration?.yAttributeDescriptionsExcludingY2 || [],
        role = graphPlaceToAttrRole[place],
        attrID = dataConfiguration?.attributeID(role) || ''
      return place === 'left' && isScatterPlot
        ? yAttributeDescriptions.map((desc) => desc.attributeID)
        : [attrID]
    }, [dataConfiguration, graphModel.plotType, place])

    const getLabel = useCallback(() => {
      if (useClickHereCue) {
        return t('DG.AxisView.emptyGraphCue')
      }
      const attrIDs = getAttributeIDs()
      return attrIDs.map(anID => dataset?.attrFromID(anID)?.name)
        .filter(aName => aName !== '').join(', ')
    }, [dataset, getAttributeIDs, useClickHereCue])

    const refreshAxisTitle = useCallback(() => {
      const labelFont = useClickHereCue ? vars.emptyLabelFont : vars.labelFont,
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
        tRotation = isVertical(place) ? ` rotate(-90,${tX},${tY})` : '',
        className = useClickHereCue ? 'empty-label' : 'attribute-label'
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
              .style('visibility', hideClickHereCue ? 'hidden' : 'visible')
              .attr('x', tX)
              .attr('y', tY)
              .text(label)
        )
    }, [layout, place, getLabel, useClickHereCue, hideClickHereCue])

    useEffect(function setupTitle() {

      const removeUnusedLabel = () => {
        const classNameToRemove = useClickHereCue ? 'attribute-label' : 'empty-label'
        select(labelRef.current)
          .selectAll(`text.${classNameToRemove}`)
          .remove()
      }

      if (labelRef.current) {
        removeUnusedLabel()
        const className = useClickHereCue ? 'empty-label' : 'attribute-label'
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
    }, [place, useClickHereCue, refreshAxisTitle])

    return (
      <AttributeLabel
        ref={labelRef}
        place={place}
        portal={parentElt}
        refreshLabel={refreshAxisTitle}
        onChangeAttribute={onChangeAttribute}
        onRemoveAttribute={onRemoveAttribute}
        onTreatAttributeAs={onTreatAttributeAs}
      />
    )
  }
