import { registerAdornmentComponentInfo } from "../adornment-component-info"
import { ICreateAdornmentOptions, registerAdornmentContentInfo } from "../adornment-content-info"
import { MovablePointModel } from "../adornment-models"
import { kMovablePointClass, kMovablePointLabelKey, kMovablePointPrefix,
         kMovablePointType } from "./movable-point-types"
import { MovablePoint } from "./movable-point"

registerAdornmentContentInfo({
  type: kMovablePointType,
  plots: ['scatterPlot'],
  prefix: kMovablePointPrefix,
  modelClass: MovablePointModel,
  createModel(options?: ICreateAdornmentOptions) {
    const { graphModel } = options || {}
    const xAxis = graphModel?.getAxis("bottom")
    const yAxis = graphModel?.getAxis("left")
    const xCats = graphModel?.config.categoryArrayForAttrRole("topSplit", []) ?? []
    const yCats = graphModel?.config.categoryArrayForAttrRole("rightSplit", []) ?? []
    const columnCount = xCats.length || 1
    const rowCount = yCats.length || 1
    const totalCount = rowCount * columnCount
    const movablePoint = MovablePointModel.create()
    for (let i = 0; i < totalCount; ++i) {
      const instanceKey = movablePoint.instanceKey(xCats, yCats, i)
      movablePoint.setInitialPoint(xAxis, yAxis, instanceKey)
    }
    return movablePoint
  }
})

registerAdornmentComponentInfo({
  adornmentEltClass: kMovablePointClass,
  Component: MovablePoint,
  labelKey: kMovablePointLabelKey,
  order: 10,
  type: kMovablePointType
})
