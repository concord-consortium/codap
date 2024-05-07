import {ScaleQuantile, scaleQuantile, schemeBlues} from "d3"
import {reaction} from "mobx"
import {observer} from "mobx-react-lite"
import React, {useCallback, useEffect, useRef, useState} from "react"
import {isSelectionAction} from "../../../../models/data/data-set-actions"
import { selectCases, setSelectedCases } from "../../../../models/data/data-set-utils"
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
        valuesRef.current = dataConfiguration?.numericValuesForAttrRole('legend') ?? []
        setDesiredExtent(layerIndex, computeDesiredExtent())
        quantileScale.current.domain(valuesRef.current).range(schemeBlues[5])
        choroplethLegend(quantileScale.current, choroplethElt,
          {
            width: tileWidth,
            marginLeft: 6, marginTop: labelHeight, marginRight: 6, ticks: 5,
            clickHandler: (quantile: number, extend: boolean) => {
              const dataset = dataConfiguration?.dataset
              const quantileCases = dataConfiguration?.casesForLegendQuantile(quantile)
              if (quantileCases) {
                if (extend) selectCases(quantileCases, dataset)
                else setSelectedCases(quantileCases, dataset)
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
