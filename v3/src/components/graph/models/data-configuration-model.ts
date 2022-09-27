import {Instance, types} from "mobx-state-tree"
import {uniqueId} from "../../../utilities/js-utils"
import {IDataSet} from "../../../data-model/data-set"

export const PlotAttributeUses = ["numeric", "categorical"] as const
export type PlotAttributeUse = typeof PlotAttributeUses[number]


export const AttributeDescription = types
  .model('AttributeDescription', {
    attributeID: types.string,
    use: types.string as unknown as PlotAttributeUse
  })
export interface IAttributeDescription extends Instance<typeof AttributeDescription> {}

export const DataConfigurationModel = types
  .model('DataConfigurationModel', {
    // may not need this id
    id: types.optional(types.identifier, () => uniqueId()),
    // keys are PlotAttributeRoles
    attributeDescriptions: types.map(AttributeDescription),
  })
  .volatile(self => ({
    dataset: undefined as IDataSet | undefined,
    // Cases are maintained as the array of cases plottable given the assigned attribute types
    cases: [] as string[]
  }))
  .views(self => ({
    // Return case IDs for cases that are appropriate for this configuration
    // get cases() {
    //   const isValidNumeric = (caseID:string, attrID:string) => {
    //     return isFinite(Number(self.dataset?.getNumeric(caseID, attrID)))
    //   },
    //     isValidCategorical = (caseID:string, attrID:string) => {
    //       // eslint-disable-next-line eqeqeq
    //     return self.dataset?.getValue(caseID, attrID) != undefined
    //   }
    //   const attrTests:{attrID:string, test:(caseID:string, attrID:string) => boolean}[] = []
    //   for (const role in self.attributeDescriptions) {

    //   }
    //   return self.dataset?.cases.map(aCase => aCase.__id__)
    //     .filter(anID=>{

    //     })
    // }
  }))
  .actions(self => ({
    setDataset(dataset: IDataSet) {
      self.dataset = dataset
    }
  }))
export interface IDataConfigurationModel extends Instance<typeof DataConfigurationModel> {}
