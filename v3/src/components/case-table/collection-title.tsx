import React, { useEffect, useRef, useState, useCallback } from "react"
import { useDndContext } from "@dnd-kit/core"
import { Editable, EditableInput, EditablePreview } from "@chakra-ui/react"
import throttle from "lodash/throttle"

interface ICollectionTitleProps {
  setTitle: (title: string) => void,
  displayTitle: string,
  defaultName: string,
  caseCount: number,
}

// Does not handle component resize at the moment
export const CollectionTitle = function CollectionTitle({ setTitle, displayTitle, defaultName, caseCount }
  : ICollectionTitleProps) {
  const titleRef = useRef<HTMLDivElement>(null)
  const refExists = titleRef.current != null
  const title = displayTitle || defaultName
  const [tableScrollLeft, setTableScrollLeft] = useState(0)
  const [titleBarStyle, setTitleBarStyle] = useState({ left: 0, right: 0 })
  const { active } = useDndContext()
  const dragging = !!active
  const [isEditing, setIsEditing] = useState(false)
  const [caseTableRenderCount, setCaseTableRenderCount] = useState(0)

  useEffect(() => {
    if (!refExists) {
      return
    }
    const ref = titleRef.current
    const updateScrollPosition = throttle((e: Event) => {
      if (e.currentTarget != null) {
        setTableScrollLeft((e.currentTarget as HTMLDivElement).scrollLeft)
      }
    }, 5)
    ref.closest(".case-table-content")?.addEventListener("scroll", updateScrollPosition)
    return () => {
      ref.closest(".case-table-content")?.removeEventListener("scroll", updateScrollPosition)
    }
  }, [refExists])

  const updateTitleScrollStyles = useCallback(() => {
    if (!refExists) {
      return
    }
    const tileRect = titleRef.current.closest(".codap-component")?.getBoundingClientRect()
    const tileWidth = tileRect?.width ?? 580
    const tileLeft = tileRect?.left ?? 0
    const titleRect = titleRef.current.getBoundingClientRect()
    const deltaLeft = titleRect.left - tileLeft
    const deltaRight = titleRect.right - (tileLeft + tileWidth)
    const style = { left: 0, right: 0 }
    if (deltaLeft < 0) {
      style.left = -deltaLeft + 6
    }
    if (deltaRight > 0) {
      style.right = deltaRight
    }
    setTitleBarStyle(style)
  }, [refExists, titleRef])

  useEffect(() => {
    updateTitleScrollStyles()
  }, [tableScrollLeft, updateTitleScrollStyles])

  // React-data-grid takes several renders to arrive at its full width,
  // even though the mobx data relevant to the title are available before that.
  // So, we hide the title until the data table is fully rendered, and then
  // calculate the correct size. This is preferable to a setTimeout,
  // but if there's a best-practice mobX solution, I'm open to it.
  useEffect(() => {
    if (caseTableRenderCount < 5) {
      setCaseTableRenderCount(caseTableRenderCount + 1)
      return
    }
    updateTitleScrollStyles()
  }, [caseTableRenderCount, updateTitleScrollStyles])

  const handleChangeTitle = (nextValue?: string) => {
    if (nextValue) {
      setTitle(nextValue)
    }
  }

  return (
    <div className="collection-title-wrapper" ref={titleRef}>
      <div className="collection-title" style={{ left: titleBarStyle.left, right: titleBarStyle.right }}>
        <Editable value={isEditing ? title : `${title} (${caseCount} cases)`}
            onEdit={() => setIsEditing(true)} onSubmit={() => setIsEditing(false)} onCancel={() => setIsEditing(false)}
            isPreviewFocusable={!dragging} submitOnBlur={true} onChange={handleChangeTitle}>
          <EditablePreview paddingY={0} display={caseTableRenderCount >= 5 ? "block" : "none"} />
          <EditableInput value={title} paddingY={0} className="collection-title-input" />
        </Editable>
      </div>
    </div>
  )
}
