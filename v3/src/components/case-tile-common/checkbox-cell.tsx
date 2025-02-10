import React, { useEffect, useRef } from "react"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { FValue } from "../../models/formula/formula-types"
import { updateCasesNotificationFromIds } from "../../models/data/data-set-notifications"

export const isBoolean = (value: FValue | undefined) => {
  let v = value
  if (typeof v === "string") {
    v = v.toLowerCase()
  }
  return v === undefined || ["", "false", "true", false, true, null].includes(v as string | boolean | null)
}

interface ICheckboxCellProps {
  attrId: string
  caseId: string
}

export function CheckboxCell ({ caseId, attrId }: ICheckboxCellProps) {
  const data = useDataSetContext()
  // We need checkRef to show indeterminate state
  const checkRef = useRef<HTMLInputElement>(null)
  const cellValue = data?.getValue(caseId, attrId)

  useEffect(() => {
    if (checkRef.current) {
      const isBool = isBoolean(cellValue)
      const isTrue = cellValue === true || typeof cellValue === "string" && cellValue.toLowerCase() === "true"
      checkRef.current.checked = isBool && isTrue
      checkRef.current.indeterminate = !isBool || cellValue === ""
    }
  }, [cellValue])

  if (caseId === "__input__") return null // don't render the checkbox for the input row

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked
    data?.applyModelChange(() => {
      data.setCaseValues([{ __id__: caseId, [attrId]: newValue }])
    }, {
      notify: () => updateCasesNotificationFromIds(data, [caseId]),
      log: `update checkbox state: ${attrId} to ${newValue ? "checked" : "unchecked"}`
    })
  }
  // title is used to show the value of the cell when hovering over the checkbox
  // When checkbox is in the indeterminate state, we want the tooltip to show "undefined"
  return (
    <span className="cell-checkbox">
      <input type="checkbox" ref={checkRef}  onChange={handleChange}
              title={String(cellValue) === "" ? "undefined" : String(cellValue)}/>
    </span>
  )
}
