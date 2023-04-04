import React, { useEffect, useRef, useState } from "react"
import { useDndContext } from "@dnd-kit/core"
import { Editable, EditableInput, EditablePreview } from "@chakra-ui/react"
import throttle from "lodash/throttle"
import {useResizeDetector} from "react-resize-detector"

interface ICollectionTitleProps {
  setTitle: (title: string) => void,
  displayTitle: string,
  defaultName: string,
  caseCount: number,
}

// Does not handle component resize at the moment
export const CollectionTitle = function CollectionTitle({ setTitle, displayTitle, defaultName, caseCount }
  : ICollectionTitleProps) {
  const tileRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const title = displayTitle || defaultName
  // used to trigger a render
  const [ , setTableScrollLeft] = useState(0)
  const { active } = useDndContext()
  const dragging = !!active
  const [isEditing, setIsEditing] = useState(false)

  // re-render the component when either the tile or the title change size
  useResizeDetector({ targetRef: tileRef })
  useResizeDetector({ targetRef: titleRef })

  useEffect(() => {
    // these parents exist for the lifetime of the component
    tileRef.current = titleRef.current?.closest(".codap-component") ?? null
    contentRef.current = titleRef.current?.closest(".case-table-content") ?? null

    const updateScrollPosition = throttle((e: Event) => {
      if (e.currentTarget != null) {
        setTableScrollLeft((e.currentTarget as HTMLDivElement).scrollLeft)
      }
    }, 15)

    const contentElt = contentRef.current
    contentElt?.addEventListener("scroll", updateScrollPosition)
    return () => {
      contentElt?.removeEventListener("scroll", updateScrollPosition)
    }
  }, [])

  const tileRect = tileRef.current?.getBoundingClientRect()
  const titleRect = titleRef.current?.getBoundingClientRect()
  const titleStyle: React.CSSProperties = { left: 0, right: 0 }
  if (tileRect && titleRect) {
    const deltaLeft = titleRect.left - tileRect.left
    const deltaRight = titleRect.right - tileRect.right
    if (deltaLeft < 0) {
      titleStyle.left = -deltaLeft + 6
    }
    if (deltaRight > 0) {
      titleStyle.right = deltaRight
    }
  }

  const handleChangeTitle = (nextValue?: string) => {
    if (nextValue) {
      setTitle(nextValue)
    }
  }

  return (
    <div className="collection-title-wrapper" ref={titleRef}>
      <div className="collection-title" style={titleStyle}>
        <Editable value={isEditing ? title : `${title} (${caseCount} cases)`}
            onEdit={() => setIsEditing(true)} onSubmit={() => setIsEditing(false)} onCancel={() => setIsEditing(false)}
            isPreviewFocusable={!dragging} submitOnBlur={true} onChange={handleChangeTitle}>
          <EditablePreview paddingY={0} />
          <EditableInput value={title} paddingY={0} className="collection-title-input" />
        </Editable>
      </div>
    </div>
  )
}
