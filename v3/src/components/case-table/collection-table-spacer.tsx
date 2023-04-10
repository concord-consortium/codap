import { clsx } from "clsx"
import React, { useMemo, useRef } from "react"
import { useCaseMetadata } from "../../hooks/use-case-metadata"
import { useCollectionContext, useParentCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { getDragAttributeId, useTileDroppable } from "../../hooks/use-drag-drop"
import { measureText } from "../../hooks/use-measure-text"
// import { getNumericCssVariable } from "../../utilities/css-utils"
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

  // Keep for now in case of accessibility application (wider area of input)
  // function handleAreaClick(e: React.MouseEvent) {
  //   console.log('handleAreaClick')
  //   const parentGridBounds = parentGridRef.current?.getBoundingClientRect()
  //   const rowHeaderHeight = getNumericCssVariable(parentGridRef.current, "--rdg-header-row-height") ?? 30
  //   const rowHeight = getNumericCssVariable(parentGridRef.current, "--rdg-row-height") ?? 18
  //   // TODO: real buttons; handle scrolled table
  //   const clickedRow = Math.floor((e.clientY - (parentGridBounds?.top ?? 0) - rowHeaderHeight) / rowHeight)
  //   const cases = data && parentCollection ? data?.getCasesForCollection(parentCollection.id) : []
  //   const clickedCase = cases[clickedRow]
  //   if (caseMetadata && clickedCase) {
  //     const isCollapsed = caseMetadata.isCollapsed(clickedCase.__id__)
  //     caseMetadata.setIsCollapsed(clickedCase.__id__, !isCollapsed)
  //   }
  // }

  const cases = data && parentCollection ? data?.getCasesForCollection(parentCollection.id) : []
  const everyCaseIsCollapsed = cases.every((value) => caseMetadata?.isCollapsed(value.__id__))

  function handleTopClick() {
    cases.forEach((value) => caseMetadata?.setIsCollapsed(value.__id__, !everyCaseIsCollapsed))
  }

  const topTooltipKey = `DG.CaseTable.dividerView.${everyCaseIsCollapsed ? 'expandAllTooltip' : 'collapseAllTooltip'}`
  const topButtonTooltip = t(topTooltipKey)

  return (
    <>
      <div className="collection-table-spacer-divider" />
      <div className={classes} ref={handleRef}>
        <div className="spacer-top">
          {!parentMost && <ExpandCollapseButton isCollapsed={everyCaseIsCollapsed} onClick={handleTopClick}
            title={topButtonTooltip} />}
        </div>
        <div className="spacer-mid">
          <div className="spacer-mid-interface">
            {cases.map((value, index) => (
              <ExpandCollapseButton key={value.__id__} isCollapsed={!!caseMetadata?.isCollapsed(value.__id__)}
                onClick={() => caseMetadata?.setIsCollapsed(value.__id__, !caseMetadata?.isCollapsed(value.__id__))}
                styles={{ left: '3px', top: `${(index * 18) + 4}px`}}
              />
            ))}
          </div>
        </div>
        <div className="drop-message" style={msgStyle}>{isOver ? dropMessage : ""}</div>
      </div>
      <div className="collection-table-spacer-divider" />
    </>
  )
}

interface ExpandCollapseButtonProps {
  isCollapsed: boolean,
  onClick: () => void,
  styles?: {
    left?: string,
    top?: string,
  },
  title?: string,
}

function ExpandCollapseButton({ isCollapsed, onClick, styles, title }: ExpandCollapseButtonProps) {
  const tooltipKey = `DG.CaseTable.dividerView.${isCollapsed ? "expandGroupTooltip" : "collapseGroupTooltip"}`
  const tooltip = title ?? t(tooltipKey)
  return (
    <button type="button" className="expand-collapse-button" onClick={onClick} style={styles}>
      <img className={`expand-collapse-image ${isCollapsed ? 'closed' : 'open'}`} title={tooltip} />
    </button>
  )
}
