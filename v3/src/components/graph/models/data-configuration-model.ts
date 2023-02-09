import {observable} from "mobx"
import {scaleQuantile, ScaleQuantile, schemeBlues} from "d3"
import {getSnapshot, Instance, ISerializedActionCall, onAction, SnapshotIn, types} from "mobx-state-tree"
import {AttributeType, attributeTypes} from "../../../models/data/attribute"
import {IDataSet} from "../../../models/data/data-set"
import {SetCaseValuesAction} from "../../../models/data/data-set-actions"
import {FilteredCases, IFilteredChangedCases} from "../../../models/data/filtered-cases"
import {uniqueId} from "../../../utilities/js-utils"
import {kellyColors, missingColor} from "../../../utilities/color-utils"
import {CaseData, GraphAttrRole, graphPlaceToAttrRole, PrimaryAttrRoles, TipAttrRoles} from "../graphing-types"
import {AxisPlace} from "../../axis/axis-types"

export const AttributeDescription = types
  .model('AttributeDescription', {
    attributeID: types.string,
    // user-specified type, e.g. treat as numeric
    type: types.maybe(types.enumeration([...attributeTypes]))
  })
  .actions(self => ({
    setType(type: AttributeType) {
      self.type = type
    }
  }))

export type RoleAttrIDPair = { role: GraphAttrRole, attributeID: string }

export interface IAttributeDescriptionSnapshot extends SnapshotIn<typeof AttributeDescription> {
}

/**
 * A note about cases:
 * - For situations in which there is exactly one y-attribute, there exists one set of cases, filtered
 *    by the presence of values for all assigned attributes, neglecting caption and legend.
 *  - But when there is more than one y-attribute, there is one set of cases for each y-attribute. So
 *    we have to choose the set of cases we are referring to. To keep the api as simple as possible we provide a
 *    set of access methods that do not require the user to specify which set of cases they are
 *    interested in. For these methods, the assumption is that the caseArrayNumber is 0.
 *  -
 */

