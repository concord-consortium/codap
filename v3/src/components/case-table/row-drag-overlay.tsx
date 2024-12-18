import { DragOverlay, Modifier } from "@dnd-kit/core"

// Define TRows type
type TRows = {
  __id__: string;
  [key: string]: any;
}
import React from "react"
import { kInputRowKey } from "./case-table-types"
import DragIndicator from "../../assets/icons/drag-indicator.svg"

import "./row-drag-overlay.scss"
import styles from "./case-table-shared.scss"


interface IProps {
  rows: TRows[]
  gridWidth: number | null
}

export function RowDragOverlay ({ rows, gridWidth }: IProps) {
  const row = rows.find(r => r.__id__ === kInputRowKey)
  const handleDropAnimation = (/*params: any*/) => {
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

  const style = { height: styles.bodyRowHeight, width: gridWidth ?? "100%" }
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
