import { Instance, types } from "mobx-state-tree"
import { Point } from "../../../data-display/data-display-types"
import { AdornmentModel, IAdornmentModel, IUpdateCategoriesOptions, PointModel } from "../adornment-models"
import { IDataConfigurationModel } from "../../../data-display/models/data-configuration-model"
import { ICase } from "../../../../models/data/data-set-types"

export const MeasureInstance = types.model("MeasureInstance", {
  labelCoords: types.maybe(PointModel)
})
.volatile(self => ({
  value: 0
}))
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
    getCaseValues(attrId: string, casesInPlot: ICase[], dataConfig: IDataConfigurationModel) {
      const dataset = dataConfig?.dataset
      const caseValues: number[] = []
      casesInPlot.forEach((c: ICase) => {
        const caseValue = Number(dataset?.getValue(c.__id__, attrId))
        if (Number.isInteger(caseValue)) {
          caseValues.push(caseValue)
        }
      })
      return caseValues
    }
  }))
  .actions(self => ({
    getMeasureValue(attrId: string, cellKey: Record<string, string>, dataConfig: IDataConfigurationModel) {
      // derived models should override to update their models when categories change
    },
    setInitialMeasure(value: number, key="{}") {
      const newMeasure = MeasureInstance.create()
      newMeasure.setValue(value)
      self.measures.set(key, newMeasure)
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
      const { xAttrId, yAttrId, topCats, rightCats, resetPoints, dataConfig } = options
      const columnCount = topCats?.length || 1
      const rowCount = rightCats?.length || 1
      const totalCount = rowCount * columnCount
      const attrId = xAttrId ? xAttrId : yAttrId
      for (let i = 0; i < totalCount; ++i) {
        const cellKey = self.setCellKey(options, i)
        const instanceKey = self.instanceKey(cellKey)
        const value = Number(self.getMeasureValue(attrId, cellKey, dataConfig))
        if (!self.measures.get(instanceKey) || resetPoints) {
          self.setInitialMeasure(value, instanceKey)
        }
      }
    }
  }))

export interface IMeasureInstance extends Instance<typeof MeasureInstance> {}
export interface IUnivariateMeasureAdornmentModel extends Instance<typeof UnivariateMeasureAdornmentModel> {}
export function isUnivariateMeasureAdornment(adornment: IAdornmentModel):
  adornment is IUnivariateMeasureAdornmentModel {
    return adornment.type === "UnivariateMeasureAdornmentModel" ||
           adornment.type === "Mean" ||
           adornment.type === "Median"
  }
