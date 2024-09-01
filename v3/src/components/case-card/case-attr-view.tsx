import React, { useState } from "react"
import { observer } from "mobx-react-lite"
import { clsx } from "clsx"
import { IValueType } from "../../models/data/attribute"
import CaseCellTextEditor from "./case-cell-editor"
import { useCaseCardModel } from "./use-case-card-model"
import { setCaseValuesWithCustomUndoRedo } from "../../models/data/data-set-undo"
import { ICase } from "../../models/data/data-set-types"
import { isFiniteNumber } from "../../utilities/math-utils"
import { AttributeHeader } from "../case-table-card-common/attribute-header"

import "./card-view.scss"


interface ICaseAttrViewProps {
  caseId: string
  attrId: string
  name: string
  value: IValueType
  unit?: string
}

export const CaseAttrView = observer(function CaseAttrView ({caseId, attrId, name, value, unit}: ICaseAttrViewProps) {
  const data = useCaseCardModel()?.data
  const [isEditing, setIsEditing] = useState(false)

  const handleClick = () => {
    setIsEditing(!isEditing)
  }

  const handleBlur = (newValue: string) => {
    const caseToUpdate: ICase = {__id__: caseId, [attrId]: newValue}
    const undoStringKey = "DG.Undo.caseTable.editCellValue"
    const redoStringKey = "DG.Redo.caseTable.editCellValue"
    // let oldCaseIds = new Set(collection?.caseIds ?? [])
    // let updatedCaseIds: string[] = []

    data?.applyModelChange(
      () => {
        setCaseValuesWithCustomUndoRedo(data, [caseToUpdate])
        // if (collection?.id === data.childCollection.id) {
        //   // The child collection's case ids are persistent, so we can just use the casesToUpdate to
        //   // determine which case ids to use in the updateCasesNotification
        //   updatedCaseIds = casesToUpdate.map(aCase => aCase.__id__)
        // } else {
        //   // Other collections have cases whose ids change when values change due to updated case grouping,
        //   // so we have to check which case ids were not present before updating to determine which case ids
        //   // to use in the updateCasesNotification
        //   collection?.caseIds.forEach(caseId => {
        //     if (!oldCaseIds.has(caseId)) updatedCaseIds.push(caseId)
        //   })
        // }
        // oldCaseIds = new Set(collection?.caseIds ?? [])
      },
      {
        notify: () => {
          const notifications: any = []
          // if (updatedCaseIds.length > 0) {
          //   const updatedCases = updatedCaseIds.map(caseId => data.caseInfoMap.get(caseId))
          //     .filter(caseGroup => !!caseGroup)
          //     .map(caseGroup => caseGroup.groupedCase)
          //   notifications.push(updateCasesNotification(data, updatedCases))
          // }
          // if (newCaseIds.length > 0) notifications.push(createCasesNotification(newCaseIds, data))
          return notifications
        },
        undoStringKey,
        redoStringKey
      }
    )
    setIsEditing(false)
  }

  return (
    <tr className="attr" data-testid="case-attr">
      <td className="name" data-testid="case-attr-name">
        <AttributeHeader attributeId={attrId} />
      </td>
      <td
        className={clsx("value", {numeric: isFiniteNumber(Number(value))})}
        data-testid="case-attr-value"
        onClick={handleClick}
      >
        { isEditing
            ? <CaseCellTextEditor value={String(value)} onBlur={handleBlur}/>
            : String(value)
        }
      </td>
    </tr>
  )
})
