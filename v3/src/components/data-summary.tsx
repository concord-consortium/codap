import { Active, DragOverlay, useDndContext, useDraggable, useDroppable } from "@dnd-kit/core"
import { observer } from "mobx-react-lite"
import React, { useState } from "react"
import { IAttribute } from "../data-model/attribute"
import { DataBroker } from "../data-model/data-broker"

import "./data-summary.scss"

interface IProps {
  broker?: DataBroker;
}
export const DataSummary = observer(({ broker }: IProps) => {
  const data = broker?.last
  const { active } = useDndContext()

  // used to determine when a dragged attribute is over the summary component
  const { setNodeRef } = useDroppable({ id: "summary-component-drop", data: { accepts: ["attribute"] } })

  const [selectedAttribute, setSelectedAttribute] = useState<IAttribute | undefined>()

  const handleDrop = (attribute: IAttribute) => {
    setSelectedAttribute(attribute)
  }

  return (
    <div ref={setNodeRef} className="data-summary">
      <p>{data ? `Parsed "${data.name}" with ${data.cases.length} case(s) and attributes:` : "No data"}</p>
      <div className="data-attributes">
        {data?.attributes.map(attr => (
          <DraggableAttribute key={attr.id} attribute={attr} />
        ))}
      </div>
      {data && <SummaryDropTarget attribute={selectedAttribute} onDrop={handleDrop}/>}
      <DragOverlay dropAnimation={null}>
        {data && active
          ? <DraggableAttribute attribute={data?.attrFromID(`${active.id}`)} isOverlay={true}/>
          : null}
      </DragOverlay>
    </div>
  )
})

interface IDraggableAttributeProps {
  attribute: IAttribute
  isOverlay?: boolean;
}
const DraggableAttribute = ({ attribute, isOverlay = false }: IDraggableAttributeProps) => {
  const data: any = { type: "attribute", attributeId: attribute.id }
  const { attributes, listeners, setNodeRef } = useDraggable({ id: attribute.id, data })
  const overlayClass = isOverlay ? "overlay" : ""
  return (
    <div ref={setNodeRef} className={`draggable-attribute ${overlayClass}`} {...attributes} {...listeners}>
      {attribute.name}
    </div>
  )
}

interface ISummaryDropTargetProps {
  attribute?: IAttribute
  onDrop?: (attribute: IAttribute) => void
}
const SummaryDropTarget = ({ attribute, onDrop }: ISummaryDropTargetProps) => {
  const data: any = { accepts: ["attribute"], onDrop: (active: Active) => onDrop?.(active.data?.current?.attribute)}
  const { isOver, setNodeRef } = useDroppable({ id: "summary-inspector-drop", data })
  return (
    <>
      <div ref={setNodeRef} className={`summary-inspector-drop ${isOver ? "over" : ""}`}>
        Attribute Inspector
      </div>
      {attribute &&
        <div className="summary-attribute-info">
          <p><b>{`${attribute.name}`}</b> is a <i>{`${attribute.type}`}</i> attribute.</p>
        </div>
      }
    </>
  )
}
