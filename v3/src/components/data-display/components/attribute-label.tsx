import { ForwardedRef, forwardRef, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { IDataSet } from "../../../models/data/data-set"
import {kPortalClassSelector} from "../data-display-types"
import { GraphPlace } from "../../axis-graph-shared"
import { useDataDisplayLayout } from "../hooks/use-data-display-layout"
import { useBaseDataDisplayModelContext } from "../hooks/use-base-data-display-model"
import { AxisOrLegendAttributeMenu } from "../../axis/components/axis-or-legend-attribute-menu"
import { AttributeType } from "../../../models/data/attribute-types"
import { mstAutorun } from "../../../utilities/mst-autorun"

import "./attribute-label.scss"

interface IProps {
  place: GraphPlace
  refreshLabel: () => void
  onChangeAttribute?: (place: GraphPlace, dataSet: IDataSet, attrId: string) => void
  onRemoveAttribute?: (place: GraphPlace, attrId: string) => void
  onTreatAttributeAs?: (place: GraphPlace, attrId: string, treatAs: AttributeType) => void
  // Optional override for attribute ID - used when rendering separate labels for multiple y-attributes
  attrIdOverride?: string
}

export const AttributeLabel = forwardRef((props: IProps, labelRef: ForwardedRef<SVGGElement>) => {
  const { place, refreshLabel, onChangeAttribute, onRemoveAttribute, onTreatAttributeAs, attrIdOverride } = props
  // labelRef must be a MutableRefObject, not a function
  const labelElt = typeof labelRef !== "function" ? labelRef?.current ?? null : null
  const portal = labelElt?.closest(kPortalClassSelector) as HTMLElement ?? null
  const contentModel = useBaseDataDisplayModelContext()
  const layout = useDataDisplayLayout()
  const [ layoutBounds, setLayoutBounds] = useState("")

  useEffect(() => {
    return mstAutorun(() => {
      // accessing layout triggers autorun on change
      const bounds = layout.getComputedBounds(place)
      // trigger re-render on layout position change
      setLayoutBounds(JSON.stringify(bounds))
      // render label and trigger autorun on change to observables within
      refreshLabel()
    }, { name: "AttributeLabel.autorun [refreshLabel]" }, contentModel)
  }, [contentModel, layout, place, refreshLabel])

  return (
    <>
      <g ref={labelRef}/>
      {portal && onChangeAttribute && onTreatAttributeAs && onRemoveAttribute &&
        createPortal(<AxisOrLegendAttributeMenu
          target={labelElt}
          portal={portal}
          place={place}
          layoutBounds={layoutBounds}
          onChangeAttribute={onChangeAttribute}
          onRemoveAttribute={onRemoveAttribute}
          onTreatAttributeAs={onTreatAttributeAs}
          attrIdOverride={attrIdOverride}
        />, portal)
      }
    </>
  )
})
AttributeLabel.displayName = "AttributeLabel"
