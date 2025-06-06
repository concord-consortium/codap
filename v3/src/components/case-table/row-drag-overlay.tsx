import { DragOverlay, Modifier } from "@dnd-kit/core"
import React, { useMemo } from "react"
import DragIndicator from "../../assets/icons/drag-indicator.svg"
import { ICase } from "../../models/data/data-set-types"
import { kDefaultRowHeight, kInputRowKey } from "./case-table-types"
import { useCollectionTableModel } from "./use-collection-table-model"

import "./row-drag-overlay.scss"


interface IProps {
  rows: ICase[]
  width: number | null
}

export function RowDragOverlay ({ rows, width }: IProps) {
  const collectionTableModel = useCollectionTableModel()
  const row = rows.find(r => r.__id__ === kInputRowKey)
  const handleDropAnimation = () => {
    /**
     * If there has been no drop we would like to animate the overlay back to its original position.
     * Otherwise, we don't want to animate it at all.
     */
  }

  const restrictToVertical: Modifier = ({ transform }) => {
    return {
      ...transform,
      x: 0, // Restrict horizontal movement
    }
  }

  const height = collectionTableModel?.rowHeight ?? kDefaultRowHeight
  const style: React.CSSProperties = useMemo(() => ({ height, width: width ?? "100%" }), [height, width])
  return (
    <DragOverlay
      className="dnd-kit-drag-overlay"
      dropAnimation={handleDropAnimation}
      style={style}
      modifiers={[restrictToVertical]}
    >
      {row
        ? <div className="row-drag-overlay">
            <div className="codap-index-content input-row" >
              <DragIndicator />
            </div>
          </div>
        : null}
    </DragOverlay>
  )
}
