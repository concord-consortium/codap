import { Button } from '@chakra-ui/react'
import { Active, DragOverlay, useDndContext, useDraggable, useDroppable } from "@dnd-kit/core"
import { observer } from "mobx-react-lite"
import React, { useState } from "react"
import { IAttribute } from "../data-model/attribute"
import { DataBroker } from "../data-model/data-broker"
import { prf } from "../utilities/profiler"

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

  const handleDrop = (attributeId: string) => {
    setSelectedAttribute(data?.attrFromID(attributeId))
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
      {data && <ProfilerButton />}
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
  onDrop?: (attributeId: string) => void
}
const SummaryDropTarget = ({ attribute, onDrop }: ISummaryDropTargetProps) => {
  const data: any = { accepts: ["attribute"], onDrop: (active: Active) => onDrop?.(active.data?.current?.attributeId)}
  const { isOver, setNodeRef } = useDroppable({ id: "summary-inspector-drop", data })
  return (
    <>
      <div ref={setNodeRef} className={`summary-inspector-drop ${isOver ? "over" : ""}`}>
        Attribute Inspector
      </div>
      {attribute &&
        <div className="summary-attribute-info">
          <p><b>{`${attribute.name}`}</b> is <i>{`${attribute.type}`}</i></p>
        </div>
      }
    </>
  )
}

const ProfilerButton = () => {
  const [isProfiling, setIsProfiling] = useState(prf.isProfiling)

  const handleClick = () => {
    if (prf.isProfiling) {
      prf.endProfiling()
      setIsProfiling(false)
      prf.report()
    }
    else {
      prf.clear()
      prf.beginProfiling()
      setIsProfiling(true)
    }
  }

  return (
    <Button className={`profiler-button`} onClick={handleClick} size="sm" >
      {isProfiling ? "Stop Profiling" : "Start Profiling"}
    </Button>
  )
}
