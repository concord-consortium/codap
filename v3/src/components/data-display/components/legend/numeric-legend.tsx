import { observer } from "mobx-react-lite"
import { useCallback, useEffect, useState } from "react"
import { setOrExtendSelection } from "../../../../models/data/data-set-utils"
import { mstAutorun } from "../../../../utilities/mst-autorun"
import { axisGap, labelPaddingY } from "../../../axis/axis-types"
import { getStringBounds } from "../../../axis/axis-utils"
import { kChoroplethHeight } from "../../data-display-types"
import { useDataConfigurationContext } from "../../hooks/use-data-configuration-context"
import { useDataDisplayLayout } from "../../hooks/use-data-display-layout"
import { choroplethLegend } from "./choropleth-legend/choropleth-legend"
import { IBaseLegendProps } from "./legend-common"

import vars from "../../../vars.scss"

export const NumericLegend =
  observer(function NumericLegend({layerIndex, setDesiredExtent}: IBaseLegendProps) {
  const dataConfiguration = useDataConfigurationContext(),
    tileWidth = useDataDisplayLayout().tileWidth,
    [choroplethElt, setChoroplethElt] = useState<SVGGElement | null>(null),
    legendAttrID = dataConfiguration?.attributeID("legend") ?? "",

    getLabelHeight = useCallback(() => {
      const labelFont = vars.labelFont
      return getStringBounds(dataConfiguration?.dataset?.attrFromID(legendAttrID)?.name ?? '', labelFont).height
    }, [dataConfiguration, legendAttrID])

  useEffect(() => mstAutorun(
    () => {
      const numberHeight = getStringBounds('0').height
      const labelHeight = getLabelHeight()
      const computeDesiredExtent = () => {
        if (dataConfiguration?.placeCanHaveZeroExtent('legend')) {
          return 0
        }
        // The label's background rect spans labelHeight + 2 * labelPaddingY vertically
        // (paddingY above and below the text), so the choropleth needs to clear that.
        return labelHeight + 2 * labelPaddingY + kChoroplethHeight + numberHeight + 2 * axisGap
      }

      if (!choroplethElt || !dataConfiguration) return

      setDesiredExtent(layerIndex, computeDesiredExtent())
      // Group thousands (e.g. "10,000") for ordinary numeric legends, but not for year-like
      // attributes — years are typed numeric (not date), so isDate won't catch them. This mirrors
      // getNumFormatterForAttribute, which suppresses grouping for inferred year types.
      const legendAttr = dataConfiguration.dataset?.attrFromID(legendAttrID)
      // Display the effective legend range as the endpoint labels so the legend matches the user-set
      // Min/Max even in quantile mode (whose trained domain is the data quantiles, not the override
      // range); in logarithmic mode this is the positive log domain (floored to the smallest positive
      // value), not the raw override/data extent.
      const { min: legendMin, max: legendMax } = dataConfiguration.legendDisplayRange
      choroplethLegend(dataConfiguration.legendNumericColorScale, choroplethElt,
        {
          isDate: dataConfiguration.attributeType('legend') === 'date',
          useGrouping: !legendAttr?.isInferredYearType(),
          logarithmic: dataConfiguration.legendIsLogarithmic,
          width: tileWidth, legendMin, legendMax,
          binDataExtents: dataConfiguration.legendBinDataExtents,
          marginLeft: 6, marginTop: labelHeight + 2 * labelPaddingY, marginRight: 6, ticks: 5,
          clickHandler: (bin: number, extend: boolean) => {
            const dataset = dataConfiguration.dataset
            const binCases = dataConfiguration.getCasesForLegendBin(bin)
            if (binCases) {
              setOrExtendSelection(binCases, dataset, extend)
            }
          },
          casesInBinSelectedHandler: (bin: number) => {
            return !!dataConfiguration?.casesInBinAreSelected(bin)
          }
        })
    },
    {
      name: "NumericLegend render"
    },
    [dataConfiguration]
  ),
  [choroplethElt, dataConfiguration, getLabelHeight, layerIndex, legendAttrID, setDesiredExtent, tileWidth])

  // Reactions to check
  // - changing attribute by menu
  // - changing attribute by dragging
  // - selecting points in table
  // - selecting points in graph
  // - clicking on legend to select points
  // - hide cases?
  // - change attribute color range
  // - update values in the attribute

  useEffect(function cleanup () {
    return () => {
      setDesiredExtent(layerIndex, 0)
    }
  }, [setDesiredExtent, layerIndex])

  return <g className='legend-categories' ref={elt => setChoroplethElt(elt)} data-testid='legend-categories'>
         </g>
})
