import { useDndContext } from "@dnd-kit/core"
import { observer } from "mobx-react-lite"
import { getTileComponentInfo } from "../models/tiles/tile-component-info"
import { uiState } from "../models/ui-state"
import { ITileBaseProps } from "./tiles/tile-base-props"

export const InspectorPanelWrapper = observer(function InspectorPanelWrapper({ tile, isMinimized }: ITileBaseProps) {
  const { hideInspector, InspectorPanel } = getTileComponentInfo(tile?.content.type) || {}
  const { active } = useDndContext()
  
  if (tile && hideInspector?.(tile)) return null

  const show = uiState.isFocusedTile(tile?.id) && !active && !isMinimized
  
  return InspectorPanel ? <InspectorPanel tile={tile} show={show} /> : null
})
