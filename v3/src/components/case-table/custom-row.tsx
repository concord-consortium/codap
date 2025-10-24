import { colord } from "colord"
import { observer } from "mobx-react-lite"
import React, { useEffect, useRef } from "react"
import { Row } from "react-data-grid"
import { TRenderRowProps } from "./case-table-types"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { useDataSet } from "../../hooks/use-data-set"
import { IDataSet } from "../../models/data/data-set"
import { parseColorToHex } from "../../utilities/color-utils"

// have to balance background visibility vs. visibility/accessibility of rendered text
const kAlphaForRowBackground = 0.1

function getRowColor(data: IDataSet | undefined, collectionId: string, caseId: string) {
  if (!data) return
  // check first attribute of this collection or parent collections for a color attribute
  const collectionIndex = data?.getCollectionIndex(collectionId) ?? -1
  for (let i = collectionIndex; i >= 0; --i) {
    const collection = i < data.collections.length ? data.collections[i] : undefined
    const firstAttribute = collection?.attributes[0] ?? data.attributes[0]
    if (firstAttribute?.userType === "color") {
      const firstValue = data.getStrValue(caseId, firstAttribute.id)
      const firstColor = firstValue && parseColorToHex(firstValue, { colorNames: true })
      if (firstColor) {
        // reduce alpha for text contrast/visibility
        return colord(firstColor).alpha(kAlphaForRowBackground).toHex()
      }
    }
  }
}

export const CustomRow = observer(function CustomRow(props: TRenderRowProps) {
  const { data, metadata } = useDataSet()
  const collectionId = useCollectionContext()
  const rowRef = useRef<HTMLDivElement | null>(null)
  const { row: { __id__: caseId } } = props
  const isCollapsedProp = metadata?.getCollapsedAncestor(caseId) ? { "data-is-collapsed": "true" } : {}
  const rowColor = getRowColor(data, collectionId, caseId) ?? ""

  useEffect(() => {
    if (rowRef.current) {
      rowRef.current.style.backgroundColor = rowColor
    }
  }, [rowColor])

  return <Row ref={rowRef} data-case-id={caseId} {...isCollapsedProp} {...props}></Row>
})

export function customRenderRow(key: React.Key, props: TRenderRowProps) {
  return <CustomRow key={key} {...props} />
}
