import {Instance, SnapshotIn, types} from "mobx-state-tree"
import { attributeTypes } from "../../../data-model/attribute"
import {IDataSet} from "../../../data-model/data-set"
import { FilteredCases } from "../../../data-model/filtered-cases"

export const PrimaryAttrPlaces = ['x', 'y'] as const
export const TipAttrPlaces = [...PrimaryAttrPlaces, 'caption', 'y2'] as const
export const GraphAttrPlaces = [
              ...TipAttrPlaces, 'legend', 'polygon', 'topSplit', 'rightSplit'] as const
export type GraphAttrPlace = typeof GraphAttrPlaces[number]

export const AttributeDescription = types
  .model('AttributeDescription', {
    attributeID: types.string,
    // user-specified type, e.g. treat as numeric
    type: types.maybe(types.enumeration([...attributeTypes]))
  })
export interface IAttributeDescription extends Instance<typeof AttributeDescription> {}
export interface IAttributeDescriptionSnapshot extends SnapshotIn<typeof AttributeDescription> {}

export const DataConfigurationModel = types
  .model('DataConfigurationModel', {
    // determines stacking direction in categorical-categorical, for instance
    primaryPlace: types.maybe(types.enumeration([...PrimaryAttrPlaces])),
    // keys are GraphAttrPlaces
    attributeDescriptions: types.map(AttributeDescription)
  })
  .volatile(self => ({
    dataset: undefined as IDataSet | undefined,
    filteredCases: undefined as FilteredCases | undefined
  }))
  .views(self => ({
    get defaultCaptionAttributeID() {
      // In v2, the caption is the attribute left-most in the child-most collection among plotted attributes
      // Until we have better support for hierarchical attributes, we just return the left-most attribute.
      return self.dataset?.attributes[0]?.id
    },
    attributeID(place: GraphAttrPlace) {
      let attrID = self.attributeDescriptions.get(place)?.attributeID
      if ((place === "caption") && !attrID) {
        attrID = this.defaultCaptionAttributeID
      }
      return attrID
    },
    attributeType(place: GraphAttrPlace) {
      const desc = self.attributeDescriptions.get(place)
      const attrID = this.attributeID(place)
      const attr = attrID && self.dataset?.attrFromID(attrID)
      return desc?.type || attr?.type
    },
    get places() {
      const places = new Set<string>(self.attributeDescriptions.keys())
      self.dataset?.attributes.length && places.add("caption")
      return Array.from(places) as GraphAttrPlace[]
    }
  }))
  .views(self => ({
    filterCase(data: IDataSet, caseID: string) {
      return Array.from(self.attributeDescriptions.entries()).every(([place, { attributeID }]) => {
        // can still plot the case without a caption
        if (place === "caption") return true
        switch (self.attributeType(place as GraphAttrPlace)) {
          case "numeric":
            return isFinite(data.getNumeric(caseID, attributeID) ?? NaN)
          default:
            // for now, all other types must just be non-empty
            return !!data.getValue(caseID, attributeID)
        }
      })
    },
  }))
  .views(self => ({
    get attributes() {
      return self.places.map(place => self.attributeID(place))
    },
    get uniqueAttributes() {
      return Array.from(new Set<string>(this.attributes))
    },
    get tipAttributes() {
      return TipAttrPlaces
              .map(place => self.attributeID(place))
              .filter(id => !!id) as string[]
    },
    get uniqueTipAttributes() {
      return Array.from(new Set<string>(this.tipAttributes))
    },
    get cases() {
      return self.filteredCases?.caseIds || []
    }
  }))
  .actions(self => ({
    setDataset(dataset: IDataSet) {
      self.dataset = dataset
      self.attributeDescriptions.clear()
      self.filteredCases = new FilteredCases(dataset, self.filterCase)
    },
    setAttribute(place: GraphAttrPlace, desc?: IAttributeDescriptionSnapshot) {
      if (desc) {
        self.attributeDescriptions.set(place, desc)
      }
      else {
        self.attributeDescriptions.delete(place)
      }
    },
    setPrimaryPlace( aPlace: GraphAttrPlace) {
      if( aPlace === 'x' || aPlace === 'y') {
        self.primaryPlace = aPlace
      }
    }
  }))
export interface IDataConfigurationModel extends Instance<typeof DataConfigurationModel> {}
export interface IDataConfigurationSnapshot extends SnapshotIn<typeof DataConfigurationModel> {}
