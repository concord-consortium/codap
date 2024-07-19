import { Menu, MenuButton, VisuallyHidden } from "@chakra-ui/react"
import { clsx } from "clsx"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { kIndexColumnKey, kInputRowKey, TColSpanArgs, TColumn, TRenderCellProps } from "./case-table-types"
import { ColumnHeader } from "./column-header"
import { IndexMenuList } from "./index-menu-list"
import { useRdgCellFocus } from "./use-rdg-cell-focus"
import { useCaseMetadata } from "../../hooks/use-case-metadata"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { ICollectionModel } from "../../models/data/collection"
import { IDataSet } from "../../models/data/data-set"
import { symIndex, symParent } from "../../models/data/data-set-types"
import { getCollectionAttrs } from "../../models/data/data-set-utils"
import { ISharedCaseMetadata } from "../../models/shared/shared-case-metadata"
import { t } from "../../utilities/translation/translate"
import { getPreventReorg } from "../web-view/collaborator-utils"

import DragIndicator from "../../assets/icons/drag-indicator.svg"

interface IColSpanProps {
  data?: IDataSet
  metadata?: ISharedCaseMetadata
  collection: ICollectionModel
}
function indexColumnSpan(args: TColSpanArgs, { data, metadata, collection }: IColSpanProps) {
  // collapsed rows span the entire table
  if (args.type === "ROW") {
    const row = args.row
    const parentId = row[symParent]
    if (parentId && metadata?.isCollapsed(parentId)) {
      const visibleAttrCount = getCollectionAttrs(collection, data)
                                .reduce((prev, attr) => metadata?.isHidden(attr.id) ? prev : ++prev, 0)
      return visibleAttrCount + 1
    }
  }
}

export const useIndexColumn = () => {
  const caseMetadata = useCaseMetadata()
  const data = useDataSetContext()
  const collectionId = useCollectionContext()
  const collection = data?.getCollection(collectionId)
  const disableMenu = data && getPreventReorg(data, collectionId)
  // renderer
  const RenderIndexCell = useCallback(({ row }: TRenderCellProps) => {
    const { __id__, [symIndex]: _index, [symParent]: parentId } = row
    const index = _index != null ? _index : data?.caseIndexFromID(__id__)
    const collapsedCases = (data && parentId && caseMetadata?.isCollapsed(parentId))
                            ? data.caseGroupMap.get(parentId)?.childCaseIds?.length ??
                              data.caseGroupMap.get(parentId)?.childItemIds.length
                            : undefined
    return (
      <IndexCell caseId={__id__} disableMenu={disableMenu} index={index} collapsedCases={collapsedCases} />
    )
  }, [caseMetadata, data, disableMenu])
  const indexColumn = useRef<TColumn | undefined>()

  useEffect(() => {
    // rebuild index column definition when necessary
    indexColumn.current = {
      key: kIndexColumnKey,
      name: t("DG.CaseTable.indexColumnName"),
      minWidth: 52,
      width: 52,
      headerCellClass: "codap-column-header index",
      renderHeaderCell: ColumnHeader,
      cellClass: "codap-index-cell",
      colSpan(args: TColSpanArgs) {
        return collection ? indexColumnSpan(args, { data, metadata: caseMetadata, collection }) : undefined
      },
      renderCell: RenderIndexCell
    }
  }, [caseMetadata, collection, data, RenderIndexCell])

  return indexColumn.current
}

interface ICellProps {
  caseId: string
  disableMenu?: boolean
  index?: number
  collapsedCases?: number
  onClick?: (caseId: string, evt: React.MouseEvent) => void
}
export function IndexCell({ caseId, disableMenu, index, collapsedCases, onClick }: ICellProps) {
  const [menuButton, setMenuButton] = useState<HTMLButtonElement | null>(null)
  const cellElt: HTMLDivElement | null = menuButton?.closest(".rdg-cell") ?? null
  // Find the parent CODAP component to display the index menu above the grid
  const portalElt: HTMLDivElement | null = menuButton?.closest(".codap-component") ?? null

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
  useRdgCellFocus(cellElt, menuButton)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (["ArrowDown", "ArrowUp"].includes(e.key)) {
      // Prevent Chakra from bringing up the menu in favor of cell navigation
      e.preventDefault()
    }
  }

  const isInputRow = caseId === kInputRowKey
  const classes = clsx("codap-index-content", { collapsed: collapsedCases != null, "input-row": isInputRow })
  const casesStr = t(collapsedCases === 1 ? "DG.DataContext.singleCaseName" : "DG.DataContext.pluralCaseName")
  if (isInputRow) {
    return (
      <div className={classes}>
        <DragIndicator />
      </div>
    )
  } else {
    const cellContents = collapsedCases != null
      ? `${collapsedCases} ${casesStr}`
      : index != null ? `${index + 1}` : ""
    if (disableMenu) {
      return (
        <div className={classes}>
          {cellContents}
        </div>
      )
    } else {
      return (
        <Menu isLazy>
          <MenuButton ref={setMenuButtonRef} className={classes} data-testid="codap-index-content-button"
                      onKeyDown={handleKeyDown} aria-describedby="sr-index-menu-instructions">
            {cellContents}
          </MenuButton>
          <VisuallyHidden id="sr-index-menu-instructions">
            Press Enter to open the menu.
          </VisuallyHidden>
          {portalElt && createPortal(<IndexMenuList caseId={caseId} index={index}/>, portalElt)}
        </Menu>
      )
    }
  }
}
