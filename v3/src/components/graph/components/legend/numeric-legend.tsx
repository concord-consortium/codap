import React, {memo, useCallback, useEffect, useRef, useState} from "react"
import {ScaleQuantile, scaleQuantile, schemeBlues} from "d3"
import {useDataConfigurationContext} from "../../hooks/use-data-configuration-context"
import {useGraphLayoutContext} from "../../models/graph-layout"
import {choroplethLegend} from "./choroplethLegend/choroplethLegend"
import {measureTextExtent} from "../../../../hooks/use-measure-text"
import {useDataSetContext} from "../../../../hooks/use-data-set-context"
import {kChoroplethHeight, kGraphFont} from "../../graphing-types"
import {axisGap} from "../../../axis/axis-types"

interface INumericLegendProps {
  legendAttrID: string
  transform: string
}

export const NumericLegend = memo(function NumericLegend({transform, legendAttrID}: INumericLegendProps) {
  const dataConfiguration = useDataConfigurationContext(),
    layout = useGraphLayoutContext(),
    dataset = useDataSetContext(),
    quantileScale = useRef<ScaleQuantile<string>>(scaleQuantile()),
    [choroplethElt, setChoroplethElt] = useState<SVGGElement | null>(null),
    valuesRef = useRef<number[]>([]),

    computeDesiredExtent = useCallback(() => {
      const labelHeight = measureTextExtent(dataset?.attrFromID(legendAttrID).name ?? '', kGraphFont).height
      return 2 * labelHeight + kChoroplethHeight + 2 * axisGap
    }, [dataset, legendAttrID])

  useEffect(() => {
    if (choroplethElt) {
      layout.setDesiredExtent('legend', computeDesiredExtent())
      quantileScale.current.domain(valuesRef.current).range(schemeBlues[5])
      const bounds = layout.computedBounds.get('legend'),
        translate = `translate(${bounds?.left}, ${bounds?.top})`
      choroplethLegend(quantileScale.current, choroplethElt,
        {
          transform: translate, width: bounds?.width, height: bounds?.height, marginLeft: 6, marginRight: 6
        })
    }
  }, [dataConfiguration, layout, legendAttrID, computeDesiredExtent, choroplethElt])


/*
  useEffect(function setup() {
    if (choroplethElt) {
      layout.setDesiredExtent('legend', computeDesiredExtent())
      quantileScale.current.domain(valuesRef.current).range(schemeBlues[5])
    }
  }, [choroplethElt, computeDesiredExtent, layout, dataConfiguration])
*/


  return <svg className='legend-categories' ref={elt => setChoroplethElt(elt)}></svg>
})
NumericLegend.displayName = "NumericLegend"
