import React, {forwardRef, MutableRefObject, useEffect, useRef, useState} from "react"
import {onAction} from "mobx-state-tree"
import {select} from "d3"
import {useDataConfigurationContext} from "../hooks/use-data-configuration-context"
import {AxisOrientation} from "../models/axis-model"
import {GraphAttrRole} from "../models/data-configuration-model"
import {isSetAttributeNameAction} from "../../../models/data/data-set-actions"

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
    dataset = dataConfiguration?.dataset,
    attrNames = attributeIDs.map(anID => dataset?.attrFromID(anID).name),
    svgRef = ref as MutableRefObject<SVGGElement | null>,
    labelRef = useRef<any>(),
    [, setCounter] = useState(0)

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

    useEffect(function observeAttributeNameChange() {
      const disposer = dataset && onAction(dataset, action => {
        if (isSetAttributeNameAction(action)) {
          const [changedAttributeID] = action.args
          if (attributeIDs.includes( changedAttributeID)) {
            setCounter(prevCounter => prevCounter + 1)
          }
        }
      }, true)

      return () => disposer?.()
    },[attributeIDs, dataset])

    return (
    <g className='legend-label' ref={svgRef}/>
  )
})
AttributeLabel.displayName = "AttributeLabel"
