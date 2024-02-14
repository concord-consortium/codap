import { Button, Select } from '@chakra-ui/react'
import { DragOverlay, useDndContext } from "@dnd-kit/core"
import { observer } from "mobx-react-lite"
import React, { useState } from "react"
import { IDataSummaryModel, isDataSummaryModel } from './data-summary-model'
import { registerTileCollisionDetection } from '../dnd-detect-collision'
import { IAttribute } from "../../models/data/attribute"
import { gDataBroker } from "../../models/data/data-broker"
import { IDataSet } from '../../models/data/data-set'
import { useDataSet } from '../../hooks/use-data-set'
import { DataSetContext, useDataSetContext } from "../../hooks/use-data-set-context"
import {
  getDragAttributeInfo, IUseDraggableAttribute, useDraggableAttribute, useTileDropOverlay, useTileDroppable
} from "../../hooks/use-drag-drop"
import { InstanceIdContext, useNextInstanceId } from '../../hooks/use-instance-id-context'
import { ITileBaseProps } from "../tiles/tile-base-props"
import { prf } from "../../utilities/profiler"
import { t } from "../../utilities/translation/translate"

import "./data-summary.scss"

const kSummaryIdBase = "summary"
registerTileCollisionDetection(kSummaryIdBase)

export const DataSummary = observer(function DataSummary({ tile }: ITileBaseProps) {
  const summaryModel: IDataSummaryModel | undefined =
          isDataSummaryModel(tile?.content) ? tile?.content : undefined

  const instanceId = useNextInstanceId(kSummaryIdBase)
  const { data } = useDataSet(summaryModel?.data, summaryModel?.metadata)

  const { active } = useDndContext()
  const isSummaryDrag = active && `${active.id}`.startsWith(kSummaryIdBase)
  const { dataSet, attributeId: dragAttributeID } = getDragAttributeInfo(active) || {}
  const dragAttribute = dragAttributeID ? dataSet?.attrFromID(dragAttributeID) : undefined

  // used to determine when a dragged attribute is over the summary component
  const { setNodeRef } = useTileDropOverlay(kSummaryIdBase)

  if (!isDataSummaryModel(summaryModel)) return null

  const handleDrop = (iDataSet: IDataSet, attributeId: string) => {
    summaryModel.inspect(iDataSet, attributeId)
  }

  const casesStr = t(data?.cases.length === 1 ? "DG.DataContext.singleCaseName" : "DG.DataContext.pluralCaseName")

  return (
    <InstanceIdContext.Provider value={instanceId}>
      <DataSetContext.Provider value={data}>
        <div ref={setNodeRef} className="data-summary">
          <p>
            {data
              ? t("V3.summary.parseResults", { vars: [data.name, data.cases.length, casesStr, data.selection.size] })
              : t("V3.summary.noData")}
          </p>
          <div className="data-attributes">
            <div className="data-attributes-title"><b>{t("V3.summary.attributes")}</b></div>
            {data?.attributes.map(attr => (
              <DraggableAttribute key={attr.id} data={data} attribute={attr} />
            ))}
          </div>
          {data && <DataSelectPopup />}
          {data && <SummaryDropTarget attributeId={summaryModel.inspectedAttrId} onDrop={handleDrop}/>}
          {data && <ProfilerButton />}
          <DragOverlay dropAnimation={null}>
            {data && isSummaryDrag && dragAttribute
              ? <OverlayAttribute data={data} attribute={dragAttribute} />
              : null}
          </DragOverlay>
        </div>
      </DataSetContext.Provider>
    </InstanceIdContext.Provider>
  )
})

const DataSelectPopup = () => {
  const data = useDataSetContext()
  const dataSetSummaries = gDataBroker?.summaries
  const renderOption = (name: string, id: string) => {
    return <option key={id} value={id}>{name}</option>
  }

  const handleDataSetSelection = (evt: React.ChangeEvent<HTMLSelectElement>) => {
    gDataBroker?.setSelectedDataSetId(evt.target.value)
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

interface IDraggableAttributeProps {
  data: IDataSet
  attribute: IAttribute
}
const DraggableAttribute = ({ data, attribute }: IDraggableAttributeProps) => {
  const draggableOptions: IUseDraggableAttribute = { prefix: "summary", dataSet: data, attributeId: attribute.id }
  const { attributes, listeners, setNodeRef } = useDraggableAttribute(draggableOptions)
  return (
    <div ref={setNodeRef} className="draggable-attribute" {...attributes} {...listeners}>
      {attribute.name}
    </div>
  )
}
const OverlayAttribute = ({ attribute }: IDraggableAttributeProps) => {
  return (attribute &&
    <div className={`draggable-attribute overlay`} >
      {attribute.name}
    </div>
  )
}

interface ISummaryDropTargetProps {
  attributeId?: string
  onDrop?: (dataSet: IDataSet, attributeId: string) => void
}
const SummaryDropTarget = ({ attributeId, onDrop }: ISummaryDropTargetProps) => {
  const data = useDataSetContext()
  const attribute = attributeId ? data?.attrFromID(attributeId) : undefined
  const { isOver, setNodeRef } = useTileDroppable("inspector", active => {
    const { dataSet, attributeId: dragAttributeID } = getDragAttributeInfo(active) || {}
    dataSet && dragAttributeID && onDrop?.(dataSet, dragAttributeID)
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
