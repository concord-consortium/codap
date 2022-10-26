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
    attrType = dataConfiguration?.dataset?.attrFromID(legendAttrID ?? '')?.type,
    legendLabelRef = useRef<SVGGElement>(null),
    legendRef = useRef() as React.RefObject<SVGSVGElement>

  return legendAttrID ? (
    <svg ref={legendRef} className='legend'>
      <AxisLabel
        ref={legendLabelRef}
        transform = {transform}
        attributeIDs={legendAttrID !== '' ? [legendAttrID] : []}
        orientation='horizontal'
        attributeRole='legend'
      />
      {
        attrType === 'categorical' ? <CategoricalLegend transform = {transform}
                                                        legendLabelRef={legendLabelRef}/> :
          attrType === 'numeric' ? <NumericLegend legendAttrID={legendAttrID}
                                                  transform = {transform}/> : null
      }
    </svg>
  ) : null
})
Legend.displayName = "Legend"
