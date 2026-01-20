import { reaction } from "mobx"
import { observer } from "mobx-react-lite"
import { useCallback, useEffect } from "react"
import {axisGap} from "../../../axis/axis-types"
import {getStringBounds} from "../../../axis/axis-utils"
import {useDataConfigurationContext} from "../../hooks/use-data-configuration-context"
import { IBaseLegendProps } from "./legend-common"

import vars from "../../../vars.scss"

export const ColorLegend = observer(function ColorLegend({layerIndex, setDesiredExtent}: IBaseLegendProps) {
  const dataConfiguration = useDataConfigurationContext()

  const getLabelHeight = useCallback(() => {
    const labelFont = vars.labelFont,
      legendAttrID = dataConfiguration?.attributeID('legend') ?? ''
    return getStringBounds(dataConfiguration?.dataset?.attrFromID(legendAttrID)?.name ?? '', labelFont).height
  }, [dataConfiguration])

  const refreshScale = useCallback(() => {
    const labelHeight = getLabelHeight()
    const computeDesiredExtent = () => {
      if (dataConfiguration?.placeCanHaveZeroExtent('legend')) return 0

      return labelHeight + 2 * axisGap
    }

    setDesiredExtent(layerIndex, computeDesiredExtent())
  }, [dataConfiguration, getLabelHeight, setDesiredExtent, layerIndex])

  useEffect(function refresh() {
    refreshScale()
  }, [refreshScale])

  useEffect(function respondToLayoutChange() {
    return reaction(
      () => dataConfiguration?.attributeID('legend'),
      () => refreshScale(),
      { fireImmediately: true, name: "ColorLegend attributeID" }
    )
  }, [dataConfiguration, refreshScale])

  useEffect(function cleanup () {
    return () => setDesiredExtent(layerIndex, 0)
  }, [setDesiredExtent, layerIndex])

  return <g className='legend-categories' data-testid='legend-categories' />
})
