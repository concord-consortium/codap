import React, { useState } from "react"
import { observer } from "mobx-react-lite"
import { Editable, EditablePreview, EditableInput } from "@chakra-ui/react"
import { clsx } from "clsx"
import { IValueType } from "../../models/data/attribute-types"
import { ICollectionModel } from "../../models/data/collection"
import { ICase } from "../../models/data/data-set-types"
import { isFiniteNumber } from "../../utilities/math-utils"
import { AttributeHeader } from "../case-tile-common/attribute-header"
import { AttributeHeaderDivider } from "../case-tile-common/attribute-header-divider"
import { GetDividerBoundsFn } from "../case-tile-common/case-tile-types"
import { applyCaseValueChanges } from "../case-tile-common/case-tile-utils"
import { useCaseCardModel } from "./use-case-card-model"
import { renderAttributeValue } from "../case-tile-common/attribute-format-utils"

import "./case-attr-view.scss"

interface ICaseAttrViewProps {
  caseId: string
  collection: ICollectionModel
  attrId: string
  name: string
  cellValue: IValueType
  unit?: string
  getDividerBounds?: GetDividerBoundsFn
  onSetContentElt?: (contentElt: HTMLDivElement | null) => HTMLElement | null
}

export const CaseAttrView = observer(function CaseAttrView (props: ICaseAttrViewProps) {
  const { caseId, collection, attrId, unit, cellValue, getDividerBounds, onSetContentElt } = props
  const cardModel = useCaseCardModel()
  const data = cardModel?.data
  const attr = collection.getAttribute(attrId)
  const isCollectionSummarized = !!cardModel?.summarizedCollections.includes(collection.id)
  const displayStrValue = cellValue ? String(cellValue) : ""
  const displayNumValue = cellValue ? Number(cellValue) : undefined
  const showUnitWithValue = isFiniteNumber(displayNumValue) && unit
  const [isEditing, setIsEditing] = useState(false)
  const [editingValue, setEditingValue] = useState(displayStrValue)
  const handleChangeValue = (newValue: string) => {
    setEditingValue(newValue)
  }

  const handleCancel = (_previousName?: string) => {
    setIsEditing(false)
    setEditingValue(displayStrValue)
  }

  const handleSubmit = (newValue?: string) => {
    setIsEditing(false)
    if (newValue) {
      const casesToUpdate: ICase[] = [{ __id__: caseId, [attrId]: newValue }]

      if (data) {
        applyCaseValueChanges(data, casesToUpdate)
        return
      }

      setEditingValue(newValue)
    } else {
      setEditingValue(displayStrValue)
    }
  }

  const renderEditableOrSummaryValue = () => {
    if (isCollectionSummarized) {
      return (
        <div className={clsx("case-card-attr-value-text", "static-summary", {"formula-attr-value": attr?.hasFormula})}>
          {displayStrValue}
        </div>
      )
    }

    const { value } = renderAttributeValue(displayStrValue, displayNumValue, !!showUnitWithValue, attr)

    return (
      <Editable
        className={clsx("case-card-attr-value-text", {"formula-attr-value": attr?.hasFormula})}
        isPreviewFocusable={true}
        isDisabled={attr?.hasFormula}
        onCancel={handleCancel}
        onChange={handleChangeValue}
        onEdit={() => setIsEditing(true)}
        onSubmit={handleSubmit}
        submitOnBlur={true}
        value={isEditing ? editingValue : value}
      >
        <EditablePreview paddingY={0} />
        <EditableInput
          className="case-card-attr-value-text-editor"
          data-testid="case-card-attr-value-text-editor"
          paddingY={0}
          value={editingValue}
        />
      </Editable>
    )
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
          showUnits={false}
          onSetHeaderContentElt={onSetContentElt}
        />
      </td>
      <td
        className={clsx("case-card-attr-value", {
                    editing: isEditing,
                    numeric: !isCollectionSummarized && isFiniteNumber(Number(cellValue))
                  })}
        data-testid="case-card-attr-value"
      >
        {renderEditableOrSummaryValue()}
      </td>
    </tr>
  )
})
