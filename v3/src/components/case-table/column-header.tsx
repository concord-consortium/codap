import React, { useState } from "react"
import { THeaderRendererProps } from "./case-table-types"
import { ColumnHeaderDivider } from "./column-header-divider"

export const ColumnHeader = ({ column }: Pick<THeaderRendererProps, "column">) => {

  const [cellElt, setCellElt] = useState<HTMLElement | null>(null)

  const setNodeRef = (elt: HTMLDivElement | null) => {
    setCellElt(elt)
  }

  return (
    <div className="codap-column-header-content" ref={setNodeRef}>
      {column?.name}
      {column &&
        <ColumnHeaderDivider key={column?.key} columnKey={column?.key} cellElt={cellElt}/>}
    </div>
  )
}
