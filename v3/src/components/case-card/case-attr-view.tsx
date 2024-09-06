import React, { useState } from "react"
import { observer } from "mobx-react-lite"
import { Editable, EditablePreview, EditableInput } from "@chakra-ui/react"
import { clsx } from "clsx"
import { IValueType } from "../../models/data/attribute"
import { useCaseCardModel } from "./use-case-card-model"
import { setCaseValuesWithCustomUndoRedo } from "../../models/data/data-set-undo"
import { ICase } from "../../models/data/data-set-types"
import { isFiniteNumber } from "../../utilities/math-utils"
import { AttributeHeader } from "../case-table-card-common/attribute-header"
import { ICollectionModel } from "../../models/data/collection"
import { createCasesNotification, updateCasesNotification } from "../../models/data/data-set-notifications"

import "./case-attr-view.scss"

interface ICaseAttrViewProps {
  caseId: string
  collection: ICollectionModel
  attrId: string
  name: string
  value: IValueType
  unit?: string
}

export const CaseAttrView = observer(function CaseAttrView ({caseId, collection, attrId, value}: ICaseAttrViewProps) {
  const data = useCaseCardModel()?.data
  const displayValue = value ? String(value) : ""
  const [isEditing, setIsEditing] = useState(false)
  const [editingValue, setEditingValue] = useState(displayValue)

  // TODO: Implement dragging
  const dragging = false

  const handleChangeValue = (newValue: string) => {
    setEditingValue(newValue)
  }

  const handleCancel = (_previousName?: string) => {
    setEditingValue(displayValue)
    setIsEditing(false)
  }

  const handleSubmit = (newValue?: string) => {
    if (newValue) {
      const casesToUpdate: ICase[] = [{__id__: caseId, [attrId]: newValue}]
      const undoStringKey = "DG.Undo.caseTable.editCellValue"
      const redoStringKey = "DG.Redo.caseTable.editCellValue"
      let oldCaseIds = new Set(collection?.caseIds ?? [])
      let updatedCaseIds: string[] = []

      data?.applyModelChange(
        () => {
          setCaseValuesWithCustomUndoRedo(data, casesToUpdate)
          if (collection?.id === data.childCollection.id) {
            // The child collection's case ids are persistent, so we can just use the casesToUpdate to
            // determine which case ids to use in the updateCasesNotification
            updatedCaseIds = casesToUpdate.map(aCase => aCase.__id__)
          } else {
            // Other collections have cases whose ids change when values change due to updated case grouping,
            // so we have to check which case ids were not present before updating to determine which case ids
            // to use in the updateCasesNotification
            collection?.caseIds.forEach(cid => {
              if (!oldCaseIds.has(cid)) updatedCaseIds.push(cid)
            })
          }
          oldCaseIds = new Set(collection?.caseIds ?? [])
        },
        {
          notify: () => {
            const notifications: any = []
            if (updatedCaseIds.length > 0) {
              const updatedCases = updatedCaseIds.map(cid => data.caseInfoMap.get(cid))
                .filter(caseGroup => !!caseGroup)
                .map(caseGroup => caseGroup.groupedCase)
              notifications.push(updateCasesNotification(data, updatedCases))
            }
            if (updatedCaseIds.length > 0) notifications.push(createCasesNotification(updatedCaseIds, data))
            return notifications
          },
          undoStringKey,
          redoStringKey
        }
      )
      setEditingValue(newValue)
    } else {
      setEditingValue(displayValue)
    }
    setIsEditing(false)
  }

  return (
    <tr className="case-card-attr" data-testid="case-card-attr">
      <td className="case-card-attr-name" data-testid="case-card-attr-name">
        <AttributeHeader attributeId={attrId} />
      </td>
      <td
        className={clsx("case-card-attr-value", {editing: isEditing, numeric: isFiniteNumber(Number(value))})}
        data-testid="case-card-attr-value"
      >
        <Editable
          className="case-card-attr-value-text"
          isPreviewFocusable={!dragging}
          onCancel={handleCancel}
          onChange={handleChangeValue}
          onEdit={() => setIsEditing(true)}
          onSubmit={handleSubmit}
          submitOnBlur={true}
          value={isEditing ? editingValue : displayValue}
        >
          <EditablePreview paddingY={0} />
          <EditableInput
            className="case-card-attr-value-text-editor"
            data-testid="case-card-attr-value-text-editor"
            paddingY={0}
            value={editingValue}
          />
        </Editable>
      </td>
    </tr>
  )
})