export const DataConfigurationModel = types
  .model('DataConfigurationModel', {
    id: types.optional(types.identifier, () => uniqueId()),
    // determines stacking direction in categorical-categorical, for instance
    primaryRole: types.maybe(types.enumeration([...PrimaryAttrRoles])),
    // keys are GraphAttrRoles
    _attributeDescriptions: types.map(AttributeDescription),
    _yAttributeDescriptions: types.array(AttributeDescription),
  })
  .volatile(() => ({
    dataset: undefined as IDataSet | undefined,
    actionHandlerDisposer: undefined as (() => void) | undefined,
    filteredCases: undefined as FilteredCases[] | undefined,
    handlers: new Map<string, (actionCall: ISerializedActionCall) => void>(),
    categorySets: observable.map<GraphAttrRole, Set<string> | null>(),
    pointsNeedUpdating: false
  }))
  .views(self => ({
    get y2AttributeDescriptionIsPresent() {
      return !!self._attributeDescriptions.get('y2')
    },
    // Includes y2 if present
    get yAttributeDescriptions() {
      const descriptions = self._yAttributeDescriptions,
        y2Description = self._attributeDescriptions.get('y2') ?? null
      return descriptions.concat(y2Description ? [y2Description] : [])
    },
    // Includes y2 if present
    get yAttributeIDs() {
      return this.yAttributeDescriptions.map((d: IAttributeDescriptionSnapshot) => d.attributeID)
    },
    /**
     * No attribute descriptions beyond the first for y are returned.
     * The y2 attribute description is also not returned.
     */
    get attributeDescriptions() {
      const descriptions = {...getSnapshot(self._attributeDescriptions)}
      delete descriptions.y2
      if (self._yAttributeDescriptions.length > 0) {
        descriptions.y = self._yAttributeDescriptions[0]
      }
      return descriptions
    },
    get defaultCaptionAttributeID() {
      // In v2, the caption is the attribute left-most in the child-most collection among plotted attributes
      // Until we have better support for hierarchical attributes, we just return the left-most attribute.
      return self.dataset?.attributes[0]?.id
    },
    /**
     * For the 'y' role we return the first y-attribute, for 'y2' we return the last y-attribute.
     * For all other roles we return the attribute description for the role.
     */
    attributeDescriptionForRole(role: GraphAttrRole) {
      return role === 'y' ? this.yAttributeDescriptions[0]
        : role === 'y2' ? self._attributeDescriptions.get('y2')
        : this.attributeDescriptions[role]
    },
    attributeID(role: GraphAttrRole) {
      let attrID = this.attributeDescriptionForRole(role)?.attributeID
      if ((role === "caption") && !attrID) {
        attrID = this.defaultCaptionAttributeID
      }
      return attrID
    },
    attributeType(role: GraphAttrRole) {
      const desc = this.attributeDescriptionForRole(role)
      const attrID = this.attributeID(role)
      const attr = attrID && self.dataset?.attrFromID(attrID)
      return desc?.type || attr?.type
    },
    get places() {
      const places = new Set<string>(Object.keys(this.attributeDescriptions))
      self.dataset?.attributes.length && places.add("caption")
      return Array.from(places) as GraphAttrRole[]
    }
  }))
  .extend(() => {
    // TODO: This is a hack to get around the fact that MST doesn't seem to cache this as expected
    // when implemented as simple view.
    let quantileScale: ScaleQuantile<string> | undefined = undefined

    return {
      views: {
        get legendQuantileScale() {
          if (!quantileScale) {
            quantileScale = scaleQuantile(this.numericValuesForAttrRole('legend'), schemeBlues[5])
          }
          return quantileScale
        },
      },
      actions: {
        invalidateQuantileScale() {
          quantileScale = undefined
        }
      }
    }
  })
  .actions(self => ({
    clearCategorySets() {
      self.categorySets.clear()
    },
    setCategorySetForRole(role: GraphAttrRole, set: Set<string> | null) {
      self.categorySets.set(role, set)
    },
    setPointsNeedUpdating(needUpdating: boolean) {
      self.pointsNeedUpdating = needUpdating
    }
  }))
  .views(self => ({
    filterCase(data: IDataSet, caseID: string, caseArrayNumber: number) {
      const hasY2 = !!self._attributeDescriptions.get('y2'),
        numY = self._yAttributeDescriptions.length,
        descriptions = {... self.attributeDescriptions}
      if (hasY2 && caseArrayNumber === self._yAttributeDescriptions.length) {
        descriptions.y = self._attributeDescriptions.get('y2') ?? descriptions.y
      }
      else if (caseArrayNumber < numY) {
        descriptions.y = self._yAttributeDescriptions[caseArrayNumber]
      }
      delete descriptions.y2
      return Object.entries(descriptions).every(([role, {attributeID}]) => {
        // can still plot the case without a caption or a legend
        if (["caption", "legend"].includes(role)) return true
        switch (self.attributeType(role as GraphAttrRole)) {
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
        for (const [key, desc] of Object.entries(self.attributeDescriptions)) {
          if (affectedAttrIDs.includes(desc.attributeID)) {
            self.setCategorySetForRole(key as GraphAttrRole, null)
            if (key === "legend") {
              self.invalidateQuantileScale()
            }
          }
        }
      } else {
        self.clearCategorySets()
        self.invalidateQuantileScale()
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
    get tipAttributes():RoleAttrIDPair[] {
      return TipAttrRoles
        .map(role => {
          return {role, attributeID: self.attributeID(role) }
        })
        .filter(pair => !!pair.attributeID)
    },
    get uniqueTipAttributes() {
      const tipAttributes = this.tipAttributes,
        idCounts:  Record<string, number> = {}
      tipAttributes.forEach((aPair:RoleAttrIDPair) => {
        idCounts[aPair.attributeID] = (idCounts[aPair.attributeID] || 0) + 1
      })
      return tipAttributes.filter((aPair:RoleAttrIDPair) => {
        if (idCounts[aPair.attributeID] > 1) {
          idCounts[aPair.attributeID]--
          return false
        }
        return true
      })
    },
    get noAttributesAssigned() {
      // The first attribute is always assigned as 'caption'. So it's really no attributes assigned except for that
      return this.attributes.length <= 1
    },
    get numberOfPlots() {
      return this.filteredCases.length  // filteredCases is an array of CaseArrays
    },
    get hasY2Attribute() {
      return !!self.attributeID('y2')
    },
    getUnsortedCaseDataArray(caseArrayNumber: number): CaseData[] {
      return self.filteredCases
        ? (self.filteredCases[caseArrayNumber]?.caseIds || []).map(id => {
          return {plotNum: caseArrayNumber, caseID: id}
        })
        : []
    },
    getCaseDataArray(caseArrayNumber: number) {
      const caseDataArray = this.getUnsortedCaseDataArray(caseArrayNumber),
        legendAttrID = self.attributeID('legend')
      if (legendAttrID) {
        const categories = Array.from(this.categorySetForAttrRole('legend'))
        caseDataArray.sort((cd1: CaseData, cd2: CaseData) => {
          const cd1_Value = self.dataset?.getValue(cd1.caseID, legendAttrID),
            cd2_value = self.dataset?.getValue(cd2.caseID, legendAttrID)
          return categories.indexOf(cd1_Value) - categories.indexOf(cd2_value)
        })
      }
      return caseDataArray
    },
    getSetOfAllGraphCaseIDs() {
      const allGraphCaseIds = new Set<string>()
      // todo: We're bypassing get caseDataArray to avoid infinite recursion. Is it necessary?
      self.filteredCases?.forEach(aFilteredCases => {
        if (aFilteredCases) {
          aFilteredCases.caseIds.forEach(id => allGraphCaseIds.add(id))
        }
      })
      return allGraphCaseIds
    },
    get joinedCaseDataArrays() {
      const joinedCaseData: CaseData[] = []
      self.filteredCases?.forEach((aFilteredCases, index) => {
          aFilteredCases.caseIds.forEach(
            (id) => joinedCaseData.push({plotNum: index, caseID: id}))
        }
      )
      return joinedCaseData
    },
    get caseDataArray() {
      return this.getCaseDataArray(0)
    },
    /**
     * Note that in order to eliminate a selected case from the graph's selection, we have to check that it is not
     * present in any of the case sets, not just the 0th one.
     */
    get selection() {
      if (!self.dataset || !self.filteredCases || !self.filteredCases[0]) return []
      const selection = Array.from(self.dataset.selection),
        allGraphCaseIds = this.getSetOfAllGraphCaseIDs()
      return selection.filter((caseId: string) => allGraphCaseIds.has(caseId))
    }
  }))
  .views(self => (
    {
      // Note that we have to go through each of the filteredCases in order to return all the values
      valuesForAttrRole(role: GraphAttrRole): string[] {
        const attrID = self.attributeID(role),
          dataset = self.dataset,
          allGraphCaseIds = Array.from(this.getSetOfAllGraphCaseIDs()),
          allValues = attrID ? allGraphCaseIds.map((anID: string) => String(dataset?.getValue(anID, attrID)))
            : []
        return allValues.filter(aValue => aValue !== '')
      },
      numericValuesForAttrRole(role: GraphAttrRole): number[] {
        return this.valuesForAttrRole(role).map((aValue: string) => Number(aValue))
          .filter((aValue: number) => isFinite(aValue))
      },
      get numericValuesForYAxis() {
        const allGraphCaseIds = Array.from(this.getSetOfAllGraphCaseIDs()),
          allValues: number[] = []

        return self.yAttributeIDs.reduce((acc: number[], yAttrID: string) => {
          const values = allGraphCaseIds.map((anID: string) => Number(self.dataset?.getValue(anID, yAttrID)))
          return acc.concat(values)
        }, allValues)
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
          self.setCategorySetForRole(role, result)
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

      getLegendColorForNumericValue(value: number): string {
        return self.legendQuantileScale(value)
      },

      selectCasesForLegendValue(aValue: string, extend = false) {
        const dataset = self.dataset,
          legendID = self.attributeID('legend'),
          selection = legendID && self.caseDataArray.filter((aCaseData: CaseData) => {
            return dataset?.getValue(aCaseData.caseID, legendID) === aValue
          }).map((aCaseData: CaseData) => aCaseData.caseID)
        if (selection) {
          if (extend) dataset?.selectCases(selection)
          else dataset?.setSelectedCases(selection)
        }
      },
      allCasesForCategoryAreSelected(cat: string) {
        const dataset = self.dataset,
          legendID = self.attributeID('legend'),
          selection = (legendID && self.caseDataArray.filter((aCaseData: CaseData) => {
            return dataset?.getValue(aCaseData.caseID, legendID) === cat
          }).map((aCaseData: CaseData) => aCaseData.caseID)) ?? []
        return selection.length > 0 && (selection as Array<string>).every(anID => dataset?.isCaseSelected(anID))
      },
      selectedCasesForLegendQuantile(quantile: number) {
        const dataset = self.dataset,
          legendID = self.attributeID('legend'),
          thresholds = self.legendQuantileScale.quantiles(),
          min = quantile === 0 ? -Infinity : thresholds[quantile - 1],
          max = quantile === thresholds.length ? Infinity : thresholds[quantile],
          selection: string[] = legendID && legendID !== ''
            ? self.caseDataArray.filter((aCaseData: CaseData) => {
              const value = dataset?.getNumeric(aCaseData.caseID, legendID)
              return value !== undefined && value >= min && value < max
            }).map((aCaseData: CaseData) => aCaseData.caseID)
            : []
        return selection
      },
      selectCasesForLegendQuantile(quantile: number, extend = false) {
        const selection = this.selectedCasesForLegendQuantile(quantile)
        if (selection) {
          if (extend) self.dataset?.selectCases(selection)
          else self.dataset?.setSelectedCases(selection)
        }
      },
      casesInQuantileAreSelected(quantile: number): boolean {
        const selection = this.selectedCasesForLegendQuantile(quantile)
        return !!(selection.length > 0 && selection?.every((anID: string) => self.dataset?.isCaseSelected(anID)))
      }
    }))
  .views(self => (
    {
      getLegendColorForCase(id: string): string {
        const legendID = self.attributeID('legend'),
          legendType = self.attributeType('legend'),
          legendValue = id && legendID ? self.dataset?.getValue(id, legendID) : null
        return legendValue == null ? ''
          : legendType === 'categorical' ? self.getLegendColorForCategory(legendValue)
            : legendType === 'numeric' ? self.getLegendColorForNumericValue(Number(legendValue))
              : ''
      },
      /**
       * Called to determine whether the categories on an axis should be centered.
       * If the attribute is playing a primary role, then it should be centered.
       * If it is a secondary role, then it should not be centered.
       */
      categoriesForAxisShouldBeCentered(place: AxisPlace) {
        const role = graphPlaceToAttrRole[place],
          primaryRole = self.primaryRole
        return primaryRole === role
      }
    }))
  .actions(self => ({
    setDataset(dataset: IDataSet) {
      self.actionHandlerDisposer?.()
      self.dataset = dataset
      self.actionHandlerDisposer = onAction(self.dataset, self.handleAction, true)
      self._attributeDescriptions.clear()
      self._yAttributeDescriptions.clear()
      self.filteredCases = []
      self.filteredCases[0] = new FilteredCases({
        source: dataset, filter: self.filterCase,
        onSetCaseValues: self.handleSetCaseValues
      })
      self.invalidateQuantileScale()
    },
    setPrimaryRole(role: GraphAttrRole) {
      if (role === 'x' || role === 'y') {
        self.primaryRole = role
      }
    },
    setAttribute(role: GraphAttrRole, desc?: IAttributeDescriptionSnapshot) {
      if (role === 'y') {
        self._yAttributeDescriptions.clear()
        if (desc && desc.attributeID !== '') {
          self._yAttributeDescriptions.push(desc)
        }
      } else if (role === 'y2') {
        this.setY2Attribute(desc)
      } else {
        if (desc && desc.attributeID !== '') {
          self._attributeDescriptions.set(role, desc)
        } else {
          self._attributeDescriptions.delete(role)
        }
      }
      self.filteredCases?.forEach((aFilteredCases) => {
        aFilteredCases.invalidateCases()
      })
      self.categorySets.set(role, null)
      if (role === 'legend') {
        self.invalidateQuantileScale()
      }
    },
    _addNewFilteredCases() {
      self.dataset && self.filteredCases?.push(new FilteredCases({
          casesArrayNumber: self.filteredCases.length,
          source: self.dataset, filter: self.filterCase,
          onSetCaseValues: self.handleSetCaseValues
        }))
      self.setPointsNeedUpdating(true)
    },
    addYAttribute(desc: IAttributeDescriptionSnapshot) {
      self._yAttributeDescriptions.push(desc)
      this._addNewFilteredCases()
    },
    setY2Attribute(desc: IAttributeDescriptionSnapshot) {
      const isNewAttribute = !self._attributeDescriptions.get('y2')
      self._attributeDescriptions.set('y2', desc)
      if (isNewAttribute) {
        this._addNewFilteredCases()
      } else {
        const existingFilteredCases = self.filteredCases?.[self.numberOfPlots - 1]
        existingFilteredCases?.invalidateCases()
      }
    },
    removeYAttributeWithID(id: string) {
      const index = self._yAttributeDescriptions.findIndex((aDesc) => aDesc.attributeID === id)
      if (index >= 0) {
        self._yAttributeDescriptions.splice(index, 1)
        self.filteredCases?.splice(index, 1)
        self.setPointsNeedUpdating(true)
      }
    },
    setAttributeType(role: GraphAttrRole, type: AttributeType, plotNumber = 0) {
      if (role === 'y') {
        self._yAttributeDescriptions[plotNumber]?.setType(type)
      } else {
        self._attributeDescriptions.get(role)?.setType(type)
      }
      self.categorySets.set(role, null) // We don't have to worry about y attributes except for the 0th one
      self.filteredCases?.forEach((aFilteredCases) => {
        aFilteredCases.invalidateCases()
      })
    },
    onAction(handler: (actionCall: ISerializedActionCall) => void) {
      const id = uniqueId()
      self.handlers.set(id, handler)
      return () => {
        self.handlers.delete(id)
      }
    }
  }))

/*
export interface SetAttributeTypeAction extends ISerializedActionCall {
  name: "setAttributeType"
  args: [GraphAttrRole, AttributeType]
}
*/

/*
export function isSetAttributeTypeAction(action: ISerializedActionCall): action is SetAttributeTypeAction {
  return action.name === "setAttributeType"
}
*/

export interface IDataConfigurationModel extends Instance<typeof DataConfigurationModel> {
}

/*
export interface IDataConfigurationSnapshot extends SnapshotIn<typeof DataConfigurationModel> {
}
*/
