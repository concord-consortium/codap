import React, {MutableRefObject} from "react"
import {AxisPlace} from "../../axis/axis-types"
import {Axis} from "../../axis/components/axis"
import {axisPlaceToAttrRole, GraphPlace, kGraphClassSelector} from "../graphing-types"
import t from "../../../utilities/translation/translate"
import {observer} from "mobx-react-lite"
import {useGraphModelContext} from "../models/graph-model"
import {useDataConfigurationContext} from "../hooks/use-data-configuration-context"

interface IProps {
  place: AxisPlace
  enableAnimation: MutableRefObject<boolean>
  onDropAttribute?: (place: AxisPlace, attrId: string) => void
  onRemoveAttribute?: (place: AxisPlace, attrId: string) => void
  onTreatAttributeAs?: (place: GraphPlace, attrId: string, treatAs: string) => void
}

export const GraphAxis = observer((
  {place, enableAnimation, onDropAttribute, onRemoveAttribute, onTreatAttributeAs}: IProps) => {
  const dataConfig = useDataConfigurationContext()
  const isDropAllowed = dataConfig?.graphPlaceCanAcceptAttributeIDDrop ?? (() => true)
  const dataset = dataConfig?.dataset
  const graphModel = useGraphModelContext()
  const role = axisPlaceToAttrRole[place]
  const attrId = graphModel.getAttributeID(role)

  const getLabel = () => {
    const isScatterPlot = graphModel.plotType === 'scatterPlot',
      yAttributeDescriptions = dataConfig?.yAttributeDescriptions || []
    return place === 'left' && isScatterPlot
      ? yAttributeDescriptions.map((desc, index) => {
        const isY2 = desc.attributeID === graphModel.getAttributeID('rightNumeric')
        return (desc.attributeID && !isY2 && dataset?.attrFromID(desc.attributeID)?.name) || ''
      }).filter(aName => aName !== '').join(', ')
      : (attrId && dataset?.attrFromID(attrId)?.name) || t('DG.AxisView.emptyGraphCue')
  }

  return (
    <Axis parentSelector={kGraphClassSelector}
          getAxisModel={() => graphModel.getAxis(place)}
          label={getLabel()}
          enableAnimation={enableAnimation}
          showScatterPlotGridLines={graphModel.axisShouldShowGridLines(place)}
          centerCategoryLabels={graphModel.config.categoriesForAxisShouldBeCentered(place)}
          isDropAllowed={isDropAllowed}
          onDropAttribute={onDropAttribute}
          onRemoveAttribute={onRemoveAttribute}
          onTreatAttributeAs={onTreatAttributeAs}
    />
  )
})
