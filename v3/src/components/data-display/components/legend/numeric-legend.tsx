import { observer } from "mobx-react-lite"
import { useCallback, useEffect, useState } from "react"
import { setOrExtendSelection } from "../../../../models/data/data-set-utils"
import { mstAutorun } from "../../../../utilities/mst-autorun"
import { axisGap } from "../../../axis/axis-types"
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
        return labelHeight + kChoroplethHeight + numberHeight + 2 * axisGap
      }

      if (!choroplethElt || !dataConfiguration) return

      setDesiredExtent(layerIndex, computeDesiredExtent())
      choroplethLegend(dataConfiguration.legendNumericColorScale, choroplethElt,
        {
          isDate: dataConfiguration.attributeType('legend') === 'date',
          width: tileWidth,
          marginLeft: 6, marginTop: labelHeight, marginRight: 6, ticks: 5,
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
  [choroplethElt, dataConfiguration, getLabelHeight, setDesiredExtent, tileWidth, layerIndex])

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
