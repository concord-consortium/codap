import React, {forwardRef, MutableRefObject, useEffect, useRef} from "react"
import {select} from "d3"
import {useDataConfigurationContext} from "../hooks/use-data-configuration-context"
import {AxisOrientation} from "../models/axis-model"
import {GraphAttrRole} from "../models/data-configuration-model"

import "./legend/legend.scss"

interface IAttributeLabelProps {
  transform: string
  attributeRole: GraphAttrRole
  orientation: AxisOrientation
  attributeIDs:string[]
}

export const AttributeLabel = forwardRef<SVGGElement, IAttributeLabelProps>(
  ({ transform, attributeIDs }:IAttributeLabelProps, ref) => {
  const dataConfiguration = useDataConfigurationContext(),
    attrNames = attributeIDs.map(anID => dataConfiguration?.dataset?.attrFromID(anID).name),
    svgRef = ref as MutableRefObject<SVGGElement | null>,
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
    <g className='legend-label' ref={svgRef}/>
  )
})
AttributeLabel.displayName = "AttributeLabel"
