import { AttributeType } from "../../../models/data/attribute-types"
import { stringValuesToDateSeconds } from "../../../utilities/date-utils"
import { setNiceDomain } from "../../axis/axis-domain-utils"
import { AxisPlace, AxisPlaces, IScaleType } from "../../axis/axis-types"
import { EmptyAxisModel, IAxisModel, isEmptyAxisModel } from "../../axis/models/axis-model"
import {
  CategoricalAxisModel, ColorAxisModel, isAnyCategoricalAxisModel, isCategoricalAxisModel, isColorAxisModel
} from "../../axis/models/categorical-axis-models"
import {
  DateAxisModel, isAnyNumericAxisModel, isDateAxisModel, isNumericAxisModel, NumericAxisModel
} from "../../axis/models/numeric-axis-models"
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
      if (attributeType === "color") return
      newAttributeType = "color"
    }
    else if (isCategoricalAxisModel(axisModel)) {
      if (attributeType === "categorical") return
      newAttributeType = "categorical"
    }

    if (newAttributeType !== attributeType) {
      graphModel.dataConfiguration.setAttributeType(graphPlaceToAttrRole[place], newAttributeType)
    }
  }

  function syncAxisScaleTypeWithAxis(place: AxisPlace, axisModel?: IAxisModel) {
    let scaleType: IScaleType = "ordinal"
    if (isAnyNumericAxisModel(axisModel)) {
      scaleType = "linear"
    }
    else if (isAnyCategoricalAxisModel(axisModel)) {
      scaleType = "band"
    }
    layout.setAxisScaleType(place, scaleType)
  }

  function categoricalOrColorAxisModel(place: AxisPlace, currAxisModel?: IAxisModel, attributeType?: AttributeType) {
    if (!attributeType) return

    if (attributeType === "color" && isColorAxisModel(currAxisModel) ||
        attributeType === "categorical" && isCategoricalAxisModel(currAxisModel)) {
      return currAxisModel
    }

    return attributeType === "color"
            ? ColorAxisModel.create({ place })
            : CategoricalAxisModel.create({ place })
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
        newAxisModel = categoricalOrColorAxisModel(place, currAxisModel, attributeType)
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
      newAxisModel = categoricalOrColorAxisModel(place, currAxisModel, attributeType)
    }

    if (newAxisModel) {
      if (newAxisModel !== currAxisModel) {
        graphModel.setAxis(place, newAxisModel)
        syncAttributeTypeWithAxis(place, attributeType, newAxisModel)
        syncAxisScaleTypeWithAxis(place, newAxisModel)
      }

      if (isAnyNumericAxisModel(newAxisModel)) {
        newAxisModel.setAllowRangeToShrink(true)
        const values = isDateAxisModel(newAxisModel)
                        ? stringValuesToDateSeconds(attribute?.strValues || [])
                        : dataConfig.numericValuesForAttrRole(graphPlaceToAttrRole[place])
        setNiceDomain(values, newAxisModel, graphModel.plot.axisDomainOptions)
      }

      if (isAnyCategoricalAxisModel(newAxisModel)) {
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
  setPrimaryRoleAndPlotType(graphModel)
  setupAxes(graphModel, layout)
}
