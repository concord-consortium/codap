import React, {memo, useCallback, useEffect, useRef, useState} from "react"
import {reaction} from "mobx"
import {ScaleQuantile, scaleQuantile, schemeBlues} from "d3"
import {useDataConfigurationContext} from "../../hooks/use-data-configuration-context"
import {isSelectionAction} from "../../../../models/data/data-set-actions"
import {useGraphLayoutContext} from "../../models/graph-layout"
import {choroplethLegend} from "./choroplethLegend/choroplethLegend"
import {measureTextExtent} from "../../../../hooks/use-measure-text"
import {useDataSetContext} from "../../../../hooks/use-data-set-context"
import {kChoroplethHeight, kGraphFont} from "../../graphing-types"
import {axisGap} from "../../../axis/axis-types"
import {IDataSet} from "../../../../models/data/data-set"

const computeDesiredExtent = (dataset:IDataSet | undefined, legendAttrID:string) => {
  const labelHeight = measureTextExtent(dataset?.attrFromID(legendAttrID).name ?? '', kGraphFont).height
  return 2 * labelHeight + kChoroplethHeight + 2 * axisGap
}

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

    refreshScale = useCallback(() => {
      if (choroplethElt) {
        valuesRef.current = dataConfiguration?.numericValuesForAttrRole('legend') ?? []
        layout.setDesiredExtent('legend', computeDesiredExtent(dataset, legendAttrID))
        quantileScale.current.domain(valuesRef.current).range(schemeBlues[5])
        const bounds = layout.computedBounds.get('legend'),
          translate = `translate(${bounds?.left}, ${(bounds?.top ?? 0) + axisGap})`
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
    }, [layout, dataset, legendAttrID, choroplethElt, dataConfiguration])

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

  return <svg className='legend-categories' ref={elt => setChoroplethElt(elt)}></svg>
})
NumericLegend.displayName = "NumericLegend"
