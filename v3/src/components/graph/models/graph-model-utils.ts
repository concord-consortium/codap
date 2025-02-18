import { AttributeType, isCategoricalAttributeType } from "../../../models/data/attribute-types"
import { stringValuesToDateSeconds } from "../../../utilities/date-utils"
import {
  CategoricalAxisModel, DateAxisModel, EmptyAxisModel, IAxisModel, isBaseNumericAxisModel, isCategoricalAxisModel,
  isDateAxisModel, isEmptyAxisModel, isNumericAxisModel, NumericAxisModel
} from "../../axis/models/axis-model"
import { AxisPlace, AxisPlaces, IScaleType } from "../../axis/axis-types"
import { graphPlaceToAttrRole } from "../../data-display/data-display-types"
import { setNiceDomain } from "../utilities/graph-utils"
import { IGraphContentModel } from "./graph-content-model"
import { GraphLayout } from "./graph-layout"

function setPrimaryRoleAndPlotType(graphModel: IGraphContentModel) {
  console.group("setPrimaryRoleAndPlotType")
  graphModel?.syncPrimaryRoleWithAttributeConfiguration()
  const result = graphModel?.syncPlotWithAttributeConfiguration()
  console.groupEnd()
  return result
}

function setupAxes(graphModel: IGraphContentModel, layout: GraphLayout) {

  function syncAttributeTypeWithAxis(place: AxisPlace, attributeType?: AttributeType, axisModel?: IAxisModel) {
    if (!attributeType || !axisModel) return

    let newAttributeType = attributeType
    if (isDateAxisModel(axisModel)) {
      if (attributeType === "date") return
      newAttributeType = "date"
    }
    else if (isNumericAxisModel(axisModel)) {
      if (attributeType === "numeric") return
      newAttributeType = "numeric"
    }
    else if (isCategoricalAxisModel(axisModel)) {
      if (isCategoricalAttributeType(attributeType)) return
      newAttributeType = "categorical"
    }

    if (newAttributeType !== attributeType) {
      graphModel.dataConfiguration.setAttributeType(graphPlaceToAttrRole[place], newAttributeType)
    }
  }

  function syncAxisScaleTypeWithAxis(place: AxisPlace, axisModel?: IAxisModel) {
    let scaleType: IScaleType = "ordinal"
    if (isBaseNumericAxisModel(axisModel)) {
      scaleType = "linear"
    }
    else if (isCategoricalAxisModel(axisModel)) {
      scaleType = "band"
    }
    layout.setAxisScaleType(place, scaleType)
  }

  const setupAxis = (place: AxisPlace) => {
    if (!graphModel) return
    const dataConfig = graphModel.dataConfiguration
    const isPrimaryPlace = place === graphModel.primaryPlace
    const isSecondaryPlace = place === graphModel.secondaryPlace
    const attributeRole = graphPlaceToAttrRole[place]
    const attributeType = dataConfig.attributeType(attributeRole)
    const attributeId = dataConfig.attributeID(attributeRole)
    const attribute = dataConfig.dataset?.getAttribute(attributeId)

    const currAxisModel = graphModel.getAxis(place)
    let newAxisModel: Maybe<IAxisModel>
    if (isPrimaryPlace || isSecondaryPlace) {
      newAxisModel = isPrimaryPlace
                      ? graphModel.plot.getValidPrimaryAxis(place, attributeType, currAxisModel)
                      : isSecondaryPlace
                        ? graphModel.plot.getValidSecondaryAxis(place, attributeType, currAxisModel)
                        : currAxisModel ?? EmptyAxisModel.create({ place })
      // create secondary categorical axis model if necessary
      if (isEmptyAxisModel(newAxisModel) && isSecondaryPlace && attributeType) {
        newAxisModel = isCategoricalAxisModel(currAxisModel)
                        ? currAxisModel
                        : CategoricalAxisModel.create({ place })
      }
    }
    else if (place === "rightNumeric") {
      if (attributeType) {
        if (attributeType === "date" && isDateAxisModel(currAxisModel) ||
            attributeType === "numeric" && isNumericAxisModel(currAxisModel)) {
          newAxisModel = currAxisModel
        }
        else {
          newAxisModel = attributeType === "date"
                          ? DateAxisModel.create({ place, min: 0, max: 1 })
                          : NumericAxisModel.create({ place, min: 0, max: 1 })
        }
      }
    }
    else {
      if (attributeType) {
        newAxisModel = isCategoricalAxisModel(currAxisModel)
                        ? currAxisModel
                        : CategoricalAxisModel.create({ place })
      }
    }

    if (newAxisModel) {
      if (newAxisModel !== currAxisModel) {
        graphModel.setAxis(place, newAxisModel)
        syncAttributeTypeWithAxis(place, attributeType, newAxisModel)
        syncAxisScaleTypeWithAxis(place, newAxisModel)
      }

      if (isBaseNumericAxisModel(newAxisModel)) {
        newAxisModel.setAllowRangeToShrink(true)
        const values = isDateAxisModel(newAxisModel)
                        ? stringValuesToDateSeconds(attribute?.strValues || [])
                        : attribute?.numValues || []
        setNiceDomain(values, newAxisModel, graphModel.plot.axisDomainOptions)
      }

      if (isCategoricalAxisModel(newAxisModel)) {
        const categorySet = dataConfig.categorySetForAttrRole(attributeRole)
        layout.getAxisMultiScale(place)?.setCategorySet(categorySet)
      }
    }
    else {
      if (currAxisModel) {
        graphModel.removeAxis(place)
      }
    }

    // const attrRole = graphPlaceToAttrRole[place],
    //   attributeID = dataConfig?.attributeID(attrRole),
    //   attr = attributeID ? dataConfig?.dataset?.attrFromID(attributeID) : undefined,
    //   primaryRole = dataConfig?.primaryRole,
    //   secondaryPlace = primaryRole === 'x' ? 'left' : 'bottom',
    //   attrType = dataConfig?.attributeType(attrRole),
    //   fallbackType = (place === secondaryPlace && graphModel?.pointsFusedIntoBars) ? 'numeric' : 'empty',
    //   requiredType = attrType ?? fallbackType,
    //   currAxisModel = graphModel?.getAxis(place),
    //   currentType = currAxisModel?.type ?? 'empty'
    // switch (requiredType) {
    //   case 'numeric': {
    //     if (!currAxisModel || !isNumericAxisModel(currAxisModel)) {
    //       const newAxisModel = NumericAxisModel.create({place, min: 0, max: 1})
    //       newAxisModel.setAllowRangeToShrink(true)
    //       graphModel?.setAxis(place, newAxisModel)
    //       dataConfig?.setAttributeType(attrRole, 'numeric')
    //       layout.setAxisScaleType(place, 'linear')
    //       setNiceDomain(attr?.numValues || [], newAxisModel, graphModel?.axisDomainOptions)
    //     } else {
    //       currAxisModel.setAllowRangeToShrink(true)
    //       setNiceDomain(attr?.numValues || [], currAxisModel, graphModel?.axisDomainOptions)
    //     }
    //   }
    //     break
    //   case 'categorical':
    //   case 'color': { // TODO COLOR: treat color like categorical for now
    //     if (currentType !== 'categorical') {
    //       const newAxisModel = CategoricalAxisModel.create({place})
    //       graphModel?.setAxis(place, newAxisModel)
    //       dataConfig?.setAttributeType(attrRole, 'categorical')
    //       layout.setAxisScaleType(place, 'band')
    //     }
    //     layout.getAxisMultiScale(place)?.
    //       setCategorySet(dataConfig?.categorySetForAttrRole(attrRole))
    //   }
    //     break
    //   case 'date': {
    //     if (!currAxisModel || !isDateAxisModel(currAxisModel)) {
    //       const newAxisModel = DateAxisModel.create({place, min: 0, max: 1})
    //       newAxisModel.setAllowRangeToShrink(true)
    //       graphModel?.setAxis(place, newAxisModel)
    //       dataConfig?.setAttributeType(attrRole, 'date')
    //       layout.setAxisScaleType(place, 'linear')
    //       const valuesInSeconds = stringValuesToDateSeconds(attr?.strValues || [])
    //       setNiceDomain(valuesInSeconds, newAxisModel, graphModel?.axisDomainOptions)
    //     }
    //     else {
    //       const valuesInSeconds = stringValuesToDateSeconds(attr?.strValues || [])
    //       setNiceDomain(valuesInSeconds, currAxisModel, graphModel?.axisDomainOptions)
    //     }
    //   }
    //     break
    //   case 'empty': {
    //     if (currentType !== 'empty') {
    //       layout.setAxisScaleType(place, 'ordinal')
    //       if (['left', 'bottom'].includes(place)) {
    //         graphModel?.setAxis(place, EmptyAxisModel.create({place}))
    //       }
    //       else {
    //         graphModel?.removeAxis(place)
    //       }
    //     }
    //   }
    // }
  }

  AxisPlaces.forEach(setupAxis)
}

export function syncModelWithAttributeConfiguration(graphModel: IGraphContentModel, layout: GraphLayout) {
  console.group("syncModelWithAttributeConfiguration")
  const result = setPrimaryRoleAndPlotType(graphModel)
  setupAxes(graphModel, layout)
  console.groupEnd()
  return result
}
