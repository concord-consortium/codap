import { clsx } from "clsx"
import React, { useMemo, useRef } from "react"
import { useCaseMetadata } from "../../hooks/use-case-metadata"
import { useCollectionContext, useParentCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { getDragAttributeId, useTileDroppable } from "../../hooks/use-drag-drop"
import { measureText } from "../../hooks/use-measure-text"
import { getCssVariable } from "../../utilities/css-utils"
import t from "../../utilities/translation/translate"
import { kChildMostTableCollectionId } from "./case-table-types"

interface IProps {
  onDrop?: (attrId: string) => void
}
export function CollectionTableSpacer({ onDrop }: IProps) {
  const data = useDataSetContext()
  const caseMetadata = useCaseMetadata()
  const parentCollection = useParentCollectionContext()
  const collection = useCollectionContext()
  const collectionId = collection?.id || kChildMostTableCollectionId
  const parentMost = !parentCollection
  const { active, isOver, setNodeRef } = useTileDroppable(`new-collection-${collectionId}`, _active => {
    const dragAttributeID = getDragAttributeId(_active)
    dragAttributeID && onDrop?.(dragAttributeID)
  })

  const classes = clsx("collection-table-spacer", { active: !!getDragAttributeId(active), over: isOver, parentMost })
  const dropMessage = t("DG.CaseTableDropTarget.dropMessage")
  const dropMessageWidth = useMemo(() => measureText(dropMessage, "12px sans-serif"), [dropMessage])
  const parentGridRef = useRef<HTMLElement | null>(null)
  const divRef = useRef<HTMLElement | null>(null)
  const divHeight = divRef.current?.getBoundingClientRect().height
  const kMargin = 10
  const msgStyle: React.CSSProperties =
    { bottom: divHeight && dropMessageWidth ? (divHeight - dropMessageWidth) / 2 - kMargin : undefined }

  const handleRef = (element: HTMLElement | null) => {
    const parentContent = element?.closest(".case-table-content") ?? null
    if (parentCollection && parentContent) {
      parentGridRef.current = parentContent.querySelector(`.collection-${parentCollection.id} .rdg`) ?? null
    }
    divRef.current = element
    setNodeRef(element)
  }

  function handleClick(e: React.MouseEvent) {
    const parentGridBounds = parentGridRef.current?.getBoundingClientRect()
    const rowHeaderHeight = getCssVariable(parentGridRef.current, "--rdg-header-row-height") ?? 30
    const rowHeight = getCssVariable(parentGridRef.current, "--rdg-row-height") ?? 18
    // TODO: handle scrolled table
    const clickedRow = Math.floor((e.clientY - (parentGridBounds?.top ?? 0) - rowHeaderHeight) / rowHeight)
    const cases = data && parentCollection ? data?.getCasesForCollection(parentCollection.id) : []
    const clickedCase = cases[clickedRow]
    if (caseMetadata && clickedCase) {
      const isCollapsed = caseMetadata.isCollapsed(clickedCase.__id__)
      caseMetadata.setIsCollapsed(clickedCase.__id__, !isCollapsed)
    }
  }

  return (
    <div className={classes} ref={handleRef} onClick={handleClick}>
      <div className="drop-message" style={msgStyle}>{isOver ? dropMessage : ""}</div>
    </div>
  )
}
