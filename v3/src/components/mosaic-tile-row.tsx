import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, { useRef, useState } from "react"
import { IDocumentContentModel } from "../models/document/document-content"
import { IMosaicTileNode, IMosaicTileRow } from "../models/document/mosaic-tile-row"
import { getTileComponentInfo } from "../models/tiles/tile-component-info"
import { ITileModel } from "../models/tiles/tile-model"
import { tileModelHooks } from "../models/tiles/tile-model-hooks"
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

  const [resizingTileStyle, setResizingTileStyle] =
    useState<{width: number, height: number}>()
  const [resizingTileId, setResizingTileId] = useState("")
  // const [direction, setDirection] = useState("")
  const tempWidth = useRef<number>(0)
  const tempHeight = useRef<number>(0)

  const handleCloseTile = (tileId: string) => {
    content?.deleteTile(tileId)
  }

  const handleResizePointerDown = (e: React.PointerEvent, resizeDirection: string) => {
    const startWidth = tile.width || 0
    const startHeight = tile.height || 0
    const startPosition = {x: e.pageX, y: e.pageY}
    tempWidth.current = startWidth
    tempHeight.current = startHeight
    let resizingWidth = startWidth, resizingHeight = startHeight

    const onPointerMove = (pointerMoveEvent: { pageX: number; pageY: number }) => {
      setResizingTileId(tile.id)
      switch (resizeDirection) {
        case "bottom-right":
          resizingWidth = startWidth - startPosition.x + pointerMoveEvent.pageX
          resizingHeight = startHeight - startPosition.y + pointerMoveEvent.pageY
          break
        case "bottom-left":
          resizingWidth = startPosition.x - startWidth + pointerMoveEvent.pageX
          resizingHeight = startPosition.y - startHeight + pointerMoveEvent.pageY
          break
        case "left":
          resizingWidth = startPosition.x - startWidth + pointerMoveEvent.pageX
          break
        case "bottom":
          resizingHeight = startHeight - startPosition.y + pointerMoveEvent.pageY
          break
        case "right":
          resizingWidth = startWidth - startPosition.x + pointerMoveEvent.pageX
          break
      }
      setResizingTileStyle({width: resizingWidth, height: resizingHeight})
      tempWidth.current = resizingWidth
      tempHeight.current = resizingHeight
    }
    const onPointerUp = () => {
      document.body.removeEventListener("pointermove", onPointerMove)
      document.body.removeEventListener("pointerup", onPointerUp)
      tile.setWidth(tempWidth.current)
      tile.setHeight(tempHeight.current)
      setResizingTileId("")
    }

    document.body.addEventListener("pointermove", onPointerMove)
    document.body.addEventListener("pointerup", onPointerUp)
  }

  return (
    <div className="mosaic-tile-component" style={style} >
      {tile && info &&
        <CodapComponent tile={tile} TitleBar={info.TitleBar} Component={info.Component}
            tileEltClass={info.tileEltClass} onCloseTile={handleCloseTile}
            onBottomRightPointerDown={(e)=>handleResizePointerDown(e, "bottom-right")}
            onBottomLeftPointerDown={(e)=>handleResizePointerDown(e, "bottom-left")}
            onRightPointerDown={(e)=>handleResizePointerDown(e, "right")}
            onBottomPointerDown={(e)=>handleResizePointerDown(e, "bottom")}
            onLeftPointerDown={(e)=>handleResizePointerDown(e, "left")}
        />
      }
    </div>
  )
})
