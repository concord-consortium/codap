import React, {MutableRefObject, useEffect} from "react"
import {observer} from "mobx-react-lite"
import {Active} from "@dnd-kit/core"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {useGraphModelContext} from "../models/graph-model"
import {useDataConfigurationContext} from "../hooks/use-data-configuration-context"
import {useGraphLayoutContext} from "../models/graph-layout"
import {getDragAttributeId, useDropHandler} from "../../../hooks/use-drag-drop"
import {AxisPlace} from "../../axis/axis-types"
import {Axis} from "../../axis/components/axis"
import {axisPlaceToAttrRole, GraphPlace, kGraphClassSelector} from "../graphing-types"
import {DroppableAxis} from "../../axis/components/droppable-axis"
import {AttributeLabel} from "./attribute-label"
import {useDropHintString} from "../../../hooks/use-drop-hint-string"
import {useAxisBoundsProvider} from "../../axis/hooks/use-axis-bounds"

interface IProps {
  place: AxisPlace
  enableAnimation: MutableRefObject<boolean>
  onDropAttribute?: (place: GraphPlace, attrId: string) => void
  onRemoveAttribute?: (place: GraphPlace, attrId: string) => void
  onTreatAttributeAs?: (place: GraphPlace, attrId: string, treatAs: AttributeType) => void
}

export const GraphAxis = observer(function GraphAxis(
  {place, enableAnimation, onDropAttribute, onRemoveAttribute, onTreatAttributeAs}: IProps) {
  const dataConfig = useDataConfigurationContext(),
    isDropAllowed = dataConfig?.graphPlaceCanAcceptAttributeIDDrop ?? (() => true),
    graphModel = useGraphModelContext(),
    instanceId = useInstanceIdContext(),
    layout = useGraphLayoutContext(),
    droppableId = `${instanceId}-${place}-axis-drop`,
    hintString = useDropHintString({role: axisPlaceToAttrRole[place]})

  const handleIsActive = (active: Active) => {
    const droppedAttrId = getDragAttributeId(active) ?? ''
    if (isDropAllowed) {
      return isDropAllowed(place, droppedAttrId)
    } else {
      return !!droppedAttrId
    }
  }

  const {parentElt, wrapperElt,
    setWrapperElt} = useAxisBoundsProvider(place, kGraphClassSelector)

  useDropHandler(droppableId, active => {
    const droppedAttrId = getDragAttributeId(active)
    droppedAttrId && isDropAllowed(place, droppedAttrId) && onDropAttribute?.(place, droppedAttrId)
  })

  useEffect(function cleanup () {
    return () => {
      layout.setDesiredExtent(place, 0)
    }
  }, [layout, place])

  return (
    <g className='axis-wrapper' ref={elt => setWrapperElt(elt)}>
      <Axis getAxisModel={() => graphModel.getAxis(place)}
            label={''}  // Remove
            enableAnimation={enableAnimation}
            showScatterPlotGridLines={graphModel.axisShouldShowGridLines(place)}
            centerCategoryLabels={graphModel.config.categoriesForAxisShouldBeCentered(place)}
      />
      <AttributeLabel
        place={place}
        onChangeAttribute={onDropAttribute}
        onRemoveAttribute={onRemoveAttribute}
        onTreatAttributeAs={onTreatAttributeAs}
      />
      {onDropAttribute &&
         <DroppableAxis
            place={`${place}`}
            dropId={droppableId}
            hintString={hintString}
            portal={parentElt}
            target={wrapperElt}
            onIsActive={handleIsActive}
         />}
    </g>
  )
})
