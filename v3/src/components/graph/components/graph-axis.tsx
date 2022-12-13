import React, { MutableRefObject } from "react"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { AxisPlace } from "../../axis/axis-types"
import { Axis } from "../../axis/components/axis"
import { axisPlaceToAttrRole, GraphPlace, kGraphClassSelector } from "../graphing-types"
import t from "../../../utilities/translation/translate"
import { observer } from "mobx-react-lite"
import { useGraphModelContext } from "../models/graph-model"

interface IProps {
  place: AxisPlace
  enableAnimation: MutableRefObject<boolean>
  onDropAttribute?: (place: AxisPlace, attrId: string) => void
  onTreatAttributeAs?: (place: GraphPlace, attrId: string, treatAs: string) => void
}

export const GraphAxis = observer(({ place, enableAnimation, onDropAttribute, onTreatAttributeAs }: IProps) => {
  const dataset = useDataSetContext()
  const graphModel = useGraphModelContext()
  const role = axisPlaceToAttrRole[place]
  const attrId = graphModel.getAttributeID(role)
  const label = (attrId && dataset?.attrFromID(attrId)?.name) || t('DG.AxisView.emptyGraphCue')

  return (
    <Axis parentSelector={kGraphClassSelector}
          getAxisModel={() => graphModel.getAxis(place)}
          label={label}
          enableAnimation={enableAnimation}
          showScatterPlotGridLines={graphModel.plotType === 'scatterPlot'}
          centerCategoryLabels={graphModel.config.categoriesForAxisShouldBeCentered(place)}
          onDropAttribute={onDropAttribute}
          onTreatAttributeAs={onTreatAttributeAs}
    />
  )
})
