import { Instance, types } from "mobx-state-tree"
import { AdornmentModel, IAdornmentModel, IUpdateCategoriesOptions } from "../adornment-models"
import { kPlottedFunctionType, kPlottedFunctionValueTitleKey } from "./plotted-function-adornment-types"
import { ScaleNumericBaseType } from "../../../axis/axis-types"
import { Point } from "../../../data-display/data-display-types"
import { ICase } from "../../../../models/data/data-set-types"
import { IGraphDataConfigurationModel } from "../../models/graph-data-configuration-model"

export const MeasureInstance = types.model("MeasureInstance", {})
.volatile(self => ({
  value: NaN,
  isValid: false
}))
.actions(self => ({
  setValue(value: number) {
    self.value = value
    self.isValid = true
  }
}))

export const PlottedFunctionAdornmentModel = AdornmentModel
  .named("PlottedFunctionAdornmentModel")
  .props({
    type: types.optional(types.literal(kPlottedFunctionType), kPlottedFunctionType),
    expression: types.maybe(types.string),
    labelTitle: types.optional(types.literal(kPlottedFunctionValueTitleKey), kPlottedFunctionValueTitleKey),
    measures: types.map(MeasureInstance)
  })
  .views(self => ({
    get expressionIsNumber() {
      return Number.isFinite(Number(self.expression))
    },
    // This is a modified version of CODAP V2's SvgScene.pathBasis which was extracted from protovis
    pathBasis (p0: Point, p1: Point, p2: Point, p3: Point) {
      /**
       * Matrix to transform basis (b-spline) control points to bezier control
       * points. Derived from FvD 11.2.8.
       */
      const basis = [
        [ 1/6, 2/3, 1/6,   0 ],
        [   0, 2/3, 1/3,   0 ],
        [   0, 1/3, 2/3,   0 ],
        [   0, 1/6, 2/3, 1/6 ]
      ]
    
      /**
       * Returns the point that is the weighted sum of the specified control points,
       * using the specified weights. This method requires that there are four
       * weights and four control points.
       */
      const weight = (w: number[]) => {
        return {
          x: w[0] * p0.x + w[1] * p1.x + w[2] * p2.x + w[3] * p3.x,
          y: w[0] * p0.y  + w[1] * p1.y  + w[2] * p2.y  + w[3] * p3.y
        }
      }
    
      const b1 = weight(basis[1])
      const b2 = weight(basis[2])
      const b3 = weight(basis[3])

      return `C${b1.x},${b1.y},${b2.x},${b2.y},${b3.x},${b3.y}`
    }
  }))
  .views(self => ({
    // This is a modified version of CODAP V2's SvgScene.curveBasis which was extracted from protovis
    curveBasis (points: Point[]) {
        if (points.length <= 2) return ""
        let path = "",
            p0 = points[0],
            p1 = p0,
            p2 = p0,
            p3 = points[1]
        path += self.pathBasis(p0, p1, p2, p3)
        for (let i = 2; i < points.length; i++) {
          p0 = p1
          p1 = p2
          p2 = p3
          p3 = points[i]
          path += self.pathBasis(p0, p1, p2, p3)
        }
        /* Cycle through to get the last point. */
        path += self.pathBasis(p1, p2, p3, p3)
        path += self.pathBasis(p2, p3, p3, p3)
        return path
    },
    getCaseValues(attrId: string, cellKey: Record<string, string>, dataConfig: IGraphDataConfigurationModel) {
      const dataset = dataConfig?.dataset
      const casesInPlot = dataConfig.subPlotCases(cellKey)
      const caseValues: number[] = []
      casesInPlot.forEach((c: ICase) => {
        const caseValue = Number(dataset?.getValue(c.__id__, attrId))
        if (Number.isFinite(caseValue)) {
          caseValues.push(caseValue)
        }
      })
      return caseValues
    }
  }))
  .views(self => ({
    computePoints(
      min: number, max: number, xCellCount: number, yCellCount: number, gap: number,
      xScale: ScaleNumericBaseType, yScale: ScaleNumericBaseType
    ) {
      if (!self.expression) return []
      const tPoints: Point[] = []
      for (let pixelX = min; pixelX <= max; pixelX += gap) {
        const tX = xScale.invert(pixelX * xCellCount)
        const tY = self.expressionIsNumber
          ? Number(self.expression)
          : tX * tX // TODO: Replace with expression evaluation
        if (Number.isFinite(tY)) {
          const pixelY = yScale(tY) / yCellCount
          tPoints.push({ x: pixelX, y: pixelY })
        }
      }

      return tPoints
    }
  }))
  .actions(self => ({
    setExpression(expression: string) {
      self.expression = expression
    },
    addMeasure(value: number, key="{}") {
      const newMeasure = MeasureInstance.create()
      newMeasure.setValue(value)
      self.measures.set(key, newMeasure)
    },
    updateMeasureValue(value: number, key="{}") {
      const measure = self.measures.get(key)
      if (measure) {
        measure.setValue(value)
      }
    },
    removeMeasure(key: string) {
      self.measures.delete(key)
    }
  }))
  .actions(self => ({
    updateCategories(options: IUpdateCategoriesOptions) {
      // TODO: If the comment below will be true of the Plotted Function, like it's true for the Plotted Value,
      // remove everything from this action but the comment. We could also then remove xScale and yScale as 
      // optional items in IUpdateCategoriesOptions and getUpdateCategoriesOptions.

      // Overwrite the super method to do... nothing. GraphContentModel and adornments have their own way of observing
      // actions that should trigger recalculation of basic adornments. However, formulas have more complex dependencies
      // that are not tracked by the graph content model. Rather than splitting observing between GraphContentModel and
      // FormulaManager, we just do nothing here and let the formula manager handle all the scenarios.

      const { xCats, xScale, yCats, yScale, topCats, rightCats, resetPoints, dataConfig } = options
      if (!dataConfig || !xScale || !yScale) return
      const xMin = xScale.domain()[0]
      const xMax = xScale.domain()[1]
      const tPixelMin = xScale(xMin)
      const tPixelMax = xScale(xMax)
      const topCatCount = topCats.length || 1
      const rightCatCount = rightCats.length || 1
      const xCatCount = xCats.length || 1
      const yCatCount = yCats.length || 1
      const columnCount = topCatCount * xCatCount
      const rowCount = rightCatCount * yCatCount
      const totalCount = rowCount * columnCount
      for (let i = 0; i < totalCount; ++i) {
        const cellKey = self.cellKey(options, i)
        const instanceKey = self.instanceKey(cellKey)
        const value = Number(self.computePoints(tPixelMin, tPixelMax, columnCount, rowCount, 1, xScale, yScale))
        if (!self.measures.get(instanceKey) || resetPoints) {
          self.addMeasure(value, instanceKey)
        } else {
          self.updateMeasureValue(value, instanceKey)
        }
      }
    }
  }))

export interface IPlottedFunctionAdornmentModel extends Instance<typeof PlottedFunctionAdornmentModel> {}
export function isPlottedFunctionAdornment(adornment: IAdornmentModel): adornment is IPlottedFunctionAdornmentModel {
  return adornment.type === kPlottedFunctionType
}
