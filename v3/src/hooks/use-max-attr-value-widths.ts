import { useEffect, useState } from "react"
import { IDataSet } from "../models/data/data-set"
import { measureText } from "./use-measure-text"

interface IWidthEntry {
  // track case with longest string to enable more efficient change handling down the road
  caseId: string
  width: number
}
type MaxWidths = Record<string, IWidthEntry>

export const useMaxAttrValueWidths = (data?: IDataSet) => {

  const [maxWidths, setMaxWidths] = useState<MaxWidths>({})

  // cache the length of the longest string for each attribute (column)
  useEffect(() => {
    const _maxWidths: MaxWidths = {}
    data?.attributes.forEach((attr, i) => {
      let caseId = ""
      let maxWidth = 0
      attr.strValues.forEach(str => {
        const width = Math.ceil(measureText(str))
        if (width > maxWidth) {
          caseId = data?.itemIDFromIndex(i) || ""
          maxWidth = width
        }
        maxWidth = Math.max(width, maxWidth)
      })
      _maxWidths[attr.id] = { caseId, width: maxWidth }
    })
    setMaxWidths(_maxWidths)
  }, [data])

  return maxWidths
}
