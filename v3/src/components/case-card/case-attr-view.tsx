import React, { useState } from "react"
import { observer } from "mobx-react-lite"
import { Editable, EditablePreview, EditableInput } from "@chakra-ui/react"
import { clsx } from "clsx"
import { IAttribute } from "../../models/data/attribute"
import { ICollectionModel } from "../../models/data/collection"
import { ICase, IGroupedCase } from "../../models/data/data-set-types"
import { isFiniteNumber } from "../../utilities/math-utils"
import { renderAttributeValue } from "../case-tile-common/attribute-format-utils"
import { AttributeHeader } from "../case-tile-common/attribute-header"
import { GetDividerBoundsFn } from "../case-tile-common/case-tile-types"
import { applyCaseValueChanges } from "../case-tile-common/case-tile-utils"
import ColorTextEditor from "../case-tile-common/color-text-editor"
import { isBoolean } from "../case-tile-common/checkbox-cell"
import { useCaseCardModel } from "./use-case-card-model"

import "./case-attr-view.scss"

interface ICaseAttrViewProps {
  attr: IAttribute
  collection: ICollectionModel
  getDividerBounds?: GetDividerBoundsFn
  groupedCase?: IGroupedCase
  isCollectionSummarized: boolean
  onSetContentElt?: (contentElt: HTMLDivElement | null) => HTMLElement | null
}

export const CaseAttrView = observer(function CaseAttrView (props: ICaseAttrViewProps) {
  const { attr, collection, getDividerBounds, groupedCase, isCollectionSummarized, onSetContentElt } = props
  const { id, units } = attr || {}
  const caseId = groupedCase?.__id__ ?? ""
  const cardModel = useCaseCardModel()
  const data = cardModel?.data
  const cellValue = isCollectionSummarized
    ? cardModel?.summarizedValues(attr, collection)
    : data?.getValue(caseId, id)
  const displayStrValue = cellValue ? String(cellValue) : ""
  const displayNumValue = cellValue ? Number(cellValue) : NaN
  const showUnits = isFiniteNumber(displayNumValue) && !!units
  const { value, content } = renderAttributeValue(displayStrValue, displayNumValue, attr, { caseId, showUnits })
  const [isEditing, setIsEditing] = useState(false)
  const [editingValue, setEditingValue] = useState(value)

  const handleChangeValue = (newValue: string) => {
    setEditingValue(newValue)
  }

  const handleCancel = (_previousName?: string) => {
    setIsEditing(false)
    setEditingValue(_previousName ?? value)
  }

  const handleSubmit = (newValue?: string) => {
    setIsEditing(false)
    if (newValue) {
      const casesToUpdate: ICase[] = [{ __id__: caseId, [id]: newValue }]

      if (data) {
        applyCaseValueChanges(data, casesToUpdate)
        return
      }

      setEditingValue(newValue)
    } else {
      setEditingValue(value)
    }
  }

  const renderEditableOrSummaryValue = () => {
    if (isCollectionSummarized) {
      return (
        <div className={clsx("case-card-attr-value-text", "static-summary", {"formula-attr-value": attr?.hasFormula})}>
          {value}
        </div>
      )
    }

    if (attr?.userType == null || attr?.userType === "color") {
      const handleClick = () => {
        if (groupedCase) {
          setIsEditing(true)
        }
      }
      
      return (
        isEditing
        ? <ColorTextEditor
            attributeId={attr?.id ?? ""}
            caseId={caseId}
            acceptValue={handleSubmit}
            updateValue={handleChangeValue}
            cancelChanges={handleCancel}
            value={isEditing ? editingValue : displayStrValue}
          />
        : <div className="case-card-attr-value-color" onClick={handleClick}>{ content }</div>
        )
    }

    if (attr?.userType === "checkbox" && isBoolean(value)) {
      return (
        <div className={clsx("case-card-attr-value-checkbox", {"formula-attr-value": attr?.hasFormula})}>
          {content}
        </div>
      )
    }

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

  const classes = clsx("case-card-attr-value", {
    editable: !!groupedCase,
    editing: isEditing,
    numeric: !isCollectionSummarized && isFiniteNumber(displayNumValue)
  })

  return (
    <tr className="case-card-attr" data-testid="case-card-attr">
      <td className="case-card-attr-name" data-testid="case-card-attr-name">
        <AttributeHeader
          attributeId={id}
          customButtonStyle={customButtonStyle}
          getDividerBounds={getDividerBounds}
          showUnits={false}
          onSetHeaderContentElt={onSetContentElt}
        />
      </td>
      <td className={classes} data-testid="case-card-attr-value">
        {renderEditableOrSummaryValue()}
      </td>
    </tr>
  )
})
