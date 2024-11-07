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
import { IBaseLegendProps } from "./legend-common"

import vars from "../../../vars.scss"

export const NumericLegend =
  observer(function NumericLegend({layerIndex, setDesiredExtent}: IBaseLegendProps) {
  const dataConfiguration = useDataConfigurationContext(),
    tileWidth = useDataDisplayLayout().tileWidth,
    quantileScale = useRef<ScaleQuantile<string>>(scaleQuantile()),
    [choroplethElt, setChoroplethElt] = useState<SVGGElement | null>(null),
    valuesRef = useRef<number[]>([]),
    metadata = dataConfiguration?.metadata,
    legendAttrID = dataConfiguration?.attributeID("legend") ?? "",

    getLabelHeight = useCallback(() => {
      const labelFont = vars.labelFont
      return getStringBounds(dataConfiguration?.dataset?.attrFromID(legendAttrID)?.name ?? '', labelFont).height
    }, [dataConfiguration, legendAttrID]),

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
        /**
         *  Adjust the value range displayed by the legend based on the data configuration model's properties:
         *  1. If all cases are hidden, the legend displays no range.
         *  2. If `displayOnlySelectedCases` is true and not all cases are visible, the legend displays the range of all
         *     cases, both hidden and visible.
         *  3. Otherwise, the legend displays the range of only the visible cases.
         *
         *  TODO: When `displayOnlySelectedCases` is true and all visible cases have the exact same value for the legend
         *  attribute, the legend should only reflect the values of the case(s) shown.
         */
        const allCasesCount = dataConfiguration?.dataset?.items.length ?? 0
        const hiddenCasesCount = dataConfiguration?.hiddenCases.length ?? 0
        const allCasesHidden = hiddenCasesCount === allCasesCount
        if (allCasesHidden) {
          valuesRef.current = []
        } else if (dataConfiguration?.displayOnlySelectedCases && hiddenCasesCount > 0) {
          const attribute = dataConfiguration?.dataset?.attrFromID(dataConfiguration?.attributeID("legend"))
          valuesRef.current = attribute?.numValues ?? []
        } else {
          valuesRef.current = dataConfiguration?.numericValuesForAttrRole("legend") ?? []
        }

        setDesiredExtent(layerIndex, computeDesiredExtent())
        quantileScale.current.domain(valuesRef.current).range(dataConfiguration?.quantileScaleColors ?? schemeBlues[5])
        choroplethLegend(quantileScale.current, choroplethElt,
          {
            isDate: dataConfiguration?.attributeType('legend') === 'date',
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

  useEffect(function respondToColorChange() {
    return mstReaction(
      () => metadata?.getAttributeColorRange(legendAttrID),
      refreshScale, { name: "NumericLegend respondToColorChange" }, metadata
    )
  }, [legendAttrID, metadata, refreshScale])

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
