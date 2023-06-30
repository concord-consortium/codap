import React, {memo, useCallback, useEffect, useRef, useState} from "react"
import {reaction} from "mobx"
import {useDataSetContext} from "../../../../hooks/use-data-set-context"
import {ScaleQuantile, scaleQuantile, schemeBlues} from "d3"
import {useDataConfigurationContext} from "../../hooks/use-data-configuration-context"
import {isSelectionAction} from "../../../../models/data/data-set-actions"
import {kChoroplethHeight} from "../../../data-display/data-display-types"
import {useGraphLayoutContext} from "../../models/graph-layout"
import {choroplethLegend} from "./choropleth-legend/choropleth-legend"
import {axisGap} from "../../../axis/axis-types"
import {getStringBounds} from "../../../axis/axis-utils"

import graphVars from "../graph.scss"


interface INumericLegendProps {
  legendAttrID: string
}

export const NumericLegend = memo(function NumericLegend({legendAttrID}: INumericLegendProps) {
  const dataConfiguration = useDataConfigurationContext(),
    layout = useGraphLayoutContext(),
    dataset = useDataSetContext(),
    quantileScale = useRef<ScaleQuantile<string>>(scaleQuantile()),
    [choroplethElt, setChoroplethElt] = useState<SVGGElement | null>(null),
    valuesRef = useRef<number[]>([]),
    labelFont = graphVars.graphLabelFont,
    labelHeight = getStringBounds(dataset?.attrFromID(legendAttrID).name ?? '', labelFont).height,
    numberHeight = getStringBounds('0').height,

    refreshScale = useCallback(() => {

      const computeDesiredExtent = () => {
        if (dataConfiguration?.placeCanHaveZeroExtent('legend')) {
          return 0
        }
          return labelHeight + kChoroplethHeight + numberHeight + 2 * axisGap
      }

      if (choroplethElt) {
        valuesRef.current = dataConfiguration?.numericValuesForAttrRole('legend') ?? []
        layout.setDesiredExtent('legend', computeDesiredExtent())
        quantileScale.current.domain(valuesRef.current).range(schemeBlues[5])
        const bounds = layout.computedBounds.legend,
          translate = `translate(${bounds?.left}, ${(bounds?.top ?? 0) + labelHeight})`
        choroplethLegend(quantileScale.current, choroplethElt,
          {
            transform: translate, width: bounds?.width,
            marginLeft: 6, marginRight: 6, ticks: 5,
            clickHandler: (quantile: number, extend: boolean) => {
              dataConfiguration?.selectCasesForLegendQuantile(quantile, extend)
            },
            casesInQuantileSelectedHandler: (quantile: number) => {
              return !!dataConfiguration?.casesInQuantileAreSelected(quantile)
            }
          })
      }
    }, [choroplethElt, dataConfiguration, layout, labelHeight, numberHeight])

  useEffect(function refresh() {
    refreshScale()
  }, [refreshScale])

  useEffect(function respondToLayoutChange() {
    const disposer = reaction(
      () => {
        const {graphHeight, graphWidth} = layout,
          legendID = dataConfiguration?.attributeID('legend')
        return [graphHeight, graphWidth, legendID]
      },
      () => {
        refreshScale()
      }, {fireImmediately: true}
    )
    return () => disposer()
  }, [layout, dataConfiguration, refreshScale])

  useEffect(function respondToSelectionChange() {
    return dataConfiguration?.onAction(action => {
      if (isSelectionAction(action)) {
        refreshScale()
      }
    })
  }, [refreshScale, dataConfiguration])

  // todo: This reaction is not being triggered when a legend attribute value is changed.
  // It should be.
  useEffect(function respondToNumericValuesChange() {
    return reaction(
      () => dataConfiguration?.numericValuesForAttrRole('legend'),
      () => {
        refreshScale()
      })
  }, [dataConfiguration, refreshScale])

  useEffect(function cleanup () {
    return () => {
      layout.setDesiredExtent('legend', 0)
    }
  }, [layout])

  return <svg className='legend-categories' ref={elt => setChoroplethElt(elt)}></svg>
})
NumericLegend.displayName = "NumericLegend"
