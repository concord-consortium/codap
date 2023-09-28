import { Instance, types } from "mobx-state-tree"
import { Point } from "../../../data-display/data-display-types"
import { AdornmentModel, IAdornmentModel, IUpdateCategoriesOptions, PointModel } from "../adornment-models"
import { IDataConfigurationModel } from "../../../data-display/models/data-configuration-model"
import { ICase } from "../../../../models/data/data-set-types"

export const MeasureInstance = types.model("MeasureInstance", {
  labelCoords: types.maybe(PointModel),
  value: types.optional(types.number, 0)
})
.actions(self => ({
  setLabelCoords(coords: Point) {
    self.labelCoords = PointModel.create(coords)
  },
  setValue(value: number) {
    self.value = value
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
  })
  .views(self => ({
    getCaseValues(attrId: string, cellKey: Record<string, string>, dataConfig: IDataConfigurationModel) {
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
    },
    get isUnivariateMeasure() {
      return true
    }
  }))
  .actions(self => ({
    getMeasureValue(attrId: string, cellKey: Record<string, string>, dataConfig: IDataConfigurationModel) {
      // derived models should override to update their models when categories change
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
    },
    setShowMeasureLabels(showLabels: boolean) {
      self.showMeasureLabels = showLabels
    }
  }))
  .actions(self => ({
    updateCategories(options: IUpdateCategoriesOptions) {
      const { xAttrId, xCats, yAttrId, yCats, topCats, rightCats, resetPoints, dataConfig } = options
      if (!dataConfig) return
      const topCatCount = topCats.length || 1
      const rightCatCount = rightCats.length || 1
      const xCatCount = xCats.length || 1
      const yCatCount = yCats.length || 1
      const columnCount = topCatCount * xCatCount
      const rowCount = rightCatCount * yCatCount
      const totalCount = rowCount * columnCount
      const attrId = xAttrId && dataConfig.attributeType("x") ? xAttrId : yAttrId
      for (let i = 0; i < totalCount; ++i) {
        const cellKey = self.setCellKey(options, i)
        const instanceKey = self.instanceKey(cellKey) 
        const value = Number(self.getMeasureValue(attrId, cellKey, dataConfig))
        if (!self.measures.get(instanceKey) || resetPoints) {
          self.addMeasure(value, instanceKey)
        } else {
          self.updateMeasureValue(value, instanceKey)
        }
      }
    }
  }))

export interface IMeasureInstance extends Instance<typeof MeasureInstance> {}
export interface IUnivariateMeasureAdornmentModel extends Instance<typeof UnivariateMeasureAdornmentModel> {}
export function isUnivariateMeasureAdornment(adornment: IAdornmentModel):
  adornment is IUnivariateMeasureAdornmentModel {
    return adornment.isUnivariateMeasure
  }
