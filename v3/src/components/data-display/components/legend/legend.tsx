import React, { useRef } from "react"
import { observer } from "mobx-react-lite"
import { IDataSet } from "../../../../models/data/data-set"
import { GraphPlace } from "../../../axis-graph-shared"
import { useDataConfigurationContext } from "../../hooks/use-data-configuration-context"
import { IDataConfigurationModel } from "../../models/data-configuration-model"
import { LegendAttributeLabel } from "./legend-attribute-label"
import { CategoricalLegend } from "./categorical-legend"
import { ColorLegend } from "./color-legend"
import { InoperableLegendMessage } from "./inoperable-legend-message"
import { IBaseLegendProps } from "./legend-common"
import { NumericLegend } from "./numeric-legend"

// This is exported so other users of CODAP can modify its behavior
export const legendComponentManager = {
  legendComponentMap: {
    categorical: CategoricalLegend,
    color: ColorLegend,
    date: NumericLegend,
    numeric: NumericLegend,
    checkbox: CategoricalLegend
  } as Partial<Record<string, React.ComponentType<IBaseLegendProps>>>,

  getLegendComponent(dataConfig: IDataConfigurationModel) {
    const type = dataConfig.attributeType("legend")
    return type && this.legendComponentMap[type]
  }
}

interface ILegendProps {
  layerIndex: number
  setDesiredExtent: (layerIndex:number, extent: number) => void
  onDropAttribute: (place: GraphPlace, dataSet: IDataSet, attrId: string) => void
}

export const Legend = observer(function Legend({
                                        layerIndex, setDesiredExtent, onDropAttribute
                                      }: ILegendProps) {
  const dataConfiguration = useDataConfigurationContext(),
    legendID = dataConfiguration?.attributeID("legend"),
    legendRef = useRef() as React.RefObject<SVGSVGElement>
  // Show a legend when this display can use the attribute, and also when it cannot but the user
  // assigned one anyway, since that case still needs the label, the remove action, and the message.
  const isInoperable = !!dataConfiguration?.legendAttributeIsInoperable
  const canShowLegend = isInoperable || !!dataConfiguration?.isAttributeAllowedForNonAxisRole(legendID)
  if (!canShowLegend) return null
  const attrType = dataConfiguration?.attributeType('legend'),
    LegendComponent = dataConfiguration && legendComponentManager.getLegendComponent(dataConfiguration)

  // Only show the legend if there is a legend role specified in the dataConfiguration
  return attrType || isInoperable ? (
    <>
      <svg ref={legendRef} className='legend-component' data-testid='legend-component'>
        <LegendAttributeLabel
          onChangeAttribute={onDropAttribute}
        />
        {isInoperable
          ? <InoperableLegendMessage layerIndex={layerIndex} setDesiredExtent={setDesiredExtent} />
          : LegendComponent && <LegendComponent layerIndex={layerIndex} setDesiredExtent={setDesiredExtent} />}
      </svg>
    </>
  ) : null
})
