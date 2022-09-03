import React, { useCallback, useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { Menu, MenuButton, MenuItem, MenuList } from "@chakra-ui/react"
import { IDataSet } from "../../data-model/data-set"
import { kIndexColumnKey, TColumn, TFormatterProps } from "./case-table-types"
import { ColumnHeader } from "./column-header"

interface IHookProps {
  data?: IDataSet
}
export const useIndexColumn = ({ data }: IHookProps) => {
  // formatter/renderer
  const formatter = useCallback(({ row: { __id__ } }: TFormatterProps) => {
    const index = data?.caseIndexFromID(__id__)
    return (
      <IndexCell caseId={__id__} index={index} />
    )
  }, [data])

  // column definition
  const indexColumn: TColumn = useMemo(() => ({
    key: kIndexColumnKey,
    name: "index",
    minWidth: 52,
    width: 52,
    headerRenderer: ColumnHeader,
    cellClass: "codap-index-cell",
    formatter
  }), [formatter])

  return indexColumn
}

interface ICellProps {
  caseId: string
  index?: number
  onClick?: (caseId: string, evt: React.MouseEvent) => void
}
export const IndexCell = ({ caseId, index, onClick }: ICellProps) => {
  const [cellElt, setCellElt] = useState<HTMLElement | null>(null)
  const [codapComponentElt, setCodapComponentElt] = useState<HTMLElement | null>(null)
  const setNodeRef = (elt: HTMLButtonElement | null) => {
    setCellElt(elt)
  }

  /*
    To its credit, ReactDataGrid puts appropriate aria role tags on every cell in the grid.
    Unfortunately, in doing so, it assumes that all grid cells should have role "gridcell".
    Where the index cell is concerned, however, the "rowheader" role is more appropriate.
    At some point we could submit a PR to ReactDataGrid that implements a column option for
    specifying the aria role to be applied to cells in the column. In the meantime, however,
    we can fix it ourselves by post-processing the role attribute for our parent.
   */
  useEffect(() => {
    const parent = cellElt?.parentElement
    if (parent?.classList.contains("rdg-cell") && parent?.getAttribute("role") === "gridcell") {
      parent.setAttribute("role", "rowheader")
    }
    // no dependencies means we'll check/fix it after every render
  })

  // Find the parent CODAP component to display the index menu above the grid
  useEffect(() => {
    if (cellElt && !codapComponentElt) {
      let parent: HTMLElement | null
      for (parent = cellElt; parent; parent = parent.parentElement) {
        if (parent.classList.contains("codap-component")) {
          setCodapComponentElt(parent)
          break
        }
      }
    }
  }, [cellElt, codapComponentElt])

  const handleMoveDataRow = () => {
    alert("Move Data Row Here clicked")
  }

  const handleInsertCase = () => {
    alert("Insert Case clicked")
  }

  const handleInsertCases = () => {
    alert("Insert Cases clicked")
  }

  const handleDeleteCase = () => {
    alert("Delete Case clicked")
  }

  return (
    <Menu isLazy>
      <MenuButton ref={setNodeRef} className="codap-index-content" data-testid="codap-index-content">
        {index != null ? `${index + 1}` : ""}
      </MenuButton>
      {codapComponentElt && createPortal((
        <MenuList>
          <MenuItem onClick={handleMoveDataRow}>Move Data Entry Row Here</MenuItem>
          <MenuItem onClick={handleInsertCase}>Insert Case</MenuItem>
          <MenuItem onClick={handleInsertCases}>Insert Cases...</MenuItem>
          <MenuItem onClick={handleDeleteCase}>Delete Case</MenuItem>
        </MenuList>
      ), codapComponentElt)}
    </Menu>
  )
}
