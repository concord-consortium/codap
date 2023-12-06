import { autorun } from "mobx"
import React, { ForwardedRef, forwardRef, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { IDataSet } from "../../../models/data/data-set"
import {kPortalClassSelector} from "../data-display-types"
import { GraphPlace } from "../../axis-graph-shared"
import { useDataDisplayLayout } from "../hooks/use-data-display-layout"
import { AxisOrLegendAttributeMenu } from "../../axis/components/axis-or-legend-attribute-menu"
import { AttributeType } from "../../../models/data/attribute"

import "./attribute-label.scss"

interface IProps {
  place: GraphPlace
  refreshLabel: () => void
  onChangeAttribute?: (place: GraphPlace, dataSet: IDataSet, attrId: string) => void
  onRemoveAttribute?: (place: GraphPlace, attrId: string) => void
  onTreatAttributeAs?: (place: GraphPlace, attrId: string, treatAs: AttributeType) => void
}

export const AttributeLabel = forwardRef((props: IProps, labelRef: ForwardedRef<SVGGElement>) => {
  const { place, refreshLabel, onChangeAttribute, onRemoveAttribute, onTreatAttributeAs } = props
  // labelRef must be a MutableRefObject, not a function
  const labelElt = typeof labelRef !== "function" ? labelRef?.current ?? null : null
  const portal = labelElt?.closest(kPortalClassSelector) as HTMLDivElement ?? null
  const layout = useDataDisplayLayout()
  const [ , setLayoutBounds] = useState("")

  useEffect(() => {
    return autorun(() => {
      // accessing layout triggers autorun on change
      const bounds = layout.getComputedBounds(place)
      const layoutBounds = JSON.stringify(bounds)
      // trigger re-render on layout position change
      setLayoutBounds(layoutBounds)
      // render label and trigger autorun on change to observables within
      refreshLabel()
    }, { name: "AttributeLabel.autorun [refreshLabel]" })
  }, [layout, place, refreshLabel])

  return (
    <>
      <g ref={labelRef}/>
      {portal && onChangeAttribute && onTreatAttributeAs && onRemoveAttribute &&
        createPortal(<AxisOrLegendAttributeMenu
          target={labelElt}
          portal={portal}
          place={place}
          onChangeAttribute={onChangeAttribute}
          onRemoveAttribute={onRemoveAttribute}
          onTreatAttributeAs={onTreatAttributeAs}
        />, portal)
      }
    </>
  )
})
AttributeLabel.displayName = "AttributeLabel"
