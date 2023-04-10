import React, {useCallback, useEffect, useRef} from "react"
import {createPortal} from "react-dom"
import {reaction} from "mobx"
import {observer} from "mobx-react-lite"
import {select} from "d3"
import t from "../../../utilities/translation/translate"
import {useDataConfigurationContext} from "../hooks/use-data-configuration-context"
import {isSetAttributeNameAction} from "../../../models/data/data-set-actions"
import {isVertical, GraphPlace, graphPlaceToAttrRole, kGraphClassSelector} from "../graphing-types"
import {useGraphModelContext} from "../models/graph-model"
import {useGraphLayoutContext} from "../models/graph-layout"
import {getStringBounds} from "../../axis/axis-utils"
import {AxisPlace} from "../../axis/axis-types"
import {AxisOrLegendAttributeMenu} from "../../axis/components/axis-or-legend-attribute-menu"

import graphVars from "./graph.scss"

interface IAttributeLabelProps {
  place: GraphPlace
  onChangeAttribute?: (place: AxisPlace, attrId: string) => void
  onRemoveAttribute?: (place: AxisPlace, attrId: string) => void
  onTreatAttributeAs?: (place: GraphPlace, attrId: string, treatAs: string) => void
}

export const AttributeLabel = observer(
  function AttributeLabel({place, onTreatAttributeAs, onRemoveAttribute, onChangeAttribute}: IAttributeLabelProps) {
    const graphModel = useGraphModelContext(),
      dataConfiguration = useDataConfigurationContext(),
      layout = useGraphLayoutContext(),
      dataset = dataConfiguration?.dataset,
      labelRef = useRef<SVGGElement>(null),
      showClickHereCue = dataConfiguration?.placeCanShowClickHereCue(place) ?? false,
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
      if (showClickHereCue) {
        return t('DG.AxisView.emptyGraphCue')
      }
      const attrIDs = getAttributeIDs()
      return attrIDs.map(anID => dataset?.attrFromID(anID)?.name)
        .filter(aName => aName !== '').join(', ')
    }, [dataset, getAttributeIDs, showClickHereCue])

    const refreshAxisTitle = useCallback(() => {
      const labelFont = showClickHereCue ? graphVars.graphEmptyLabelFont : graphVars.graphLabelFont,
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
        className = showClickHereCue ? 'empty-label' : 'attribute-label'
      select(labelRef.current)
        .selectAll(`text.${className}`)
        .data([1])
        .join(
          // @ts-expect-error void => Selection
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          () => {
          },
          (update) => {
            update
              .attr("transform", labelTransform + tRotation)
              .attr('class', className)
              .attr('x', tX)
              .attr('y', tY)
              .text(label)
          })
    }, [layout, place, labelRef, getLabel, showClickHereCue])

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
        () => refreshAxisTitle()
      )
      return () => disposer()
    }, [place, layout, refreshAxisTitle])

    useEffect(function setupTitle() {

      const removeUnusedLabel = () => {
        const classNameToRemove = showClickHereCue ? 'attribute-label' : 'empty-label'
        select(labelRef.current)
          .selectAll(`text.${classNameToRemove}`)
          .remove()
      }

      if (labelRef) {
        removeUnusedLabel()
        const anchor = place === 'legend' ? 'start' : 'middle',
          className = showClickHereCue ? 'empty-label' : 'attribute-label'
        select(labelRef.current)
          .selectAll(`text.${className}`)
          .data([1])
          .join(
            // @ts-expect-error void => Selection
            (enter) => {
              enter.append('text')
                .attr('class', className)
                .attr('text-anchor', anchor)
                .attr('data-testid', `attribute-label-${place}`)
            })
        refreshAxisTitle()
      }
    }, [labelRef, place, showClickHereCue, refreshAxisTitle])

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
          }
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
