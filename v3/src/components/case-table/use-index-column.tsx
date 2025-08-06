import { Menu, MenuButton, VisuallyHidden } from "@chakra-ui/react"
import { useDndContext } from "@dnd-kit/core"
import { clsx } from "clsx"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { useDataSet } from "../../hooks/use-data-set"
import { DEBUG_CASE_IDS } from "../../lib/debug"
import { ICollectionModel } from "../../models/data/collection"
import { IDataSet } from "../../models/data/data-set"
import { symIndex, symParent } from "../../models/data/data-set-types"
import {
  getCaseNameForCount, getCollectionAttrs, selectCases, setSelectedCases
} from "../../models/data/data-set-utils"
import { IDataSetMetadata } from "../../models/shared/data-set-metadata"
import { preventCollectionReorg } from "../../utilities/plugin-utils"
import { t } from "../../utilities/translation/translate"
import { kIndexColumnKey } from "../case-tile-common/case-tile-types"
import { IndexMenuList } from "../case-tile-common/index-menu-list"
import { useParentChildFocusRedirect } from "../case-tile-common/use-parent-child-focus-redirect"
import { kIndexColumnWidth, kInputRowKey, TColSpanArgs, TColumn, TRenderCellProps } from "./case-table-types"
import { IUseDraggableRow, useDraggableRow } from "./case-table-drag-drop"
import { ColumnHeader } from "./column-header"
import { RowDivider } from "./row-divider"

import DragIndicator from "../../assets/icons/drag-indicator.svg"

interface IColSpanProps {
  data?: IDataSet
  metadata?: IDataSetMetadata
  collection: ICollectionModel
}
function indexColumnSpan(args: TColSpanArgs, { data, metadata, collection }: IColSpanProps) {
  // collapsed rows span the entire table
  if (args.type === "ROW") {
    const row = args.row
    const parentId = row[symParent]
    if (parentId && metadata?.isCaseOrAncestorCollapsed(parentId)) {
      const visibleAttrCount = getCollectionAttrs(collection, data)
                                .reduce((prev, attr) => metadata?.isHidden(attr.id) ? prev : ++prev, 0)
      return visibleAttrCount + 1
    }
  }
}

