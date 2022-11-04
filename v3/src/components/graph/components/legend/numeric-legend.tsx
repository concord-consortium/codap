import React, {memo} from "react"

interface INumericLegendProps {
  legendAttrID: string
  transform:string
}

export const NumericLegend = memo(function NumericLegend({legendAttrID}: INumericLegendProps) {
/*
  const dataConfiguration = useDataConfigurationContext(),
    values = dataConfiguration?.numericValuesForAttrRole('legend')
*/

  return (
    <></>
  )
})
NumericLegend.displayName = "NumericLegend"
