import { useDndContext } from "@dnd-kit/core"
import { observer } from "mobx-react-lite"
import React from "react"
import { getTileComponentInfo } from "../models/tiles/tile-component-info"
import { uiState } from "../models/ui-state"
import { ITileBaseProps } from "./tiles/tile-base-props"

export const InspectorPanelWrapper = observer(function InspectorPanelWrapper({ tile, isMinimized }: ITileBaseProps) {
  const { InspectorPanel } = getTileComponentInfo(tile?.content.type) || {}
  const { active } = useDndContext()
  const show = uiState.isFocusedTile(tile?.id) && !active && !isMinimized
  return InspectorPanel ? <InspectorPanel tile={tile} show={show} /> : null
})