export const useIndexColumn = () => {
  const { data, metadata } = useDataSet()
  const collectionId = useCollectionContext()
  const collection = data?.getCollection(collectionId)
  const disableMenu = preventCollectionReorg(data, collectionId)

  const handlePointerDown = (e: React.PointerEvent | React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  // renderer
  const RenderIndexCell = useCallback(({ row }: TRenderCellProps) => {
    const { __id__, [symIndex]: _index, [symParent]: parentId } = row
    const index = __id__ === kInputRowKey
                    ? -1
                    : _index != null ? _index : data?.getItemIndex(__id__)
    const collapsedAncestorId = metadata?.getCollapsedAncestor(__id__)
    const collapsedCases = data && collapsedAncestorId
                            ? metadata?.getDescendantCaseIds(collapsedAncestorId, __id__) ?? []
                            : []
    const collapsedCaseCount = collapsedCases.length

    function handleClick(e: React.MouseEvent) {
      if (parentId && collapsedCaseCount) {
        const wereSelected = collapsedCases.every(caseId => data?.isCaseSelected(caseId))
        const extend = e.metaKey || e.shiftKey
        if (extend) {
          selectCases([parentId], data, !wereSelected)
        }
        else if (!wereSelected) {
          setSelectedCases([parentId], data)
        }
        e.stopPropagation()
      }
    }

    return (
      <div className="codap-index-cell-wrapper">
        {/* divider above the first row */}
        {index === 0 && <RowDivider rowId={__id__} before={true}/>}
        <IndexCell caseId={__id__} disableMenu={disableMenu} index={index}
        collapsedCases={collapsedCaseCount} onClick={handleClick} onPointerDown={handlePointerDown}/>
        <RowDivider rowId={__id__}/>
      </div>
    )
  }, [metadata, data, disableMenu])
  const indexColumn = useRef<TColumn | undefined>()

  useEffect(() => {
    // rebuild index column definition when necessary
    indexColumn.current = {
      key: kIndexColumnKey,
      name: t("DG.CaseTable.indexColumnName"),
      minWidth: kIndexColumnWidth,
      width: kIndexColumnWidth,
      headerCellClass: "codap-column-header index",
      renderHeaderCell: ColumnHeader,
      cellClass: row => clsx("codap-index-cell", `rowId-${row.__id__}`),
      colSpan(args: TColSpanArgs) {
        return collection ? indexColumnSpan(args, { data, metadata, collection }) : undefined
      },
      renderCell: RenderIndexCell
    }
  }, [metadata, collection, data, RenderIndexCell])

  return indexColumn.current
}

interface IIndexCellProps {
  caseId: string
  disableMenu?: boolean
  index?: number
  collapsedCases?: number
  onClick?: (evt: React.MouseEvent) => void
  onPointerDown?: (evt: React.PointerEvent | React.MouseEvent) => void
}
export function IndexCell({ caseId, disableMenu, index, collapsedCases, onClick, onPointerDown }: IIndexCellProps) {
  const { data, metadata } = useDataSet()
  const collectionId = useCollectionContext()
  const collection = data?.getCollection(collectionId)
  const [menuButton, setMenuButton] = useState<HTMLButtonElement | null>(null)
  const cellElt: HTMLDivElement | null = menuButton?.closest(".rdg-cell") ?? null
  // Find the parent CODAP component to display the index menu above the grid
  const portalElt: HTMLDivElement | null = menuButton?.closest(".codap-component") ?? null
  const draggableOptions: IUseDraggableRow = {
    prefix: "row",
    rowId: caseId,
    rowIdx: index ?? 0,
    collectionId: useCollectionContext(),
    isInputRow: caseId === kInputRowKey
  }
  const {attributes, listeners, setNodeRef: setDragNodeRef} = useDraggableRow(draggableOptions)
  const { active } = useDndContext()
  function setMenuButtonRef(elt: HTMLButtonElement | null) {
    setMenuButton(elt)
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
    if (cellElt?.getAttribute("role") === "gridcell") {
      cellElt?.setAttribute("role", "rowheader")
    }
    // no dependencies means we'll check/fix it after every render
  })

  // focus our content when the cell is focused
  useParentChildFocusRedirect(cellElt, menuButton)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (["ArrowDown", "ArrowUp"].includes(e.key)) {
      // Prevent Chakra from bringing up the menu in favor of cell navigation
      e.preventDefault()
    }
  }

  const isInputRow = caseId === kInputRowKey
  const classes = clsx("codap-index-content",
                        { collapsed: !!collapsedCases, "input-row": isInputRow, "dragging": active })

  // input row
  const renderInputRowIndexColumnCell = () => {
    return (
      <div className={classes} ref={setDragNodeRef} {...attributes} {...listeners}
            data-testid="codap-index-content-button">
        <MenuButton ref={setMenuButtonRef} className={classes} data-testid="codap-index-content-button"
            onKeyDown={handleKeyDown} aria-describedby="sr-index-menu-instructions">
          <div className={classes}
              onPointerDown={onPointerDown} onMouseDown={onPointerDown}>
            <DragIndicator />
          </div>
        </MenuButton>
      </div>
    )
  }

  // cell contents
  const caseIdStr = DEBUG_CASE_IDS ? `: ${caseId}` : ""
  const cellContents = collapsedCases
                        ? `${collapsedCases} ${getCaseNameForCount(metadata, collection, collapsedCases)}`
                        : index != null ? `${index + 1}${caseIdStr}` : ""
  const handleClick = collapsedCases ? onClick : undefined

  // collapsed row or normal row with no menu
  if (collapsedCases || disableMenu) {
    return (
      <div className={classes} data-testid="codap-index-content-button" onClick={handleClick}>
        {cellContents}
      </div>
    )
  }

  // normal index row
  return (
    <Menu isLazy>
      {isInputRow
        ? renderInputRowIndexColumnCell()
        : <MenuButton ref={setMenuButtonRef} className={classes} data-testid="codap-index-content-button"
                      onClick={handleClick} onKeyDown={handleKeyDown} aria-describedby="sr-index-menu-instructions">
            {cellContents}
          </MenuButton>
      }
      <VisuallyHidden id="sr-index-menu-instructions">
        Press Enter to open the menu.
      </VisuallyHidden>
      {portalElt && createPortal(<IndexMenuList caseId={caseId} index={index}/>, portalElt)}
    </Menu>
  )
}
