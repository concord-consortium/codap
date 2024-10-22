import { observer } from "mobx-react-lite"
import React from "react"
import { dataInteractiveState } from "../../data-interactive/data-interactive-state"
import { useDraggableAttribute } from "../../hooks/use-drag-drop"
import { getDataSetFromId } from "../../models/shared/shared-data-utils"
import { appState } from "../../models/app-state"

import "./plugin-attribute-drag.scss"

export const PluginAttributeDrag = observer(function PluginAttributeDrag() {
  const dataSet = getDataSetFromId(appState.document, dataInteractiveState.draggingDatasetId)
  const { attributes, listeners, setNodeRef } = useDraggableAttribute({
    attributeId: dataInteractiveState.draggingAttributeId,
    dataSet,
    prefix: "plugin"
  })
  return (
    <div
      id="plugin-attribute-drag"
      ref={setNodeRef}
      {...attributes}
      {...listeners}
    />
  )
})
