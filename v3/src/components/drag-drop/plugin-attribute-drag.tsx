import React from "react"
import { useDraggableAttribute } from "../../hooks/use-drag-drop"
import { uiState } from "../../models/ui-state"
import { getDataSetFromId } from "../../models/shared/shared-data-utils"
import { appState } from "../../models/app-state"

import "./plugin-attribute-drag.scss"

export function PluginAttributeDrag() {
  const dataSet = getDataSetFromId(appState.document, uiState.draggingDatasetId)
  const { attributes, listeners, setNodeRef } = useDraggableAttribute({
    attributeId: uiState.draggingAttributeId,
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
}
