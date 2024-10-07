import React, {useRef} from "react"
import {IDataSet} from "../../../../models/data/data-set"
import {LegendAttributeLabel} from "./legend-attribute-label"
import {CategoricalLegend} from "./categorical-legend"
import {NumericLegend} from "./numeric-legend"
import {GraphPlace} from "../../../axis-graph-shared"
import {useDataConfigurationContext} from "../../hooks/use-data-configuration-context"

interface ILegendProps {
  layerIndex: number
  setDesiredExtent: (layerIndex:number, extent: number) => void
  onDropAttribute: (place: GraphPlace, dataSet: IDataSet, attrId: string) => void
}

export const Legend = function Legend({
                                        layerIndex, setDesiredExtent, onDropAttribute
                                      }: ILegendProps) {
  const dataConfiguration = useDataConfigurationContext(),
    legendAttrID = dataConfiguration?.attributeID('legend'),
    attrType = dataConfiguration?.dataset?.attrFromID(legendAttrID ?? '')?.type,
    legendRef = useRef() as React.RefObject<SVGSVGElement>

  return legendAttrID ? (
    <>
      <svg ref={legendRef} className='legend-component' data-testid='legend-component'>
        <LegendAttributeLabel
          onChangeAttribute={onDropAttribute}
        />
        {
          attrType === 'categorical'
            ? <CategoricalLegend
                layerIndex={layerIndex}
                setDesiredExtent={setDesiredExtent}/>
            : attrType === 'numeric' || attrType === 'date'
              ? <NumericLegend
                  layerIndex={layerIndex}
                  setDesiredExtent={setDesiredExtent}/> : null
        }
      </svg>
    </>

  ) : null
}
Legend.displayName = "Legend"
