import React, {useRef} from "react"
import {IDataSet} from "../../../../models/data/data-set"
import {IDataConfigurationModel} from "../../models/data-configuration-model"
import {LegendAttributeLabel} from "./legend-attribute-label"
import {CategoricalLegend} from "./categorical-legend"
import {NumericLegend} from "./numeric-legend"
import {AttributeType} from "../../../../models/data/attribute"
import {GraphPlace} from "../../../axis-graph-shared"

interface ILegendProps {
  dataConfiguration: IDataConfigurationModel
  layerIndex: number
  tileWidth: number
  setDesiredExtent: (layerIndex:number, extent: number) => void
  onDropAttribute: (place: GraphPlace, dataSet: IDataSet, attrId: string) => void
  onRemoveAttribute: (place: GraphPlace, attrId: string) => void
  onTreatAttributeAs: (place: GraphPlace, attrId: string, treatAs: AttributeType) => void
}

export const Legend = function Legend({
                                        dataConfiguration, layerIndex, tileWidth, setDesiredExtent, onDropAttribute,
                                        onTreatAttributeAs, onRemoveAttribute
                                      }: ILegendProps) {
  const legendAttrID = dataConfiguration.attributeID('legend'),
    attrType = dataConfiguration.dataset?.attrFromID(legendAttrID ?? '')?.type,
    legendRef = useRef() as React.RefObject<SVGSVGElement>

  return legendAttrID ? (
    <>
      <svg ref={legendRef} className='legend-component' data-testid='legend-component'>
        <LegendAttributeLabel
          dataConfiguration={dataConfiguration}
          onChangeAttribute={onDropAttribute}
          onRemoveAttribute={onRemoveAttribute}
          onTreatAttributeAs={onTreatAttributeAs}
        />
        {
          attrType === 'categorical'
            ? <CategoricalLegend
              layerIndex={layerIndex}
              tileWidth={tileWidth}
              setDesiredExtent={setDesiredExtent}
              dataConfiguration={dataConfiguration}/>
            : attrType === 'numeric'
              ? <NumericLegend
                layerIndex={layerIndex}
                tileWidth={tileWidth}
                setDesiredExtent={setDesiredExtent}
                dataConfiguration={dataConfiguration}/> : null
        }
      </svg>
    </>

  ) : null
}
Legend.displayName = "Legend"
