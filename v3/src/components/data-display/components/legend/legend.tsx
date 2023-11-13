import {autorun} from "mobx"
import React, {useEffect, useRef} from "react"
import {select} from "d3"
import {Active} from "@dnd-kit/core"
import {AttributeLabel} from "../../../graph/components/attribute-label"
import {CategoricalLegend} from "./categorical-legend"
import {NumericLegend} from "./numeric-legend"
import {DroppableSvg} from "../droppable-svg"
import {useInstanceIdContext} from "../../../../hooks/use-instance-id-context"
import {getDragAttributeInfo, useDropHandler} from "../../../../hooks/use-drag-drop"
import {useDropHintString} from "../../../../hooks/use-drop-hint-string"
import {AttributeType} from "../../../../models/data/attribute"
import {IDataSet} from "../../../../models/data/data-set"
import {GraphAttrRole} from "../../data-display-types"
import {GraphPlace} from "../../../axis-graph-shared"
import {useDataDisplayLayout} from "../../hooks/use-data-display-layout"
import {IDataConfigurationModel} from "../../models/data-configuration-model"

interface ILegendProps {
  dataConfiguration: IDataConfigurationModel
  legendAttrID: string
  divElt: HTMLDivElement | null
  onDropAttribute: (place: GraphPlace, dataSet: IDataSet, attrId: string) => void
  onRemoveAttribute: (place: GraphPlace, attrId: string) => void
  onTreatAttributeAs: (place: GraphPlace, attrId: string, treatAs: AttributeType) => void
}

export const Legend = function Legend({ dataConfiguration,
                                        legendAttrID, divElt,
                                        onDropAttribute, onTreatAttributeAs, onRemoveAttribute
                                      }: ILegendProps) {
  const isDropAllowed = dataConfiguration?.placeCanAcceptAttributeIDDrop ?? (() => true),
    layout = useDataDisplayLayout(),
    attrType = dataConfiguration?.dataset?.attrFromID(legendAttrID ?? '')?.type,
    legendRef = useRef() as React.RefObject<SVGSVGElement>,
    instanceId = useInstanceIdContext(),
    droppableId = `${instanceId}-legend-area-drop`,
    role = 'legend' as GraphAttrRole,
    hintString = useDropHintString({role})

  const handleIsActive = (active: Active) => {
    const {dataSet, attributeId: droppedAttrId} = getDragAttributeInfo(active) || {}
    if (isDropAllowed) {
      return isDropAllowed('legend', dataSet, droppedAttrId)
    } else {
      return !!droppedAttrId
    }
  }

  useDropHandler(droppableId, active => {
    const {dataSet, attributeId: dragAttributeID} = getDragAttributeInfo(active) || {}
    dataSet && dragAttributeID && isDropAllowed('legend', dataSet, dragAttributeID) &&
    onDropAttribute('legend', dataSet, dragAttributeID)
  })

  const { contentHeight, computedBounds: { legend: legendBounds } } = layout,
    transform = `translate(${legendBounds?.left ?? 0}, ${contentHeight})`

  /**
   * Because the interior of the graph (the plot) can be transparent, we have to put a background behind
   * axes and legends.
   */
  useEffect(function installBackground() {
    return autorun(() => {
      const { tileWidth, tileHeight } = layout
      const legendHeight = layout.getDesiredExtent('legend')
      const legendTop = tileHeight - legendHeight
      if (legendRef) {
        select(legendRef.current)
          .selectAll<SVGRectElement, number>('.legend-background')
          .attr('transform', `translate(0, ${legendTop})`)
          .attr('width', tileWidth)
          .attr('height', legendHeight)
      }
    })
  }, [layout, legendRef])

  return legendAttrID ? (
    <>
      <svg ref={legendRef} className='legend-component' data-testid='legend-component'>
        <rect className='legend-background'/>
        <AttributeLabel
          place={'legend'}
          onChangeAttribute={onDropAttribute}
          onRemoveAttribute={onRemoveAttribute}
          onTreatAttributeAs={onTreatAttributeAs}
        />
        {
          attrType === 'categorical' ? <CategoricalLegend transform={transform}/>
            : attrType === 'numeric' ? <NumericLegend legendAttrID={legendAttrID}/> : null
        }
      </svg>
      <DroppableSvg
        className="droppable-legend"
        portal={divElt}
        target={legendRef.current}
        dropId={droppableId}
        onIsActive={handleIsActive}
        hintString={hintString}
      />
    </>

  ) : null
}
Legend.displayName = "Legend"
