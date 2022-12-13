import {observable} from "mobx"
import {Instance, ISerializedActionCall, onAction, SnapshotIn, types} from "mobx-state-tree"
import {AttributeType, attributeTypes} from "../../../models/data/attribute"
import {IDataSet} from "../../../models/data/data-set"
import {SetCaseValuesAction} from "../../../models/data/data-set-actions"
import {FilteredCases, IFilteredChangedCases} from "../../../models/data/filtered-cases"
import {uniqueId} from "../../../utilities/js-utils"
import {kellyColors, missingColor} from "../../../utilities/color-utils"
import {GraphAttrRole, graphPlaceToAttrRole, PrimaryAttrRoles, TipAttrRoles} from "../graphing-types"
import {AxisPlace} from "../../axis/axis-types"

export const AttributeDescription = types
  .model('AttributeDescription', {
    attributeID: types.string,
    // user-specified type, e.g. treat as numeric
    type: types.maybe(types.enumeration([...attributeTypes]))
  })
  .actions(self => ({
    setType( type: AttributeType) {
      self.type = type
    }
  }))

export interface IAttributeDescription extends Instance<typeof AttributeDescription> {
}

export interface IAttributeDescriptionSnapshot extends SnapshotIn<typeof AttributeDescription> {
}

export const DataConfigurationModel = types
  .model('DataConfigurationModel', {
    id: types.optional(types.identifier, () => uniqueId()),
    // determines stacking direction in categorical-categorical, for instance
    primaryRole: types.maybe(types.enumeration([...PrimaryAttrRoles])),
    // keys are GraphAttrRoles
    attributeDescriptions: types.map(AttributeDescription)
  })
  .volatile(self => ({
    dataset: undefined as IDataSet | undefined,
    actionHandlerDisposer: undefined as (() => void) | undefined,
    filteredCases: undefined as FilteredCases | undefined,
    handlers: new Map<string,(actionCall: ISerializedActionCall) => void>(),
    categorySets: observable.map<GraphAttrRole, Set<string> | null>()
  }))
  .views(self => ({
    get defaultCaptionAttributeID() {
      // In v2, the caption is the attribute left-most in the child-most collection among plotted attributes
      // Until we have better support for hierarchical attributes, we just return the left-most attribute.
      return self.dataset?.attributes[0]?.id
    },
    attributeID(place: GraphAttrRole) {
      let attrID = self.attributeDescriptions.get(place)?.attributeID
      if ((place === "caption") && !attrID) {
        attrID = this.defaultCaptionAttributeID
      }
      return attrID
    },
    attributeType(place: GraphAttrRole) {
      const desc = self.attributeDescriptions.get(place)
      const attrID = this.attributeID(place)
      const attr = attrID && self.dataset?.attrFromID(attrID)
      return desc?.type || attr?.type
    },
    get places() {
      const places = new Set<string>(self.attributeDescriptions.keys())
      self.dataset?.attributes.length && places.add("caption")
      return Array.from(places) as GraphAttrRole[]
    }
  }))
  .actions(self => ({
    clearCategorySets() {
      self.categorySets.clear()
    },
  }))
  .views(self => ({
    filterCase(data: IDataSet, caseID: string) {
      return Array.from(self.attributeDescriptions.entries()).every(([place, {attributeID}]) => {
        // can still plot the case without a caption or a legend
        if (["caption", "legend"].includes(place)) return true
        switch (self.attributeType(place as GraphAttrRole)) {
          case "numeric":
            return isFinite(data.getNumeric(caseID, attributeID) ?? NaN)
          default:
            // for now, all other types must just be non-empty
            return !!data.getValue(caseID, attributeID)
        }
      })
    },
    handleAction(actionCall: ISerializedActionCall) {
      // forward all actions from dataset except "setCaseValues" which requires intervention
      if (actionCall.name === "setCaseValues") return
      self.handlers.forEach(handler => handler(actionCall))
    },
    handleSetCaseValues(actionCall: SetCaseValuesAction, cases: IFilteredChangedCases) {
      let [affectedCases, affectedAttrIDs] = actionCall.args
      // this is called by the FilteredCases object with additional information about
      // whether the value changes result in adding/removing any cases from the filtered set
      // a single call to setCaseValues can result in up to three calls to the handlers
      if (cases.added.length) {
        const newCases = self.dataset?.getCases(cases.added)
        self.handlers.forEach(handler => handler({name: "addCases", args: [newCases]}))
      }
      if (cases.removed.length) {
        self.handlers.forEach(handler => handler({name: "removeCases", args: [cases.removed]}))
      }
      if (cases.changed.length) {
        const idSet = new Set(cases.changed)
        const changedCases = affectedCases.filter(aCase => idSet.has(aCase.__id__))
        self.handlers.forEach(handler => handler({name: "setCaseValues", args: [changedCases]}))
      }
      // Changes to case values require that existing cached categorySets be wiped.
      // But if we know the ids of the attributes involved, we can determine whether
      // an attribute that has a cache is involved
      if (!affectedAttrIDs && affectedCases.length === 1) {
        affectedAttrIDs = Object.keys(affectedCases[0])
      }
      if (affectedAttrIDs) {
        self.attributeDescriptions.forEach((desc, key: GraphAttrRole) => {
          if (affectedAttrIDs.includes(desc.attributeID)) {
            self.categorySets.set(key, null)
          }
        })
      } else {
        self.clearCategorySets()
      }
    }
  }))
  .views(self => ({
    get attributes() {
      return self.places.map(place => self.attributeID(place))
    },
    get uniqueAttributes() {
      return Array.from(new Set<string>(this.attributes))
    },
    get tipAttributes() {
      return TipAttrRoles
        .map(place => self.attributeID(place))
        .filter(id => !!id) as string[]
    },
    get uniqueTipAttributes() {
      return Array.from(new Set<string>(this.tipAttributes))
    },
    get noAttributesAssigned() {
      // The first attribute is always assigned as 'caption'. So it's really no attributes assigned except for that
      return this.attributes.length <= 1
    },
    get cases() {
      const caseIDs = self.filteredCases?.caseIds || [],
        legendAttrID = self.attributeID('legend')
      if (legendAttrID) {
        const categories = Array.from(this.categorySetForAttrRole('legend'))
        caseIDs.sort((a: string, b: string) => {
          const a_Value = self.dataset?.getValue(a, legendAttrID),
            b_value = self.dataset?.getValue(b, legendAttrID)
          return categories.indexOf(a_Value) - categories.indexOf(b_value)
        })
      }
      return caseIDs
    },
    get selection() {
      if (!self.dataset || !self.filteredCases) return []
      const selection = Array.from(self.dataset.selection)
      return selection.filter((caseId: string) => self.filteredCases?.hasCaseId(caseId))
    }
  }))
  .views(self => (
    {
      valuesForAttrRole(role: GraphAttrRole): string[] {
        const attrID = self.attributeID(role),
          dataset = self.dataset,
          // todo: The following interferes with sorting by legend ID because we're bypassing get cases where the
          //  sorting happens. But we can't call get cases without introducing infinite loop
          caseIDs = self.filteredCases?.caseIds || []
        return attrID ? caseIDs.map(anID => String(dataset?.getValue(anID, attrID)))
          .filter(aValue => aValue !== '') : []
      },
      numericValuesForAttrRole(role: GraphAttrRole): number[] {
        return this.valuesForAttrRole(role).map((aValue: string) => Number(aValue))
          .filter((aValue: number) => isFinite(aValue))
      },
      categorySetForAttrRole(role: GraphAttrRole): Set<string> {
        const existingSet = self.categorySets.get(role)
        if (existingSet) {
          return existingSet
        } else {
          const result: Set<string> = new Set(this.valuesForAttrRole(role).sort())
          if (result.size === 0) {
            result.add('__main__')
          }
          self.categorySets.set(role, result)
          return result
        }
      }
    }))
  .views(self => (
    {
      getLegendColorForCategory(cat: string): string {
        const catIndex = Array.from(self.categorySetForAttrRole('legend')).indexOf(cat)
        return catIndex >= 0 ? kellyColors[catIndex % kellyColors.length] : missingColor
      },
      selectCasesForLegendValue(aValue: string, extend = false) {
        const dataset = self.dataset,
          legendID = self.attributeID('legend'),
          selection = legendID && self.cases.filter((anID: string) => {
            return dataset?.getValue(anID, legendID) === aValue
          })
        if (selection) {
          if (extend) dataset?.selectCases(selection)
          else dataset?.setSelectedCases(selection)
        }
      },
      allCasesForCategorySelected(cat: string) {
        const dataset = self.dataset,
          legendID = self.attributeID('legend'),
          selection = (legendID && self.cases.filter((anID: string) => {
            return dataset?.getValue(anID, legendID) === cat
          })) ?? []
        return selection.length > 0 && (selection as Array<string>).every(anID => dataset?.isCaseSelected(anID))
      }
    }))
  .views(self => (
    {
      getLegendColorForCase(id: string): string {
        const legendID = self.attributeID('legend'),
          legendValue = id && legendID ? self.dataset?.getValue(id, legendID) : null
        return legendValue == null ? '' : self.getLegendColorForCategory(legendValue)
      },
      /**
       * Called to determine whether the categories on an axis should be centered.
       * If the attribute is playing a primary role, then it should be centered.
       * If it is a secondary role, then it should not be centered.
       */
      categoriesForAxisShouldBeCentered(place: AxisPlace) {
        const role = graphPlaceToAttrRole(place),
          primaryRole = self.primaryRole
          return primaryRole === role
      }
    }))
  .actions(self => ({
    setDataset(dataset: IDataSet) {
      self.actionHandlerDisposer?.()
      self.dataset = dataset
      self.actionHandlerDisposer = onAction(self.dataset, self.handleAction, true)
      self.attributeDescriptions.clear()
      self.filteredCases = new FilteredCases({
        source: dataset, filter: self.filterCase,
        onSetCaseValues: self.handleSetCaseValues
      })
    },
    setPrimaryRole(role: GraphAttrRole) {
      if (role === 'x' || role === 'y') {
        self.primaryRole = role
      }
    },
    setAttribute(role: GraphAttrRole, desc?: IAttributeDescriptionSnapshot) {
      if (desc && desc.attributeID !== '') {
        self.attributeDescriptions.set(role, desc)
      } else {
        self.attributeDescriptions.delete(role)
      }
      self.filteredCases?.invalidateCases()
      self.categorySets.set(role, null)
    },
    setAttributeType(role: GraphAttrRole, type: AttributeType) {
      self.attributeDescriptions.get(role)?.setType(type)
      self.filteredCases?.invalidateCases()
      self.categorySets.set(role, null)
    },
    onAction(handler: (actionCall: ISerializedActionCall) => void) {
      const id = uniqueId()
      self.handlers.set(id, handler)
      return () => {
        self.handlers.delete(id)
      }
    }
  }))

export interface SetAttributeTypeAction extends ISerializedActionCall {
  name: "setAttributeType"
  args: [GraphAttrRole, AttributeType]
}

export function isSetAttributeTypeAction(action: ISerializedActionCall): action is SetAttributeTypeAction {
  return action.name === "setAttributeType"
}

export interface IDataConfigurationModel extends Instance<typeof DataConfigurationModel> {
}

export interface IDataConfigurationSnapshot extends SnapshotIn<typeof DataConfigurationModel> {
}
