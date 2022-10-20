import React, {memo} from "react"

interface INumericLegendProps {
  legendAttrID: string
}

export const NumericLegend = memo(function NumericLegend({legendAttrID}: INumericLegendProps) {
/*
  const dataConfiguration = useDataConfigurationContext(),
    values = dataConfiguration?.numericValuesForPlace('legend')
*/

  return (
    <></>
  )
})
NumericLegend.displayName = "NumericLegend"
