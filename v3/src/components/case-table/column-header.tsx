import { Tooltip } from "@chakra-ui/react"
import React, { useState } from "react"
import { THeaderRendererProps } from "./case-table-types"
import { ColumnHeaderDivider } from "./column-header-divider"

export const ColumnHeader = ({ column }: Pick<THeaderRendererProps, "column">) => {

  const [cellElt, setCellElt] = useState<HTMLElement | null>(null)

  const setNodeRef = (elt: HTMLDivElement | null) => {
    setCellElt(elt)
  }
  const tooltipStyle = {backgroundColor: "#e6e6e6"}
  return (
    <Tooltip label={column?.name ||"attribute"} style={tooltipStyle} h="20px" fontSize="12px" color="black"
        openDelay={1000} placement="bottom" bottom="15px" left="15px">
      <div className="codap-column-header-content" ref={setNodeRef}>
        {column?.name}
        {column &&
          <ColumnHeaderDivider key={column?.key} columnKey={column?.key} cellElt={cellElt}/>}
      </div>
    </Tooltip>
  )
}
