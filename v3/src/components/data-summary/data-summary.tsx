import { Button, Select } from '@chakra-ui/react'
import { DragOverlay, useDndContext, useDroppable } from "@dnd-kit/core"
import { observer } from "mobx-react-lite"
import React, { useState } from "react"
import { IAttribute } from "../../models/data/attribute"
import { gDataBroker } from "../../models/data/data-broker"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import {
  getDragAttributeId, IUseDraggableAttribute, useDraggableAttribute, useDropHandler
} from "../../hooks/use-drag-drop"
import { useV2DocumentContext } from "../../hooks/use-v2-document-context"
import { ITileBaseProps } from "../tiles/tile-base-props"
import { prf } from "../../utilities/profiler"
import t from "../../utilities/translation/translate"

import "./data-summary.scss"

interface IProps extends ITileBaseProps {
}
export const DataSummary = observer((props: IProps) => {
  const data = useDataSetContext()
  const v2Document = useV2DocumentContext()

  const { active } = useDndContext()
  const isSummaryDrag = active && `${active.id}`.startsWith("summary")
  const dragAttributeID = getDragAttributeId(active)
  const dragAttribute = dragAttributeID ? data?.attrFromID(dragAttributeID) : undefined

  // used to determine when a dragged attribute is over the summary component
  const { setNodeRef } = useDroppable({ id: "summary-component-drop" })

  const [selectedAttribute, setSelectedAttribute] = useState<IAttribute | undefined>()

  const handleDrop = (attributeId: string) => {
    setSelectedAttribute(data?.attrFromID(attributeId))
  }

  const handleDataSetSelection = (evt: React.ChangeEvent<HTMLSelectElement>) => {
    gDataBroker?.setSelectedDataSetId(evt.target.value)
  }

  const DataSelectPopup = () => {
    const dataSetSummaries = gDataBroker?.summaries
    const renderOption = (name: string, id: string) => {
      return <option key={name} value={id}>{name}</option>
    }

    if (dataSetSummaries) {
      return (
        <Select onChange={handleDataSetSelection} value={data?.id}>
          { dataSetSummaries?.map(summary => {
              return renderOption(summary.name || `DataSet ${summary.id}`, summary.id)
            })
          }
        </Select>
      )
    }

    return null
  }

  const componentTypes = v2Document?.components.map(component => component.type)
  const componentList = componentTypes?.join(", ")
  const casesStr = t(data?.cases.length === 1 ? "DG.DataContext.singleCaseName" : "DG.DataContext.pluralCaseName")

  return (
    <div ref={setNodeRef} className="data-summary">
      <p>
        {data
          ? t("V3.summary.parseResults", { vars: [data.name, data.cases.length, casesStr, data.selection.size] })
          : t("V3.summary.noData")}
      </p>
      {componentList &&
        <div className="data-components">
          <div className="data-components-title"><b>Components</b></div>
          <p>{componentList}</p>
        </div>
      }
      <div className="data-attributes">
        <div className="data-attributes-title"><b>{t("V3.summary.attributes")}</b></div>
        {data?.attributes.map(attr => (
          <DraggableAttribute key={attr.id} attribute={attr} />
        ))}
      </div>
      {data && <DataSelectPopup />}
      {data && <SummaryDropTarget attribute={selectedAttribute} onDrop={handleDrop}/>}
      {data && <ProfilerButton />}
      <DragOverlay dropAnimation={null}>
        {data && isSummaryDrag && dragAttribute
          ? <OverlayAttribute attribute={dragAttribute} />
          : null}
      </DragOverlay>
    </div>
  )
})

interface IDraggableAttributeProps {
  attribute: IAttribute
}
const DraggableAttribute = ({ attribute }: IDraggableAttributeProps) => {
  const draggableOptions: IUseDraggableAttribute = { prefix: "summary", attributeId: attribute.id }
  const { attributes, listeners, setNodeRef } = useDraggableAttribute(draggableOptions)
  return (
    <div ref={setNodeRef} className="draggable-attribute" {...attributes} {...listeners}>
      {attribute.name}
    </div>
  )
}
const OverlayAttribute = ({ attribute }: IDraggableAttributeProps) => {
  return (
    <div className={`draggable-attribute overlay`} >
      {attribute.name}
    </div>
  )
}

interface ISummaryDropTargetProps {
  attribute?: IAttribute
  onDrop?: (attributeId: string) => void
}
const SummaryDropTarget = ({ attribute, onDrop }: ISummaryDropTargetProps) => {
  const droppableId = "summary-inspector-drop"
  const { isOver, setNodeRef } = useDroppable({ id: droppableId })
  useDropHandler(droppableId, active => {
    const dragAttributeID = getDragAttributeId(active)
    dragAttributeID && onDrop?.(dragAttributeID)
  })
  return (
    <>
      <div ref={setNodeRef} className={`summary-inspector-drop ${isOver ? "over" : ""}`}>
        {t("V3.summary.attributeInspector")}
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
      {isProfiling ? t("V3.summary.stopProfiling") : t("V3.summary.startProfiling")}
    </Button>
  )
}
