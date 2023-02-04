import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React from "react"
import { IDocumentContentModel } from "../models/document/document-content"
import { IMosaicTileNode, IMosaicTileRow } from "../models/document/mosaic-tile-row"
import { getTileComponentInfo } from "../models/tiles/tile-component-info"
import { ITileModel } from "../models/tiles/tile-model"
import { CodapComponent } from "./codap-component"

import "./mosaic-tile-row.scss"

/*
 * MosaicTileRowComponent
 */
interface IMosaicTileRowProps {
  row: IMosaicTileRow
  content?: IDocumentContentModel
  getTile: (tileId: string) => ITileModel | undefined
}
export const MosaicTileRowComponent = observer(({ content, row, getTile }: IMosaicTileRowProps) => {
  return (
    <div className="mosaic-tile-row">
      {row &&
        <MosaicNodeOrTileComponent content={content} row={row} nodeOrTileId={row.root} getTile={getTile} />}
    </div>
  )
})

/*
 * styleFromExtent
 */
interface IStyleFromExtent { direction?: "row" | "column", pctExtent?: number }
function styleFromExtent({ direction, pctExtent }: IStyleFromExtent): React.CSSProperties | undefined {
  if (pctExtent == null) return

  const flexStyle = { flex: `0 0 ${pctExtent}%` }
  if (direction == null) return flexStyle

  return direction === "column"
      ? { ...flexStyle, minHeight: `${pctExtent}%`, maxHeight: `${pctExtent}%` }
      : { ...flexStyle, minWidth: `${pctExtent}%`, maxWidth: `${pctExtent}%` }
}

/*
 * MosaicNodeOrTileComponent
 */
interface IExtentProps {
  direction?: "row" | "column"
  pctExtent?: number
}
interface INodeOrTileProps extends IExtentProps {
  row: IMosaicTileRow
  nodeOrTileId: string
  content?: IDocumentContentModel
  getTile: (tileId: string) => ITileModel | undefined
}
export const MosaicNodeOrTileComponent = observer(({ nodeOrTileId, ...others }: INodeOrTileProps) => {
  const { row, getTile } = others
  const node = row.getNode(nodeOrTileId)
  const tile = node ? undefined : getTile(nodeOrTileId)

  return (
    <>
      {node && <MosaicNodeComponent node={node} {...others} />}
      {tile && <MosaicTileComponent tile={tile} {...others} />}
    </>
  )
})

/*
 * MosaicNodeComponent
 */
interface IMosaicNodeProps extends IExtentProps {
  row: IMosaicTileRow
  node: IMosaicTileNode
  getTile: (tileId: string) => ITileModel | undefined
}
export const MosaicNodeComponent = observer(({ node, direction, pctExtent, ...others }: IMosaicNodeProps) => {
  const style = styleFromExtent({ direction, pctExtent })
  const node1Props = { direction: node.directionTyped, pctExtent: 100 * node.percent }
  const node2Props = { direction: node.directionTyped, pctExtent: 100 * (1 - node.percent) }
  return (
    <div className={clsx("mosaic-tile-node", node.direction)} style={style}>
      <MosaicNodeOrTileComponent nodeOrTileId={node.first} {...node1Props} {...others} />
      <MosaicNodeOrTileComponent nodeOrTileId={node.second} {...node2Props} {...others} />
    </div>
  )
})

/*
 * MosaicTileComponent
 */
interface IMosaicTileProps extends IExtentProps {
  tile: ITileModel
  content?: IDocumentContentModel
}
export const MosaicTileComponent = observer(({ content, tile, direction, pctExtent }: IMosaicTileProps) => {
  const style = styleFromExtent({ direction, pctExtent })
  const tileType = tile.content.type
  const info = getTileComponentInfo(tileType)
  const handleCloseTile = (tileId: string) => {
    content?.deleteTile(tileId)
  }

  return (
    <div className="mosaic-tile-component" style={style} >
      {tile && info &&
        <CodapComponent tile={tile} TitleBar={info.TitleBar} Component={info.Component}
            tileEltClass={info.tileEltClass} onCloseTile={handleCloseTile}/>
      }
    </div>
  )
})
