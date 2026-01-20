import { observer } from "mobx-react-lite"
import { dataInteractiveState } from "../../data-interactive/data-interactive-state"
import { useDraggableAttribute } from "../../hooks/use-drag-drop"
import { getDataSetFromId } from "../../models/shared/shared-data-utils"
import { appState } from "../../models/app-state"
import { kPluginAttributeDragId } from "./drag-drop-constants"

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
      id={kPluginAttributeDragId}
      ref={setNodeRef}
      {...attributes}
      {...listeners}
    />
  )
})
