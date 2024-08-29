import React from "react"
import { IValueType } from "../../models/data/attribute"

import "./card-view.scss"

interface ICaseAttrViewProps {
  name: string
  value: IValueType
  unit?: string
}

export const CaseAttrView = ({name, value, unit}: ICaseAttrViewProps) => {
  const displayUnit = unit ? ` (${unit})` : ""

  return (
    <tr className="attr" data-testid="case-attr">
      <td className="name" data-testid="case-attr-name">{name}{displayUnit}</td>
      <td className="value" data-testid="case-attr-value">{String(value)}</td>
    </tr>
  )
}
