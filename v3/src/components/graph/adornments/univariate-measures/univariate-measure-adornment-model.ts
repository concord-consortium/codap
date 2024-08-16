import { Instance, types } from "mobx-state-tree"
import { Point } from "../../../data-display/data-display-types"
import { AdornmentModel, IAdornmentModel, IUpdateCategoriesOptions, PointModel } from "../adornment-models"
import { IDataConfigurationModel } from "../../../data-display/models/data-configuration-model"
import {IGraphDataConfigurationModel} from "../../models/graph-data-configuration-model"
import { isFiniteNumber } from "../../../../utilities/math-utils"
import { dataDisplayGetNumericValue } from "../../../data-display/data-display-value-utils"

export const MeasureInstance = types.model("MeasureInstance", {
  labelCoords: types.maybe(PointModel)
})
.volatile(self => ({
  value: NaN,
  isValid: false
}))
.actions(self => ({
  setLabelCoords(coords: Point) {
    self.labelCoords = PointModel.create(coords)
  },
  setValue(value: number) {
    self.value = value
    self.isValid = true
  },
  setIsValid(isValid: boolean) {
    self.isValid = isValid
  }
}))

export const UnivariateMeasureAdornmentModel = AdornmentModel
  .named("UnivariateMeasureAdornmentModel")
  .props({
    measures: types.map(MeasureInstance),
    showMeasureLabels: false,
    type: types.optional(types.string, () => {
      throw "type must be overridden"
    }),
    labelTitle: types.optional(types.string, () => {
      throw "labelTitle must be overridden"
    }),
  })
  .views(self => ({
    getCaseValues(attrId: string, cellKey: Record<string, string>, dataConfig: IGraphDataConfigurationModel) {
      const dataset = dataConfig?.dataset
      const casesInPlot = dataConfig.subPlotCases(cellKey)
      const caseValues: number[] = []
      casesInPlot.forEach(caseId => {
        const caseValue = dataDisplayGetNumericValue(dataset, caseId, attrId)
        if (isFiniteNumber(caseValue)) {
          caseValues.push(caseValue)
        }
      })
      return caseValues
    },
    getCaseCount(attrId: string, cellKey: Record<string, string>, dataConfig: IGraphDataConfigurationModel) {
      return this.getCaseValues(attrId, cellKey, dataConfig).length
    },
    get isUnivariateMeasure() {
      return true
    },
    get hasRange() {
      return false
    },
    get labelLines() {
      // derived models should override if their labels have multiple lines
      return 1
    },
    computeMeasureRange(attrId: string, cellKey: Record<string, string>, dataConfig: IDataConfigurationModel) {
      // derived models should override if they have a range
      return {min: NaN, max: NaN}
    },
    computeMeasureValue(attrId: string, cellKey: Record<string, string>, dataConfig: IDataConfigurationModel) {
      // derived models should override to compute their respective values
    }
  }))
  .actions(self => ({
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
    },
    setShowMeasureLabels(showLabels: boolean) {
      self.showMeasureLabels = showLabels
    },
    invalidateMeasures() {
      self.measures.forEach(measure => measure.setIsValid(false))
    }
  }))
  .views(self => ({
    // Clients should call measureValue instead of accessing the measure's volatile value property directly.
    // measureValue will compute the value in cases where the volatile property may have been reset to the
    // default. This can happen, for example, when the adornment is added to the graph, then removed and
    // added back again using the undo/redo feature.
    measureValue(attrId: string, cellKey: Record<string, string>, dataConfig: IDataConfigurationModel) {
      const key = self.instanceKey(cellKey)
      const measure = self.measures.get(key)
      if (!measure?.isValid) {
        const newValue = self.computeMeasureValue(attrId, cellKey, dataConfig)
        self.updateMeasureValue(Number(newValue), key)
      }
      return measure?.value
    }
  }))
  .actions(self => ({
    updateCategories(options: IUpdateCategoriesOptions) {
      const { dataConfig, resetPoints } = options
      const { xAttrId, yAttrId, xAttrType } = dataConfig.getCategoriesOptions()
      const attrId = xAttrId && xAttrType === "numeric" ? xAttrId : yAttrId
      dataConfig.getAllCellKeys().forEach(cellKey => {
        const instanceKey = self.instanceKey(cellKey)
        const value = Number(self.computeMeasureValue(attrId, cellKey, dataConfig))
        if (!self.measures.get(instanceKey) || resetPoints) {
          self.addMeasure(value, instanceKey)
        } else {
          self.updateMeasureValue(value, instanceKey)
        }
      })
    }
  }))

export interface IMeasureInstance extends Instance<typeof MeasureInstance> {}
export interface IUnivariateMeasureAdornmentModel extends Instance<typeof UnivariateMeasureAdornmentModel> {}
export function isUnivariateMeasureAdornment(adornment: IAdornmentModel):
  adornment is IUnivariateMeasureAdornmentModel {
    return adornment.isUnivariateMeasure
  }
