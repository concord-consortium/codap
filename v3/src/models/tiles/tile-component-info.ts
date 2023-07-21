import React, { SVGProps } from "react"
import { ITileBaseProps, ITileInspectorPanelProps, ITileTitleBarProps } from "../../components/tiles/tile-base-props"
import { type IToolShelfButtonProps } from "../../components/tool-shelf/tool-shelf"

export interface IToolShelfOptions {
  position: number
  ButtonComponent?: React.FC<IToolShelfButtonProps>
  label: string
  hint: string
}

export interface ITileComponentInfo {
  type: string;
  TitleBar: React.ComponentType<ITileTitleBarProps>;
  Component: React.ComponentType<ITileBaseProps>;
  InspectorPanel?: React.ComponentType<ITileInspectorPanelProps>;
  tileEltClass: string;
  Icon?: React.FC<SVGProps<SVGSVGElement>>;
  shelf?: IToolShelfOptions;
  /**
   * By default the tool tile wrapper TileComponent will handle the selection of the
   * the tile when it gets a mouse down or touch start.
   *
   * If the tool wants to manage its own selection by calling ui.setSelectedTile,
   * it should set tileHandlesOwnSelection to true. This will prevent TileComponent
   * from trying to set the selection.
   */
  tileHandlesOwnSelection?: boolean;
  /**
   * Resizable components should have a default width and height. Plugins will specify their own height and width
   */
  defaultWidth?: number;
  defaultHeight?: number;
  /* Tool shelf specific properties */
  isFixedWidth?: boolean;
  isFixedHeight?: boolean;
}

const gTileComponentInfoMap = new Map<string, ITileComponentInfo>()

export function registerTileComponentInfo(tileComponentInfo: ITileComponentInfo) {
  // toLowerCase() for legacy support of tool names
  gTileComponentInfoMap.set(tileComponentInfo.type.toLowerCase(), tileComponentInfo)
}

export function getTileComponentKeys() {
  return Array.from(gTileComponentInfoMap.keys())
}

// Tool id, e.g. kDrawingTileType, kGeometryTileType, etc.
// undefined is supported so callers do not need to check the type before passing it in
export function getTileComponentInfo(type?: string) {
  // toLowerCase() for legacy support of tool names
  return type ? gTileComponentInfoMap.get(type.toLowerCase()) : undefined
}

export function getTileComponentIcon(type?: string) {
  return getTileComponentInfo(type)?.Icon
}
