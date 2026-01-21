import { useCallback, useRef } from "react"
import { observer } from "mobx-react-lite"
import { select } from "d3"
import { t } from "../../../utilities/translation/translate"
import { useGraphDataConfigurationContext } from "../hooks/use-graph-data-configuration-context"
import { useGraphContentModelContext } from "../hooks/use-graph-content-model-context"
import { useGraphLayoutContext } from "../hooks/use-graph-layout-context"
import { AttributeType } from "../../../models/data/attribute-types"
import { IDataSet } from "../../../models/data/data-set"
import { GraphPlace, isVertical } from "../../axis-graph-shared"
import { AttributeLabel } from "../../data-display/components/attribute-label"
import { graphPlaceToAttrRole } from "../../data-display/data-display-types"
import { useTileSelectionContext } from "../../../hooks/use-tile-selection-context"
import { getStringBounds } from "../../axis/axis-utils"
import { ClickableAxisLabel } from "./clickable-axis-label"

import vars from "../../vars.scss"

interface IAttributeLabelProps {
  place: GraphPlace
  onChangeAttribute?: (place: GraphPlace, dataSet: IDataSet, attrId: string) => void
  onRemoveAttribute?: (place: GraphPlace, attrId: string) => void
  onTreatAttributeAs?: (place: GraphPlace, attrId: string, treatAs: AttributeType) => void
}

export const GraphAttributeLabel =
  observer(function GraphAttributeLabel({
                                 place, onTreatAttributeAs, onRemoveAttribute,
                                 onChangeAttribute
                               }: IAttributeLabelProps) {
    const graphModel = useGraphContentModelContext(),
      dataConfiguration = useGraphDataConfigurationContext(),
      layout = useGraphLayoutContext(),
      {isTileSelected} = useTileSelectionContext(),
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
      const useClickHereCue =
        dataConfiguration?.placeCanShowClickHereCue(place, graphModel.pointsFusedIntoBars) ?? false
      const hideClickHereCue = useClickHereCue &&
        !dataConfiguration?.placeAlwaysShowsClickHereCue(place) && !isTileSelected()
      const className = useClickHereCue ? 'empty-label' : 'attribute-label'
      const unusedClassName = useClickHereCue ? 'attribute-label' : 'empty-label'
      const visibility = hideClickHereCue ? 'hidden' : 'visible'
      const labelFont = useClickHereCue ? vars.emptyLabelFont : vars.labelFont
      return {useClickHereCue, className, unusedClassName, labelFont, visibility}
    }, [dataConfiguration, graphModel, isTileSelected, place])

    const getLabel = useCallback(() => {
      const {useClickHereCue} = getClickHereCue()
      if (useClickHereCue) {
        return t('DG.AxisView.emptyGraphCue')
      }
      const attrIDs = getAttributeIDs()
      const secondaryPlace = dataConfiguration?.secondaryRole === "x" ? "bottom" : "left"
      if (place === secondaryPlace && graphModel?.plot.hasCountPercentFormulaAxis) {
        return graphModel?.plot.countPercentFormulaAxisLabel || ''
      }
      return attrIDs.map(anID => dataset?.attrFromID(anID))
                    .filter(attr => attr?.name !== '')
                    .map(attr => `${attr?.name}${attr?.units ? ` (${attr?.units})` : ""}`.trim())
                    .join(', ')
    }, [dataConfiguration?.secondaryRole, dataset, getAttributeIDs, getClickHereCue, graphModel?.plot, place])

    const refreshAxisTitle = useCallback(() => {

      const updateSelection = (selection:  any) => {
        return selection
          .attr('class', className)
          .attr('text-anchor', 'middle')
          .attr('data-testid', className)
          .attr("transform", labelTransform + tRotation)
          .attr('class', className)
          .attr('data-testid', className)
          .style('visibility', visibility)
          .attr('x', tX)
          .attr('y', tY)
          .text(label)
      }

      const {labelFont, className, unusedClassName, visibility} = getClickHereCue(),
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

      select(labelRef.current).selectAll(`text.${unusedClassName}`).remove()

      const labelTextSelection = select(labelRef.current).selectAll(`text.${className}`)
      labelTextSelection
        .data([1])
        .join(
          (enter) =>
            enter.append('text')
              .attr('text-anchor', 'middle')
              .call(updateSelection),
          (update) =>
            update.call(updateSelection),
          )
    }, [getClickHereCue, getLabel, layout, place])

    const plotDefinedAxisClickHandler = graphModel.plot.axisLabelClickHandler(graphPlaceToAttrRole[place])

    const renderAxisLabel = () => {
      return plotDefinedAxisClickHandler
        ? <ClickableAxisLabel
          ref={labelRef}
          place={place}
          refreshLabel={refreshAxisTitle}
          onClickHandler={plotDefinedAxisClickHandler}
        />
        : <AttributeLabel
          ref={labelRef}
          place={place}
          refreshLabel={refreshAxisTitle}
          onChangeAttribute={onChangeAttribute}
          onRemoveAttribute={onRemoveAttribute}
          onTreatAttributeAs={onTreatAttributeAs}
        />
    }

    return (
      <g>
      { renderAxisLabel() }
      </g>
    )
  })
