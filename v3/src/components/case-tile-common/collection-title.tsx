import { Button, Editable, EditableInput, EditablePreview } from "@chakra-ui/react"
import { useDndContext } from "@dnd-kit/core"
import { clsx } from "clsx"
import throttle from "lodash/throttle"
import { observer } from "mobx-react-lite"
import React, { useEffect, useRef, useState } from "react"
import {useResizeDetector} from "react-resize-detector"
import AddIcon from "../../assets/icons/icon-add-circle.svg"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { useTileSelectionContext } from "../../hooks/use-tile-selection-context"
import { logModelChangeFn } from "../../lib/log-message"
import { updateCollectionNotification } from "../../models/data/data-set-notifications"
import { preventCollectionReorg } from "../../utilities/plugin-utils"
import { t } from "../../utilities/translation/translate"
import { colorCycleClass } from "./case-tile-utils"

interface IProps {
  collectionIndex: number
  showCount: boolean
  onAddNewAttribute?: () => void
}

export const CollectionTitle =
                observer(function CollectionTitle({onAddNewAttribute, showCount, collectionIndex}: IProps) {
  const data = useDataSetContext()
  const collectionCount = data?.collections.length ?? 1
  const collectionId = useCollectionContext()
  const collection = data?.getCollection(collectionId)
  const collectionName = collection?.name || t("DG.AppController.createDataSet.collectionName")
  const { isTileSelected } = useTileSelectionContext()
  const visibleCaseCount = collection?.cases.length ?? 0
  const nonEmptyCaseCount = collection?.nonEmptyCases.length ?? 0
  const hasEmptyCases = visibleCaseCount - nonEmptyCaseCount > 0
  const hiddenCaseCount = (collection?.allCaseIds.size ?? 0) - visibleCaseCount
  const tileRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  // used to trigger a render
  const [ , setTableScrollLeft] = useState(0)
  const { active } = useDndContext()
  const dragging = !!active
  const [isEditing, setIsEditing] = useState(false)
  const [editingName, setEditingName] = useState(collectionName)
  const isTileInFocus = isTileSelected()
  const disableAddAttribute = preventCollectionReorg(data, collectionId)

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
  const addIconStyle: React.CSSProperties = { right: 0 }

  if (tileRect && titleRect) {
    const deltaLeft = titleRect.left - tileRect.left
    const deltaRight = titleRect.right - tileRect.right
    if (deltaLeft < 0) {
      titleStyle.left = -deltaLeft + 6
    }
    if (deltaRight > 0) {
      titleStyle.right = deltaRight
      addIconStyle.right = deltaRight
    }
  }

  const handleChangeName = (newName: string) => {
    setEditingName(newName)
  }

  const handleSubmit = (newName: string) => {
    if (newName) {
      setEditingName(newName)
      data?.applyModelChange(() => {
        collection?.setName(newName)
      }, {
        notify: collection?.name !== newName ? () => updateCollectionNotification(collection, data) : undefined,
        undoStringKey: "DG.Undo.caseTable.collectionNameChange",
        redoStringKey: "DG.Redo.caseTable.collectionNameChange",
        log: logModelChangeFn("Change collection name from %@ to %@",
                () => ({ name: collection?.name }), {}, "table")
      })
    } else {
      setEditingName(collectionName)
    }
    setIsEditing(false)
  }

  const handleCancel = (_previousName?: string) => {
    setEditingName(collectionName)
    setIsEditing(false)
  }

  const titleTextStr = hasEmptyCases
                        ? hiddenCaseCount > 0
                          ? "V3.CaseTable.collectionTitleTextWithEmptyAndHidden"
                          : "V3.CaseTable.collectionTitleTextWithEmpty"
                        : hiddenCaseCount > 0
                          ? "V3.CaseTable.collectionTitleTextWithHidden"
                          : "V3.CaseTable.collectionTitleText"
  const displayName = t(titleTextStr, { vars: [collectionName, nonEmptyCaseCount, hiddenCaseCount] })
  const addIconClass = clsx("add-icon", { focused: isTileInFocus })

  return (
    <div className={`collection-title-wrapper ${colorCycleClass(collectionIndex, collectionCount)}`} ref={titleRef}>
      <div className="collection-title" style={titleStyle}>
        <Editable value={isEditing ? editingName : displayName}
            onEdit={() => setIsEditing(true)} onSubmit={handleSubmit} onCancel={handleCancel}
            isPreviewFocusable={!dragging} submitOnBlur={true} onChange={handleChangeName}>
          <EditablePreview width="100%" paddingY={0} overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis" />
          <EditableInput value={editingName} paddingY={0} className="collection-title-input" />
        </Editable>
      </div>
      {onAddNewAttribute &&
        <Button className="add-attribute-icon-button" title={t("DG.TableController.newAttributeTooltip")}
            data-testid={"collection-add-attribute-icon-button"} style={addIconStyle}
            isDisabled={disableAddAttribute} >
          <AddIcon className={addIconClass} onClick={onAddNewAttribute} />
        </Button>
      }
    </div>
  )
})
