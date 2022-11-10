import React, {memo, useRef} from "react"
import { Active } from "@dnd-kit/core"
import {IGraphModel} from "../../models/graph-model"
import {useDataConfigurationContext} from "../../hooks/use-data-configuration-context"
import {AttributeLabel} from "../attribute-label"
import {CategoricalLegend} from "./categorical-legend"
import {NumericLegend} from "./numeric-legend"
import {DroppableSvg} from "../droppable-svg"
import {useInstanceIdContext} from "../../../../hooks/use-instance-id-context"
import {getDragAttributeId, IDropData} from "../../../../hooks/use-drag-drop"
import {useDropHintString} from "../../../../hooks/use-drop-hint-string"
import { GraphAttrRole } from "../../models/data-configuration-model"

interface ILegendProps {
  graphModel: IGraphModel
  transform: string
  legendAttrID:string
  graphElt: HTMLDivElement | null
  onDropAttribute: (place: any, attrId: string) => void
}

export const Legend = memo(function Legend({legendAttrID, transform, graphElt, onDropAttribute }: ILegendProps) {
  const dataConfiguration = useDataConfigurationContext(),
    attrType = dataConfiguration?.dataset?.attrFromID(legendAttrID ?? '')?.type,
    legendLabelRef = useRef<SVGGElement>(null),
    legendRef = useRef() as React.RefObject<SVGSVGElement>,
    instanceId = useInstanceIdContext(),
    droppableId = `${instanceId}-legend-area-drop`,
    role = 'legend' as GraphAttrRole,
    hintString = useDropHintString({role})

  const handleIsActive = (active: Active) => !!getDragAttributeId(active)

  const handleLegendDropAttribute = (active: Active) => {
    const dragAttributeID = getDragAttributeId(active)
    if (dragAttributeID) {
      onDropAttribute('legend', dragAttributeID)
    }
  }

  const data: IDropData = {accepts: ["attribute"], onDrop: handleLegendDropAttribute}

  return legendAttrID ? (
    <>
    <svg ref={legendRef} className='legend'>
      <AttributeLabel
        ref={legendLabelRef}
        transform = {transform}
        attributeIDs={legendAttrID ? [legendAttrID] : []}
        orientation='horizontal'
        attributeRole='legend'
      />
      {
        attrType === 'categorical' ? <CategoricalLegend transform = {transform}
                                                        legendLabelRef={legendLabelRef}/> :
          attrType === 'numeric' ? <NumericLegend legendAttrID={legendAttrID}
                                                  transform = {transform}/> : null
      }
    </svg>
      <DroppableSvg
        className="droppable-legend"
        portal={graphElt}
        target={legendRef.current}
        dropId={droppableId}
        dropData={data}
        onIsActive={handleIsActive}
        hintString={hintString}
      />
    </>

  ) : null
})
Legend.displayName = "Legend"
