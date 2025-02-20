import { stringValuesToDateSeconds } from "../../../utilities/date-utils"
import {
  CategoricalAxisModel, DateAxisModel, EmptyAxisModel, isDateAxisModel, isNumericAxisModel, NumericAxisModel
} from "../../axis/models/axis-model"
import { AxisPlace, AxisPlaces } from "../../axis/axis-types"
import { axisPlaceToAttrRole, graphPlaceToAttrRole } from "../../data-display/data-display-types"
import { PlotType } from "../graphing-types"
import { setNiceDomain } from "../utilities/graph-utils"
import { IGraphContentModel } from "./graph-content-model"
import { GraphLayout } from "./graph-layout"

// keys are [primaryAxisType][secondaryAxisType]
const plotChoices: Record<string, Record<string, PlotType>> = {
  empty: {empty: 'casePlot', numeric: 'dotPlot', categorical: 'dotChart'},
  numeric: {empty: 'dotPlot', numeric: 'scatterPlot', categorical: 'dotPlot'},
  categorical: {empty: 'dotChart', numeric: 'dotPlot', categorical: 'dotChart'}
}

function setPrimaryRoleAndPlotType(graphModel: IGraphContentModel) {
  const dataConfig = graphModel?.dataConfiguration
  const oldPrimaryRole = dataConfig?.primaryRole ?? "x"
  const axisPlace = oldPrimaryRole === "x" ? "bottom" : "left"
  const attributeType = dataConfig?.attributeType(graphPlaceToAttrRole[axisPlace]) ?? 'empty'
  const otherAxisPlace = axisPlace === "bottom" ? "left" : "bottom"
  const otherAttrRole = axisPlaceToAttrRole[otherAxisPlace]
  const otherAttributeType = dataConfig?.attributeType(graphPlaceToAttrRole[otherAxisPlace]) ?? 'empty',
  // Numeric attributes get priority for primaryRole when present. First one that is already present
  // and then the newly assigned one. If there is an already assigned categorical then its place is
  // the primaryRole, or, lastly, the newly assigned place
  primaryRole = ['numeric', 'date'].includes(attributeType)
                    ? oldPrimaryRole
                    : ['numeric', 'date'].includes(otherAttributeType)
                          ? otherAttrRole
                          : attributeType !== 'empty' ? oldPrimaryRole : otherAttrRole
  dataConfig?.setPrimaryRole(primaryRole)
  // TODO COLOR: treat color like categorical for now
  const typeOverrides: Record<string, string> = { color: 'categorical', date: 'numeric', checkbox: 'categorical' },
    primaryType = typeOverrides[attributeType] ?? attributeType,
    secondaryType = typeOverrides[otherAttributeType] ?? otherAttributeType
  // This doesn't actually necessarily index by [primary][secondary], but that doesn't matter.
  graphModel?.setPlotType(plotChoices[primaryType][secondaryType])
}

function setupAxes(graphModel: IGraphContentModel, layout: GraphLayout) {
  const setupAxis = (place: AxisPlace) => {
    const dataConfig = graphModel?.dataConfiguration
    const attrRole = graphPlaceToAttrRole[place],
      attributeID = dataConfig?.attributeID(attrRole),
      attr = attributeID ? dataConfig?.dataset?.attrFromID(attributeID) : undefined,
      primaryRole = dataConfig?.primaryRole,
      secondaryPlace = primaryRole === 'x' ? 'left' : 'bottom',
      attrType = dataConfig?.attributeType(attrRole),
      fallbackType = (place === secondaryPlace && graphModel?.pointsFusedIntoBars) ? 'numeric' : 'empty',
      requiredType = attrType ?? fallbackType,
      currAxisModel = graphModel?.getAxis(place),
      currentType = currAxisModel?.type ?? 'empty'
    switch (requiredType) {
      case 'numeric': {
        if (!currAxisModel || !isNumericAxisModel(currAxisModel)) {
          const newAxisModel = NumericAxisModel.create({place, min: 0, max: 1})
          newAxisModel.setAllowRangeToShrink(true)
          graphModel?.setAxis(place, newAxisModel)
          dataConfig?.setAttributeType(attrRole, 'numeric')
          layout.setAxisScaleType(place, 'linear')
          setNiceDomain(attr?.numValues || [], newAxisModel, graphModel?.axisDomainOptions)
        } else {
          currAxisModel.setAllowRangeToShrink(true)
          setNiceDomain(attr?.numValues || [], currAxisModel, graphModel?.axisDomainOptions)
        }
      }
        break
      case 'categorical':
      case 'color': // TODO COLOR: treat color like categorical for now
      case 'checkbox': { // TODO CHECKBOX: treat checkbox like categorical for now
        if (currentType !== 'categorical') {
          const newAxisModel = CategoricalAxisModel.create({place})
          graphModel?.setAxis(place, newAxisModel)
          dataConfig?.setAttributeType(attrRole, 'categorical')
          layout.setAxisScaleType(place, 'band')
        }
        layout.getAxisMultiScale(place)?.
          setCategorySet(dataConfig?.categorySetForAttrRole(attrRole))
      }
        break
      case 'date': {
        if (!currAxisModel || !isDateAxisModel(currAxisModel)) {
          const newAxisModel = DateAxisModel.create({place, min: 0, max: 1})
          newAxisModel.setAllowRangeToShrink(true)
          graphModel?.setAxis(place, newAxisModel)
          dataConfig?.setAttributeType(attrRole, 'date')
          layout.setAxisScaleType(place, 'linear')
          const valuesInSeconds = stringValuesToDateSeconds(attr?.strValues || [])
          setNiceDomain(valuesInSeconds, newAxisModel, graphModel?.axisDomainOptions)
        }
        else {
          currAxisModel.setAllowRangeToShrink(true)
          const valuesInSeconds = stringValuesToDateSeconds(attr?.strValues || [])
          setNiceDomain(valuesInSeconds, currAxisModel, graphModel?.axisDomainOptions)
        }
      }
        break
      case 'empty': {
        if (currentType !== 'empty') {
          layout.setAxisScaleType(place, 'ordinal')
          if (['left', 'bottom'].includes(place)) {
            graphModel?.setAxis(place, EmptyAxisModel.create({place}))
          }
          else {
            graphModel?.removeAxis(place)
          }
        }
      }
    }
  }

  AxisPlaces.forEach(setupAxis)
}

export function syncModelWithAttributeConfiguration(graphModel: IGraphContentModel, layout: GraphLayout) {
  setPrimaryRoleAndPlotType(graphModel)
  setupAxes(graphModel, layout)
}
