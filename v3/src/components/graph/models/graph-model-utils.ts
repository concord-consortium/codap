import { AttributeType, isCategoricalAttributeType } from "../../../models/data/attribute-types"
import { stringValuesToDateSeconds } from "../../../utilities/date-utils"
import { setNiceDomain } from "../../axis/axis-domain-utils"
import { AxisPlace, AxisPlaces, IScaleType } from "../../axis/axis-types"
import {
  CategoricalAxisModel, ColorAxisModel, DateAxisModel, EmptyAxisModel, IAxisModel, isBaseNumericAxisModel, isCategoricalAxisModel,
  isCategoricalOrColorAxisModel,
  isColorAxisModel,
  isDateAxisModel, isEmptyAxisModel, isNumericAxisModel, NumericAxisModel
} from "../../axis/models/axis-model"
import { graphPlaceToAttrRole } from "../../data-display/data-display-types"
import { IGraphContentModel } from "./graph-content-model"
import { GraphLayout } from "./graph-layout"

function setPrimaryRoleAndPlotType(graphModel: IGraphContentModel) {
  graphModel?.syncPrimaryRoleWithAttributeConfiguration()
  const result = graphModel?.syncPlotWithAttributeConfiguration()
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
    else if (isColorAxisModel(axisModel)) {
      if (isCategoricalAttributeType(attributeType)) return
      newAttributeType = "color"
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
    else if (isCategoricalOrColorAxisModel(axisModel)) {
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
        if (attributeType) {
          if (attributeType === "color" && isColorAxisModel(currAxisModel) ||
              attributeType === "categorical" && isCategoricalAxisModel(currAxisModel)) {
            newAxisModel = currAxisModel
          } else {
            newAxisModel = attributeType === "color"
                            ? ColorAxisModel.create({ place })
                            : CategoricalAxisModel.create({ place })
          }
        }
        // newAxisModel = isCategoricalAxisModel(currAxisModel)
        //                 ? currAxisModel
        //                 : CategoricalAxisModel.create({ place })
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
        if (attributeType === "color" && isColorAxisModel(currAxisModel) ||
          attributeType === "categorical" && isCategoricalAxisModel(currAxisModel)) {
          newAxisModel = currAxisModel
        } else {
          newAxisModel = attributeType === "color"
                          ? ColorAxisModel.create({ place })
                          : CategoricalAxisModel.create({ place })
        }
        // newAxisModel = isCategoricalAxisModel(currAxisModel)
        //                 ? currAxisModel
        //                 : CategoricalAxisModel.create({ place })
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

      if (isCategoricalOrColorAxisModel(newAxisModel)) {
        const categorySet = dataConfig.categorySetForAttrRole(attributeRole)
        layout.getAxisMultiScale(place)?.setCategorySet(categorySet)
      }
    }
    else {
      if (currAxisModel) {
        graphModel.removeAxis(place)
      }
    }
  }

  AxisPlaces.forEach(setupAxis)
}

export function syncModelWithAttributeConfiguration(graphModel: IGraphContentModel, layout: GraphLayout) {
  const result = setPrimaryRoleAndPlotType(graphModel)
  setupAxes(graphModel, layout)
  return result
}
