import { clsx } from "clsx"
import React, { useMemo, useRef } from "react"
import { getDragAttributeId, useTileDroppable } from "../../hooks/use-drag-drop"
import { measureText } from "../../hooks/use-measure-text"
import t from "../../utilities/translation/translate"

interface IProps {
  onDrop?: (attrId: string) => void
}
export function NewCollectionDrop({ onDrop }: IProps) {
  const { active, isOver, setNodeRef } = useTileDroppable("new-collection", _active => {
    const dragAttributeID = getDragAttributeId(_active)
    dragAttributeID && onDrop?.(dragAttributeID)
  })

  const classes = clsx("new-collection-drop", { active: !!getDragAttributeId(active), over: isOver })
  const dropMessage = t("DG.CaseTableDropTarget.dropMessage")
  const dropMessageWidth = useMemo(() => measureText(dropMessage, "12px sans-serif"), [dropMessage])
  const divRef = useRef<HTMLElement | null>(null)
  const divHeight = divRef.current?.getBoundingClientRect().height
  const kMargin = 10
  const msgStyle: React.CSSProperties =
    { bottom: divHeight && dropMessageWidth ? (divHeight - dropMessageWidth) / 2 - kMargin : undefined }

  const handleRef = (element: HTMLElement | null) => {
    divRef.current = element
    setNodeRef(element)
  }

  return (
    <div className={classes} ref={handleRef}>
      <div className="drop-message" style={msgStyle}>{isOver ? dropMessage : ""}</div>
    </div>
  )
}
