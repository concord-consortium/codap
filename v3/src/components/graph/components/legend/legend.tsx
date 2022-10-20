import React, {memo, useRef} from "react"
import {IGraphModel} from "../../models/graph-model"
import {useInstanceIdContext} from "../../../../hooks/use-instance-id-context"
import {useDataConfigurationContext} from "../../hooks/use-data-configuration-context"
import {AxisLabel} from "../axis-label"
import {CategoricalLegend} from "./categorical-legend"
import {NumericLegend} from "./numeric-legend"

interface ILegendProps {
  graphModel: IGraphModel
  transform: string
  legendAttrID:string
}

export const Legend = memo(function Legend({legendAttrID, graphModel, transform}: ILegendProps) {
  useInstanceIdContext()
  const dataConfiguration = useDataConfigurationContext(),
    // legendAttrID = dataConfiguration?.attributeID('legend') ?? '',
    attrType = dataConfiguration?.dataset?.attrFromID(legendAttrID ?? '')?.type,
    legendRef = useRef() as React.RefObject<SVGSVGElement>

  return (
    <svg ref={legendRef} className='legend'>
      <AxisLabel
        transform = {transform}
        attributeIDs={legendAttrID !== '' ? [legendAttrID] : []}
        orientation='horizontal'
        attributeRole='legend'
      />
      {
        attrType === 'categorical' ? <CategoricalLegend legendAttrID={legendAttrID}/> :
          attrType === 'numeric' ? <NumericLegend legendAttrID={legendAttrID}/> : null
      }
    </svg>
  )
})
Legend.displayName = "Legend"
