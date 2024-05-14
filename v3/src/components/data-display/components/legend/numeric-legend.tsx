import {ScaleQuantile, scaleQuantile, schemeBlues} from "d3"
import {reaction} from "mobx"
import {observer} from "mobx-react-lite"
import React, {useCallback, useEffect, useRef, useState} from "react"
import { mstReaction } from "../../../../utilities/mst-reaction"
import {isSelectionAction} from "../../../../models/data/data-set-actions"
import { setOrExtendSelection } from "../../../../models/data/data-set-utils"
import {axisGap} from "../../../axis/axis-types"
import {getStringBounds} from "../../../axis/axis-utils"
import {kChoroplethHeight} from "../../data-display-types"
import {useDataConfigurationContext} from "../../hooks/use-data-configuration-context"
import {useDataDisplayLayout} from "../../hooks/use-data-display-layout"
import {choroplethLegend} from "./choropleth-legend/choropleth-legend"

import vars from "../../../vars.scss"


interface INumericLegendProps {
  layerIndex: number
  setDesiredExtent: (layerIndex:number, extent: number) => void
}

export const NumericLegend =
  observer(function NumericLegend({layerIndex, setDesiredExtent}: INumericLegendProps) {
  const dataConfiguration = useDataConfigurationContext(),
    tileWidth = useDataDisplayLayout().tileWidth,
    quantileScale = useRef<ScaleQuantile<string>>(scaleQuantile()),
    [choroplethElt, setChoroplethElt] = useState<SVGGElement | null>(null),
    valuesRef = useRef<number[]>([]),

    getLabelHeight = useCallback(() => {
      const labelFont = vars.labelFont,
        legendAttrID = dataConfiguration?.attributeID('legend') ?? ''
      return getStringBounds(dataConfiguration?.dataset?.attrFromID(legendAttrID)?.name ?? '', labelFont).height
    }, [dataConfiguration]),

    refreshScale = useCallback(() => {
      const numberHeight = getStringBounds('0').height
      const labelHeight = getLabelHeight()
      const computeDesiredExtent = () => {
        if (dataConfiguration?.placeCanHaveZeroExtent('legend')) {
          return 0
        }
        return labelHeight + kChoroplethHeight + numberHeight + 2 * axisGap
      }

      if (choroplethElt) {
        // If some or all cases are hidden, the legend should still reflect the full range of values for both hidden
        // and visible cases.
        // TODO: When all visible cases have the exact same value for the legend attribute, the legend should only
        // reflect the values of the cases shown.
        const allCasesCount = dataConfiguration?.dataset?.cases.length ?? 0
        let values = dataConfiguration?.numericValuesForAttrRole("legend") ?? []
        if (values.length < allCasesCount) {
          const attribute = dataConfiguration?.dataset?.attrFromID(dataConfiguration?.attributeID("legend"))
          values = attribute?.numValues ?? []
        }
        valuesRef.current = values
        setDesiredExtent(layerIndex, computeDesiredExtent())
        quantileScale.current.domain(valuesRef.current).range(schemeBlues[5])
        choroplethLegend(quantileScale.current, choroplethElt,
          {
            width: tileWidth,
            marginLeft: 6, marginTop: labelHeight, marginRight: 6, ticks: 5,
            clickHandler: (quantile: number, extend: boolean) => {
              const dataset = dataConfiguration?.dataset
              const quantileCases = dataConfiguration?.getCasesForLegendQuantile(quantile)
              if (quantileCases) {
                setOrExtendSelection(quantileCases, dataset, extend)
              }
            },
            casesInQuantileSelectedHandler: (quantile: number) => {
              return !!dataConfiguration?.casesInQuantileAreSelected(quantile)
            }
          })
      }
    }, [choroplethElt, dataConfiguration, getLabelHeight, setDesiredExtent, tileWidth, layerIndex])

  useEffect(function refresh() {
    refreshScale()
  }, [refreshScale])

  useEffect(function respondToLayoutChange() {
    const disposer = reaction(
      () => {
        const legendID = dataConfiguration?.attributeID('legend')
        return {legendID}
      },
      () => {
        refreshScale()
      }, {fireImmediately: true}
    )
    return () => disposer()
  }, [dataConfiguration, refreshScale])

  useEffect(function respondToSelectionChange() {
    return dataConfiguration?.onAction(action => {
      if (isSelectionAction(action)) {
        refreshScale()
      }
    })
  }, [refreshScale, dataConfiguration])

  useEffect(function respondToHiddenCaseChange() {
  return mstReaction(
    () => dataConfiguration?.hiddenCases.length,
    () => refreshScale(),
    {name: "NumericLegend respondToHiddenCaseChange"}, dataConfiguration)
  }, [dataConfiguration, refreshScale])

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
      setDesiredExtent(layerIndex, 0)
    }
  }, [setDesiredExtent, layerIndex])

  return <svg className='legend-categories' ref={elt => setChoroplethElt(elt)} data-testid='legend-categories'>
         </svg>
})
