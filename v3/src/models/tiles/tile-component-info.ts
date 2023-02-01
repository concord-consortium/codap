import React, { SVGProps } from "react"
import { ITileBaseProps } from "../../components/tiles/tile-base-props"

export interface ITileComponentInfo {
  type: string;
  TitleBar: React.ComponentType<ITileBaseProps>;
  Component: React.ComponentType<ITileBaseProps>;
  tileEltClass: string;
  Icon?: React.FC<SVGProps<SVGSVGElement>>;
  /**
   * By default the tool tile wrapper TileComponent will handle the selection of the
   * the tile when it gets a mouse down or touch start.
   *
   * If the tool wants to manage its own selection by calling ui.setSelectedTile,
   * it should set tileHandlesOwnSelection to true. This will prevent TileComponent
   * from trying to set the selection.
   */
  tileHandlesOwnSelection?: boolean;
}

const gTileComponentInfoMap = new Map<string, ITileComponentInfo>()

export function registerTileComponentInfo(tileComponentInfo: ITileComponentInfo) {
  // toLowerCase() for legacy support of tool names
  gTileComponentInfoMap.set(tileComponentInfo.type.toLowerCase(), tileComponentInfo)
}

// Tool id, e.g. kDrawingTileType, kGeometryTileType, etc.
// undefined is supported so callers do not need to check the id before passing it in
export function getTileComponentInfo(type?: string) {
  // toLowerCase() for legacy support of tool names
  return type ? gTileComponentInfoMap.get(type.toLowerCase()) : undefined
}
