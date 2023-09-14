import React, {useCallback, useEffect, useRef} from "react"
import {createPortal} from "react-dom"
import {reaction} from "mobx"
import {observer} from "mobx-react-lite"
import {select} from "d3"
import t from "../../../utilities/translation/translate"
import {useDataConfigurationContext} from "../hooks/use-data-configuration-context"
import {useGraphContentModelContext} from "../hooks/use-graph-content-model-context"
import {AttributeType} from "../../../models/data/attribute"
import {IDataSet} from "../../../models/data/data-set"
import {isSetAttributeNameAction} from "../../../models/data/data-set-actions"
import {GraphPlace, isVertical} from "../../axis-graph-shared"
import {graphPlaceToAttrRole, kGraphClassSelector} from "../graphing-types"
import {useGraphLayoutContext} from "../models/graph-layout"
import {useTileModelContext} from "../../../hooks/use-tile-model-context"
import {getStringBounds} from "../../axis/axis-utils"
import {AxisOrLegendAttributeMenu} from "../../axis/components/axis-or-legend-attribute-menu"

import graphVars from "./graph.scss"

interface IAttributeLabelProps {
  place: GraphPlace
  onChangeAttribute?: (place: GraphPlace, dataSet: IDataSet, attrId: string) => void
  onRemoveAttribute?: (place: GraphPlace, attrId: string) => void
  onTreatAttributeAs?: (place: GraphPlace, attrId: string, treatAs: AttributeType) => void
}

export const AttributeLabel = observer(
  function AttributeLabel({place, onTreatAttributeAs, onRemoveAttribute, onChangeAttribute}: IAttributeLabelProps) {
    const graphModel = useGraphContentModelContext(),
      dataConfiguration = useDataConfigurationContext(),
      layout = useGraphLayoutContext(),
      {isTileSelected} = useTileModelContext(),
      dataset = dataConfiguration?.dataset,
      labelRef = useRef<SVGGElement>(null),
      useClickHereCue = dataConfiguration?.placeCanShowClickHereCue(place) ?? false,
      hideClickHereCue = useClickHereCue &&
        !dataConfiguration?.placeAlwaysShowsClickHereCue(place) && !isTileSelected(),
      parentElt = labelRef.current?.closest(kGraphClassSelector) as HTMLDivElement ?? null

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
      const labelFont = useClickHereCue ? graphVars.graphEmptyLabelFont : graphVars.graphLabelFont,
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
    }, [layout, place, labelRef, getLabel, useClickHereCue, hideClickHereCue])

    useEffect(function observeAttributeNameChange() {
      const disposer = dataConfiguration?.onAction(action => {
        if (isSetAttributeNameAction(action)) {
          const [changedAttributeID] = action.args
          if (getAttributeIDs().includes(changedAttributeID)) {
            refreshAxisTitle()
          }
        }
      })

      return () => disposer?.()
    }, [dataConfiguration, refreshAxisTitle, getAttributeIDs])

    // Install reaction to bring about rerender when layout's computedBounds changes
    useEffect(() => {
      const disposer = reaction(
        () => layout.getComputedBounds(place),
        () => refreshAxisTitle(),
        { name: "AttributeLabel [layout.getComputedBounds]"}
      )
      return () => disposer()
    }, [place, layout, refreshAxisTitle])

    useEffect(function setupTitle() {

      const removeUnusedLabel = () => {
        const classNameToRemove = useClickHereCue ? 'attribute-label' : 'empty-label'
        select(labelRef.current)
          .selectAll(`text.${classNameToRemove}`)
          .remove()
      }

      if (labelRef) {
        removeUnusedLabel()
        const anchor = place === 'legend' ? 'start' : 'middle',
          className = useClickHereCue ? 'empty-label' : 'attribute-label'
        select(labelRef.current)
          .selectAll(`text.${className}`)
          .data([1])
          .join(
            (enter) =>
              enter.append('text')
                .attr('class', className)
                .attr('text-anchor', anchor)
                .attr('data-testid', className)
          )
        refreshAxisTitle()
      }
    }, [labelRef, place, useClickHereCue, refreshAxisTitle])

    // Respond to changes in attributeID assigned to my place
    useEffect(() => {
        const disposer = reaction(
          () => {
            if (place === 'left') {
              return dataConfiguration?.yAttributeDescriptionsExcludingY2.map((desc) => desc.attributeID)
            }
            else {
              return dataConfiguration?.attributeID(graphPlaceToAttrRole[place])
            }
          },
          () => {
            refreshAxisTitle()
          }, { name: "AttributeLabel [attribute configuration]"}
        )
        return () => disposer()
    }, [place, dataConfiguration, refreshAxisTitle])

    return (
      <>
        <g ref={labelRef}/>
        {parentElt && onChangeAttribute && onTreatAttributeAs && onRemoveAttribute &&
          createPortal(<AxisOrLegendAttributeMenu
            target={labelRef.current}
            portal={parentElt}
            place={place}
            onChangeAttribute={onChangeAttribute}
            onRemoveAttribute={onRemoveAttribute}
            onTreatAttributeAs={onTreatAttributeAs}
          />, parentElt)
        }
      </>
    )
  })
AttributeLabel.displayName = "AttributeLabel"
