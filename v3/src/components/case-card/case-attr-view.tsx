import React, { useState } from "react"
import { observer } from "mobx-react-lite"
import { Editable, EditablePreview, EditableInput } from "@chakra-ui/react"
import { clsx } from "clsx"
import { IValueType } from "../../models/data/attribute"
import { useCaseCardModel } from "./use-case-card-model"
import { ICase } from "../../models/data/data-set-types"
import { isFiniteNumber } from "../../utilities/math-utils"
import { AttributeHeader } from "../case-tile-common/attribute-header"
import { AttributeHeaderDivider } from "../case-tile-common/attribute-header-divider"
import { GetDividerBoundsFn } from "../case-tile-common/case-tile-types"
import { ICollectionModel } from "../../models/data/collection"
import { applyCaseValueChanges } from "../case-tile-common/case-tile-utils"

import "./case-attr-view.scss"

interface ICaseAttrViewProps {
  caseId: string
  collection: ICollectionModel
  attrId: string
  name: string
  value: IValueType
  unit?: string
  getDividerBounds?: GetDividerBoundsFn
  onSetContentElt?: (contentElt: HTMLDivElement | null) => HTMLElement | null
}

export const CaseAttrView = observer(function CaseAttrView (props: ICaseAttrViewProps) {
  const { caseId, attrId, value, getDividerBounds, onSetContentElt } = props
  const data = useCaseCardModel()?.data
  const displayValue = value ? String(value) : ""
  const [isEditing, setIsEditing] = useState(false)
  const [editingValue, setEditingValue] = useState(displayValue)

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

      if (data && casesToUpdate.length) {
        applyCaseValueChanges(data, casesToUpdate)
        return
      }

      setEditingValue(newValue)
    } else {
      setEditingValue(displayValue)
    }
    setIsEditing(false)
  }

  const customButtonStyle = {
    _focusVisible: {
      borderRadius: 0,
      outline: "2px solid #66afe9",
      outlineOffset: "5px"
    }
  }

  return (
    <tr className="case-card-attr" data-testid="case-card-attr">
      <td className="case-card-attr-name" data-testid="case-card-attr-name">
        <AttributeHeader
          attributeId={attrId}
          customButtonStyle={customButtonStyle}
          getDividerBounds={getDividerBounds}
          HeaderDivider={AttributeHeaderDivider}
          onSetHeaderContentElt={onSetContentElt}
        />
      </td>
      <td
        className={clsx("case-card-attr-value", {editing: isEditing, numeric: isFiniteNumber(Number(value))})}
        data-testid="case-card-attr-value"
      >
        <Editable
          className="case-card-attr-value-text"
          isPreviewFocusable={true}
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
