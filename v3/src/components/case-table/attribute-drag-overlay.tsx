import React from "react"
import { TColumn } from "./case-table-types"
import { ColumnHeader } from "./column-header"

interface IProps {
  activeDragAttrId?: string
  column: TColumn
}
export const AttributeDragOverlay = ({ activeDragAttrId, column }: IProps) => {
  return (
    activeDragAttrId
      ? <div className="attribute-drag-overlay">
          <ColumnHeader {...{ column } as any} />
        </div>
      : null
  )
}
