import React, {memo, useMemo, useRef} from "react"
import {Active} from "@dnd-kit/core"
import {IGraphModel} from "../../models/graph-model"
import {useDataConfigurationContext} from "../../hooks/use-data-configuration-context"
import {Bounds, useGraphLayoutContext} from "../../models/graph-layout"
import {AttributeLabel} from "../attribute-label"
import {CategoricalLegend} from "./categorical-legend"
import {NumericLegend} from "./numeric-legend"
import {DroppableSvg} from "../droppable-svg"
import {useInstanceIdContext} from "../../../../hooks/use-instance-id-context"
import {getDragAttributeId, useDropHandler} from "../../../../hooks/use-drag-drop"
import {useDropHintString} from "../../../../hooks/use-drop-hint-string"
import {GraphAttrRole} from "../../models/data-configuration-model"

interface ILegendProps {
  graphModel: IGraphModel
  legendAttrID: string
  graphElt: HTMLDivElement | null
  onDropAttribute: (place: any, attrId: string) => void
}

export const Legend = memo(function Legend({legendAttrID, graphElt, onDropAttribute}: ILegendProps) {
  const dataConfiguration = useDataConfigurationContext(),
    layout = useGraphLayoutContext(),
    attrType = dataConfiguration?.dataset?.attrFromID(legendAttrID ?? '')?.type,
    legendLabelRef = useRef<SVGGElement>(null),
    legendRef = useRef() as React.RefObject<SVGSVGElement>,
    instanceId = useInstanceIdContext(),
    droppableId = `${instanceId}-legend-area-drop`,
    role = 'legend' as GraphAttrRole,
    hintString = useDropHintString({role}),
    attributeIDs = useMemo(() => legendAttrID ? [legendAttrID] : [], [legendAttrID])

  const handleIsActive = (active: Active) => !!getDragAttributeId(active)

  useDropHandler(droppableId, active => {
    const dragAttributeID = getDragAttributeId(active)
    dragAttributeID && onDropAttribute('legend', dragAttributeID)
  })

  const legendBounds = layout.computedBounds.get('legend') as Bounds,
    transform = `translate(${legendBounds.left}, ${legendBounds.top})`

  return legendAttrID ? (
    <>
      <svg ref={legendRef} className='legend'>
        <AttributeLabel
          ref={legendLabelRef}
          transform={transform}
          attributeIDs={attributeIDs}
          orientation='horizontal'
          attributeRole='legend'
        />
        {
          attrType === 'categorical' ? <CategoricalLegend transform={transform}
                                                          legendLabelRef={legendLabelRef}/> :
            attrType === 'numeric' ? <NumericLegend legendAttrID={legendAttrID}
                                                    transform={transform}/> : null
        }
      </svg>
      <DroppableSvg
        className="droppable-legend"
        portal={graphElt}
        target={legendRef.current}
        dropId={droppableId}
        onIsActive={handleIsActive}
        hintString={hintString}
      />
    </>

  ) : null
})
Legend.displayName = "Legend"
