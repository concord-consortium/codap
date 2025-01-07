import React from "react"
import { useDataSetContext } from "../../hooks/use-data-set-context"

import "./filter-formula-bar.scss"

export const FilterFormulaBar = () => {
  const data = useDataSetContext()
  if (!data) return null
  return (
    <div className="filter-formula-container">
      <span className="filter-formula-label">Show cases only if:</span>
      <span className="filter-formula-value">{data.filterFormula?.display}</span>
    </div>
  )
}
