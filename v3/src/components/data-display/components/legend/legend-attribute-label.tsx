import React, {useCallback, useEffect, useRef} from "react"
import {select} from "d3"
import {IDataConfigurationModel} from "../../models/data-configuration-model"
import {AttributeType} from "../../../../models/data/attribute"
import {IDataSet} from "../../../../models/data/data-set"
import {kPortalClassSelector} from "../../data-display-types"
import {axisGap} from "../../../axis/axis-types"
import {GraphPlace} from "../../../axis-graph-shared"
import {getStringBounds} from "../../../axis/axis-utils"
import {AttributeLabel} from "../attribute-label"

import vars from "../../../vars.scss"

interface IAttributeLabelProps {
  dataConfiguration: IDataConfigurationModel
  onChangeAttribute?: (place: GraphPlace, dataSet: IDataSet, attrId: string) => void
  onRemoveAttribute?: (place: GraphPlace, attrId: string) => void
  onTreatAttributeAs?: (place: GraphPlace, attrId: string, treatAs: AttributeType) => void
}

export const LegendAttributeLabel =
  function LegendAttributeLabel({
                            dataConfiguration, onTreatAttributeAs,
                            onRemoveAttribute, onChangeAttribute
                          }: IAttributeLabelProps) {
    const labelRef = useRef<SVGGElement>(null),
      parentElt = labelRef.current?.closest(kPortalClassSelector) as HTMLDivElement ?? null,
      className = 'attribute-label'

    const refreshLegendTitle = useCallback(() => {
      const dataset = dataConfiguration?.dataset,
        attributeID = dataConfiguration?.attributeID('legend'),
        attributeName = dataset?.attrFromID(attributeID).name ?? '',
        labelFont = vars.labelFont,
        labelBounds = getStringBounds(attributeName, labelFont),
        tX = axisGap,
        tY = labelBounds.height / 2 + 2
      select(labelRef.current)
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
              .text(attributeName)
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

    return (
      <AttributeLabel
        ref={labelRef}
        place={'legend'}
        portal={parentElt}
        refreshLabel={refreshLegendTitle}
        onChangeAttribute={onChangeAttribute}
        onRemoveAttribute={onRemoveAttribute}
        onTreatAttributeAs={onTreatAttributeAs}
      />
    )
  }
