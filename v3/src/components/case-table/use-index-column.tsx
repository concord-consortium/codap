import { Menu, MenuButton, VisuallyHidden } from "@chakra-ui/react"
import { clsx } from "clsx"
import { reaction } from "mobx"
import React, { useCallback, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { kIndexColumnKey, TColumn, TFormatterProps, TRow } from "./case-table-types"
import { ColumnHeader } from "./column-header"
import { IndexMenuList } from "./index-menu-list"
import { useRdgCellFocus } from "./use-rdg-cell-focus"
import { useCaseMetadata } from "../../hooks/use-case-metadata"
import { useCollectionContext, useParentCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { IAttribute } from "../../models/data/attribute"
import { symIndex, symParent } from "../../models/data/data-set-types"
import { getCollectionAttrs } from "../../models/data/data-set-utils"
import t from "../../utilities/translation/translate"

export const useIndexColumn = () => {
  const caseMetadata = useCaseMetadata()
  const data = useDataSetContext()
  const parentCollection = useParentCollectionContext()
  const collection = useCollectionContext()
  // formatter/renderer
  const formatter = useCallback(({ row: { __id__, [symIndex]: _index, [symParent]: parentId } }: TFormatterProps) => {
    const index = _index != null ? _index : data?.caseIndexFromID(__id__)
    const collapsedCases = (data && parentId && caseMetadata?.isCollapsed(parentId))
                            ? data.pseudoCaseMap[parentId]?.childPseudoCaseIds?.length ??
                              data.pseudoCaseMap[parentId]?.childCaseIds.length
                            : undefined
    return (
      <IndexCell caseId={__id__} index={index} collapsedCases={collapsedCases} />
    )
  }, [caseMetadata, data])
  const [indexColumn, setIndexColumn] = useState<TColumn | undefined>()

  useEffect(() => {
    // rebuild index column definition when referenced properties change
    const disposer = reaction(
      () => {
        const attrs: IAttribute[] = getCollectionAttrs(collection, data)
        const visible: IAttribute[] = attrs.filter(attr => attr && !caseMetadata?.isHidden(attr.id))
        const parentMetadata = caseMetadata && parentCollection
                                ? caseMetadata?.collections.get(parentCollection.id)
                                : undefined
        const collapsed = new Set<string>()
        data?.collectionGroups.forEach(collectionGroup => {
          if (collectionGroup.collection.id === parentCollection?.id) {
            parentMetadata?.collapsed.forEach((value, key) => {
              const pCase = collectionGroup.groupsMap[key]?.pseudoCase
              if (pCase) collapsed.add(pCase.__id__)
            })
          }
        })
        return { visible, collapsed }
      },
      ({ visible, collapsed }) => {
        setIndexColumn({
          key: kIndexColumnKey,
          name: t("DG.CaseTable.indexColumnName"),
          minWidth: 52,
          width: 52,
          headerCellClass: "codap-column-header index",
          headerRenderer: ColumnHeader,
          cellClass: "codap-index-cell",
          // TODO: better type
          colSpan(args: any) {
            // collapsed rows span the entire table
            if (args.type === "ROW") {
              const row: TRow = args.row
              const parentId = row[symParent]
              if (parentId && collapsed.has(parentId)) {
                return visible.length + 1
              }
            }
          },
          formatter
        })
      },
      { fireImmediately: true }
    )
    return disposer
  }, [caseMetadata, collection, data, data?.collectionGroups, data?.ungroupedAttributes, formatter, parentCollection])

  return indexColumn
}

interface ICellProps {
  caseId: string
  index?: number
  collapsedCases?: number
  onClick?: (caseId: string, evt: React.MouseEvent) => void
}
export const IndexCell = ({ caseId, index, collapsedCases, onClick }: ICellProps) => {
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

  const classes = clsx("codap-index-content", { collapsed: collapsedCases != null })
  const casesStr = t(collapsedCases === 1 ? "DG.DataContext.singleCaseName" : "DG.DataContext.pluralCaseName")
  return (
    <Menu isLazy>
      <MenuButton ref={setMenuButtonRef} className={classes} data-testid="codap-index-content-button"
                  onKeyDown={handleKeyDown} aria-describedby="sr-index-menu-instructions">
        {collapsedCases != null
          ? `${collapsedCases} ${casesStr}`
          : index != null ? `${index + 1}` : ""}
      </MenuButton>
      <VisuallyHidden id="sr-index-menu-instructions">
        Press Enter to open the menu.
      </VisuallyHidden>
      {portalElt && createPortal(<IndexMenuList caseId={caseId} index={index}/>, portalElt)}
    </Menu>
  )
}
