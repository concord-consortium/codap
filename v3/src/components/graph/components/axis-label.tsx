import React, {memo, useEffect, useRef} from "react"
import {select} from "d3"
import {useDataConfigurationContext} from "../hooks/use-data-configuration-context"
import {AxisOrientation} from "../models/axis-model"
import {GraphAttrRole} from "../models/data-configuration-model"

import "./legend/legend.scss"

interface IAxisLabelProps {
  transform: string
  attributeRole: GraphAttrRole
  orientation: AxisOrientation
  attributeIDs:string[]
}

export const AxisLabel = memo(function AxisLabel({ transform, attributeIDs }: IAxisLabelProps) {
  const dataConfiguration = useDataConfigurationContext(),
    attrNames = attributeIDs.map(anID => dataConfiguration?.dataset?.attrFromID(anID).name),
    labelRef = useRef<any>()

  useEffect(function adjustLabel() {
    if( !labelRef.current) {
      labelRef.current = select('.legend-label')
        .append('text')
        .attr('class', 'attribute-label')
    }
    labelRef.current
      .attr('transform', transform)
      .text(attrNames[0] || 'Legend Attribute')
  },[attrNames, transform])

  return (
    <svg className='legend-label'/>
  )
})
AxisLabel.displayName = "AxisLabel"
