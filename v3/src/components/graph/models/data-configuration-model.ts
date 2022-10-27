import {Instance, ISerializedActionCall, onAction, SnapshotIn, types} from "mobx-state-tree"
import {attributeTypes} from "../../../models/data/attribute"
import {IDataSet} from "../../../models/data/data-set"
import {SetCaseValuesAction} from "../../../models/data/data-set-actions"
import {FilteredCases, IFilteredChangedCases} from "../../../models/data/filtered-cases"
import {uniqueId} from "../../../utilities/js-utils"
import {kellyColors, missingColor} from "../../../utilities/color-utils"

export const PrimaryAttrRoles = ['x', 'y'] as const
export const TipAttrRoles = [...PrimaryAttrRoles, 'legend', 'caption', 'y2'] as const
export const GraphAttrRoles = [
  ...TipAttrRoles, 'polygon', 'topSplit', 'rightSplit'] as const
export type GraphAttrRole = typeof GraphAttrRoles[number]

export const AttributeDescription = types
  .model('AttributeDescription', {
    attributeID: types.string,
    // user-specified type, e.g. treat as numeric
    type: types.maybe(types.enumeration([...attributeTypes]))
  })

export interface IAttributeDescription extends Instance<typeof AttributeDescription> {
}

export interface IAttributeDescriptionSnapshot extends SnapshotIn<typeof AttributeDescription> {
}

export const DataConfigurationModel = types
  .model('DataConfigurationModel', {
    id: types.optional(types.identifier, () => uniqueId()),
    // determines stacking direction in categorical-categorical, for instance
    primaryPlace: types.maybe(types.enumeration([...PrimaryAttrRoles])),
    // keys are GraphAttrRoles
    attributeDescriptions: types.map(AttributeDescription)
  })
  .volatile(self => ({
    dataset: undefined as IDataSet | undefined,
    actionHandlerDisposer: undefined as (() => void) | undefined,
    filteredCases: undefined as FilteredCases | undefined,
    handlers: new Map<string,(actionCall: ISerializedActionCall) => void>()
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
  .views(self => ({
    filterCase(data: IDataSet, caseID: string) {
      return Array.from(self.attributeDescriptions.entries()).every(([place, {attributeID}]) => {
        // can still plot the case without a caption
        if (place === "caption") return true
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
        const changedCases = actionCall.args[0].filter(aCase => idSet.has(aCase.__id__))
        self.handlers.forEach(handler => handler({name: "setCaseValues", args: [changedCases]}))
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
        const categories = Array.from(this.categorySetForPlace('legend'))
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
      valuesForPlace(place: GraphAttrRole): string[] {
        const attrID = self.attributeID(place),
          dataset = self.dataset,
          // todo: The following interferes with sorting by legend ID because we're bypassing get cases where the
          //  sorting happens. But we can't call get cases without introducing infinite loop
          caseIDs = self.filteredCases?.caseIds || []
        return attrID ? caseIDs.map(anID => String(dataset?.getValue(anID, attrID)))
          .filter(aValue => aValue !== '') : []
      },
      numericValuesForPlace(place: GraphAttrRole): number[] {
        return this.valuesForPlace(place).map((aValue: string) => Number(aValue))
          .filter((aValue: number) => isFinite(aValue))
      },
      categorySetForPlace(place: GraphAttrRole): Set<string> {
        const result: Set<string> = new Set(this.valuesForPlace(place).sort())
        if (result.size === 0) {
          result.add('__main__')
        }
        return result
      }
    }))
  .views(self => (
    {
      getLegendColorForCategory(cat: string):string {
        const catIndex = Array.from(self.categorySetForPlace('legend')).indexOf(cat)
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
      }
    }))
  .views(self => (
    {
      getLegendColorForCase(id: string):string {
        const legendID = self.attributeID('legend'),
          legendValue = id && legendID ? self.dataset?.getValue(id, legendID) : null
        return legendValue == null ? '' : self.getLegendColorForCategory( legendValue)
      },
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
    setPrimaryPlace(aPlace: GraphAttrRole) {
      if (aPlace === 'x' || aPlace === 'y') {
        self.primaryPlace = aPlace
      }
    },
    setAttribute(place: GraphAttrRole, desc?: IAttributeDescriptionSnapshot) {
      if (desc) {
        self.attributeDescriptions.set(place, desc)
      } else {
        self.attributeDescriptions.delete(place)
      }
      self.filteredCases?.invalidateCases()
    },
    onAction(handler: (actionCall: ISerializedActionCall) => void) {
      const id = uniqueId()
      self.handlers.set(id, handler)
      return () => {
        self.handlers.delete(id)
      }
    }
  }))

export interface IDataConfigurationModel extends Instance<typeof DataConfigurationModel> {
}

export interface IDataConfigurationSnapshot extends SnapshotIn<typeof DataConfigurationModel> {
}
