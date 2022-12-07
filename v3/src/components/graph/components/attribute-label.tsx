import React, {forwardRef, MutableRefObject, useEffect, useRef} from "react"
import {select} from "d3"
import {useDataConfigurationContext} from "../hooks/use-data-configuration-context"
import {AxisOrientation} from "../../axis/models/axis-model"
import {GraphAttrRole} from "../models/data-configuration-model"
import {isSetAttributeNameAction} from "../../../models/data/data-set-actions"
import {useForceUpdate} from "../../../hooks/use-force-update"

import "./legend/legend.scss"

interface IAttributeLabelProps {
  transform: string
  attributeRole: GraphAttrRole
  orientation: AxisOrientation
  attributeIDs: string[]
}

export const AttributeLabel = forwardRef<SVGGElement, IAttributeLabelProps>(
  ({transform, attributeIDs}: IAttributeLabelProps, ref) => {
    const dataConfiguration = useDataConfigurationContext(),
      dataset = dataConfiguration?.dataset,
      svgRef = ref as MutableRefObject<SVGGElement | null>,
      labelRef = useRef<any>(),
      forceUpdate = useForceUpdate()

    // We run this useEffect every time even though there is a tiny performance hit
    useEffect(function adjustLabel() {
      const attrNames = attributeIDs.map(anID => dataset?.attrFromID(anID).name)
      if (!labelRef.current) {
        labelRef.current = select('.legend-label')
          .append('text')
          .attr('class', 'attribute-label')
      }
      labelRef.current
        .attr('transform', transform)
        .text(attrNames[0] || 'Legend Attribute')
    })

    useEffect(function observeAttributeNameChange() {
      const disposer = dataConfiguration?.onAction(action => {
        if (isSetAttributeNameAction(action)) {
          const [changedAttributeID] = action.args
          if (attributeIDs.includes(changedAttributeID)) {
            forceUpdate()
          }
        }
      })

      return () => disposer?.()
    }, [attributeIDs, dataConfiguration, forceUpdate])

    return (
      <g className='legend-label' ref={svgRef}/>
    )
  })
AttributeLabel.displayName = "AttributeLabel"
