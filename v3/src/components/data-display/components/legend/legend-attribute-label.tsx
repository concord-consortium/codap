import {useCallback, useEffect, useRef} from "react"
import {select} from "d3"
import {AttributeType} from "../../../../models/data/attribute-types"
import {IDataSet} from "../../../../models/data/data-set"
import {axisGap, labelPaddingX, labelPaddingY} from "../../../axis/axis-types"
import {GraphPlace} from "../../../axis-graph-shared"
import {getStringBounds, renderLabelBackground} from "../../../axis/axis-utils"
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
        tX = axisGap + labelPaddingX,  // offset so rect left edge aligns with legend keys
        // With dominant-baseline: central, tY sets the vertical center of the text. Placing
        // the center at labelBounds.height/2 + labelPaddingY puts the background rect's top
        // edge at y=0 (the legend bounds top) — no overflow that could be clipped by the
        // SVG viewport on hover, and no excess whitespace above the label.
        tY = labelBounds.height / 2 + labelPaddingY

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

      renderLabelBackground({ gSelection, textSelector: `text.${className}` })
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
                .attr('dominant-baseline', 'central')
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
