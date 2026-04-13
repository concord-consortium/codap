import {useCallback, useEffect, useRef} from "react"
import {select} from "d3"
import {AttributeType} from "../../../../models/data/attribute-types"
import {IDataSet} from "../../../../models/data/data-set"
import {axisGap} from "../../../axis/axis-types"
import {GraphPlace} from "../../../axis-graph-shared"
import {getStringBounds} from "../../../axis/axis-utils"
import {useDataConfigurationContext} from "../../hooks/use-data-configuration-context"
import {useTileSelectionContext} from "../../../../hooks/use-tile-selection-context"
import {AttributeLabel} from "../attribute-label"
import { logMessageWithReplacement } from "../../../../lib/log-message"

import vars from "../../../vars.scss"

interface IAttributeLabelProps {
  onChangeAttribute?: (place: GraphPlace, dataSet: IDataSet, attrId: string) => void
}

export const LegendAttributeLabel =
  function LegendAttributeLabel({ onChangeAttribute }: IAttributeLabelProps) {
    const dataConfiguration = useDataConfigurationContext(),
      {isTileSelected} = useTileSelectionContext(),
      labelRef = useRef<SVGGElement>(null),
      className = 'attribute-label'

    const refreshLegendTitle = useCallback(() => {
      const dataset = dataConfiguration?.dataset,
        attributeID = dataConfiguration?.attributeID('legend'),
        attributeName = (attributeID ? dataset?.attrFromID(attributeID)?.name : '') ?? '',
        attributeUnits = (attributeID ? dataset?.attrFromID(attributeID)?.units : '') ?? '',
        labelFont = vars.labelFont,
        labelBounds = getStringBounds(attributeName, labelFont),
        tX = axisGap + 8,  // offset by paddingX so rect left edge aligns with legend keys
        tY = labelBounds.height / 2

      const gSelection = select(labelRef.current)
      gSelection.classed('tile-selected', isTileSelected())

      gSelection
        .selectAll(`text.${className}`)
        .data([1])
        .join(
          enter => enter,
          (update) =>
            update
              .attr('class', className)
              .attr('data-testid', className)
              .attr('x', tX)
              .attr('y', tY)
              .text(`${attributeName}${attributeUnits ? ` (${attributeUnits})` : ''}`)
        )

      // Add background rect and dropdown arrow (same pattern as axis labels)
      const textNode = gSelection.select(`text.${className}`).node() as SVGTextElement | null
      const textBBox = textNode?.getBBox()

      if (textBBox) {
        const paddingX = 8
        const paddingY = 2
        const arrowWidth = 24

        const rectWidth = textBBox.width + paddingX + arrowWidth
        const rectHeight = textBBox.height + paddingY * 2
        const rectX = textBBox.x - paddingX
        const rectY = textBBox.y - paddingY

        gSelection.selectAll('rect.attribute-label-bg')
          .data([1])
          .join(
            (enter) => enter.append('rect').attr('class', 'attribute-label-bg'),
            (update) => update
          )
          .attr('x', rectX)
          .attr('y', rectY)
          .attr('width', rectWidth)
          .attr('height', rectHeight)
          .attr('rx', 4)
          .lower()

        const arrowX = textBBox.x + textBBox.width
        const arrowY = textBBox.y + (textBBox.height - arrowWidth) / 2

        gSelection.selectAll('svg.attribute-label-arrow')
          .data([1])
          .join(
            (enter) => {
              const arrow = enter.append('svg')
                .attr('class', 'attribute-label-arrow')
                .attr('viewBox', '0 0 24 24')
                .attr('width', arrowWidth)
                .attr('height', arrowWidth)
              arrow.append('path').attr('d', 'm12 15-5-5h10z')
              return arrow
            },
            (update) => update
          )
          .attr('x', arrowX)
          .attr('y', arrowY)
      }
    }, [dataConfiguration, isTileSelected])

    const handleRemoveAttribute = useCallback(() => {
      dataConfiguration?.applyModelChange(
        () => dataConfiguration.setAttribute('legend', {attributeID: ''}),
        {
          undoStringKey: "V3.Undo.legendAttributeRemove",
          redoStringKey: "V3.Redo.legendAttributeRemove",
          log: "Remove legend attribute"
        }
      )
    }, [dataConfiguration])

    const handleTreatAttributeAs = useCallback((_place: GraphPlace, _attrId: string, treatAs: AttributeType) => {
      dataConfiguration?.applyModelChange(
        () => dataConfiguration.setAttributeType('legend', treatAs),
        {
          undoStringKey: "V3.Undo.attributeTreatAs",
          redoStringKey: "V3.Redo.attributeTreatAs",
          log: logMessageWithReplacement("Treat attribute as %@", {treatAs, _attrId, _place})
        }
      )
    }, [dataConfiguration])

    useEffect(function setupTitle() {

      const removeUnusedLabel = () => {
        select(labelRef.current)
          .selectAll(`text.${className}`)
          .remove()
      }

      if (labelRef) {
        removeUnusedLabel()
        select(labelRef.current)
          .selectAll(`text.${className}`)
          .data([1])
          .join(
            (enter) =>
              enter.append('text')
                .attr('class', className)
                .attr('text-anchor', 'start')
                .attr('data-testid', className)
          )
        refreshLegendTitle()
      }
    }, [labelRef, refreshLegendTitle])

    return dataConfiguration && (
      <AttributeLabel
        ref={labelRef}
        place={'legend'}
        refreshLabel={refreshLegendTitle}
        onChangeAttribute={onChangeAttribute}
        onRemoveAttribute={handleRemoveAttribute}
        onTreatAttributeAs={handleTreatAttributeAs}
      />
    )
  }
