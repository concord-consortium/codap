import {scaleQuantile, ScaleQuantile, schemeBlues} from "d3"
import {getSnapshot, Instance, ISerializedActionCall, SnapshotIn, types} from "mobx-state-tree"
import {AttributeType, attributeTypes} from "../../../models/data/attribute"
import {IDataSet} from "../../../models/data/data-set"
import {getCategorySet, ISharedCaseMetadata} from "../../../models/shared/shared-case-metadata"
import {isSetCaseValuesAction} from "../../../models/data/data-set-actions"
import {FilteredCases, IFilteredChangedCases} from "../../../models/data/filtered-cases"
import {typedId, uniqueId} from "../../../utilities/js-utils"
import {kellyColors, missingColor} from "../../../utilities/color-utils"
import {onAnyAction} from "../../../utilities/mst-utils"
import {CaseData} from "../d3-types"
import {GraphAttrRole, graphPlaceToAttrRole, PrimaryAttrRoles, TipAttrRoles} from "../graphing-types"
import {AxisPlace} from "../../axis/axis-types"
import {GraphPlace} from "../../axis-graph-shared"

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
    id: types.optional(types.identifier, () => typedId("DCON")),
    // determines stacking direction in categorical-categorical, for instance
    primaryRole: types.maybe(types.enumeration([...PrimaryAttrRoles])),
    // keys are GraphAttrRoles, excluding y role
    _attributeDescriptions: types.map(AttributeDescription),
    // all attributes for (left) y role
    _yAttributeDescriptions: types.array(AttributeDescription),
  })
  .volatile(() => ({
    dataset: undefined as IDataSet | undefined,
    metadata: undefined as ISharedCaseMetadata | undefined,
    actionHandlerDisposer: undefined as (() => void) | undefined,
    filteredCases: undefined as FilteredCases[] | undefined,
    handlers: new Map<string, (actionCall: ISerializedActionCall) => void>(),
    pointsNeedUpdating: false
  }))
  .views(self => ({
    get isEmpty() {
      return self._attributeDescriptions.size + self._yAttributeDescriptions.length === 0
    },
    get secondaryRole() {
      return self.primaryRole === 'x' ? 'y'
        : self.primaryRole === 'y' ? 'x'
          : ''
    },
    get y2AttributeDescriptionIsPresent() {
      return !!self._attributeDescriptions.get('rightNumeric')
    },
    get yAttributeDescriptionsExcludingY2() {
      return self._yAttributeDescriptions
    },
    // Includes rightNumeric if present
    get yAttributeDescriptions() {
      const descriptions = self._yAttributeDescriptions,
        y2Description = self._attributeDescriptions.get('rightNumeric') ?? null
      return descriptions.concat(y2Description ? [y2Description] : [])
    },
    // Includes rightNumeric if present
    get yAttributeIDs() {
      return this.yAttributeDescriptions.map((d: IAttributeDescriptionSnapshot) => d.attributeID)
    },
    /**
     * No attribute descriptions beyond the first for y are returned.
     * The rightNumeric attribute description is also not returned.
     */
    get attributeDescriptions() {
      const descriptions = {...getSnapshot(self._attributeDescriptions)}
      delete descriptions.rightNumeric
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
     * For the 'y' role we return the first y-attribute, for 'rightNumeric' we return the last y-attribute.
     * For all other roles we return the attribute description for the role.
     */
    attributeDescriptionForRole(role: GraphAttrRole) {
      return role === 'y' ? this.yAttributeDescriptions[0]
        : role === 'rightNumeric' ? self._attributeDescriptions.get('rightNumeric')
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
      const attr = attrID ? self.dataset?.attrFromID(attrID) : undefined
      return desc?.type || attr?.type
    },
    get places() {
      const places = new Set<string>(Object.keys(this.attributeDescriptions))
      self.dataset?.attributes.length && places.add("caption")
      return Array.from(places) as GraphAttrRole[]
    },
    placeCanHaveZeroExtent(place: GraphPlace) {
      return ['rightNumeric', 'legend', 'top', 'rightCat'].includes(place) &&
        this.attributeID(graphPlaceToAttrRole[place]) === ''
    },
    placeCanShowClickHereCue(place: GraphPlace) {
      const role = graphPlaceToAttrRole[place]
      return ['left', 'bottom'].includes(place) && !this.attributeID(role)
    },
    placeAlwaysShowsClickHereCue(place: GraphPlace) {
      return this.placeCanShowClickHereCue(place) &&
        !this.attributeID(graphPlaceToAttrRole[place === 'left' ? 'bottom' : 'left'])
    },
    placeShouldShowClickHereCue(place: GraphPlace, tileHasFocus: boolean) {
      return this.placeAlwaysShowsClickHereCue(place) ||
        (this.placeCanShowClickHereCue(place) && tileHasFocus)
    }
  }))
  .views(self => ({
    get primaryAttributeID(): string {
      return self.primaryRole && self.attributeID(self.primaryRole) || ''
    },
    get secondaryAttributeID(): string {
      return self.secondaryRole && self.attributeID(self.secondaryRole) || ''
    },
    get graphCaseIDs() {
      const allGraphCaseIds = new Set<string>()
      // todo: We're bypassing get caseDataArray to avoid infinite recursion. Is it necessary?
      self.filteredCases?.forEach(aFilteredCases => {
        if (aFilteredCases) {
          aFilteredCases.caseIds.forEach(id => allGraphCaseIds.add(id))
        }
      })
      return allGraphCaseIds
    }
  }))
  .actions(self => ({
    _setAttributeDescription(iRole: GraphAttrRole, iDesc?: IAttributeDescriptionSnapshot) {
      if (iRole === 'y') {
        self._yAttributeDescriptions.clear()
        if (iDesc?.attributeID) {
          self._yAttributeDescriptions.push(iDesc)
        }
      } else if (iDesc?.attributeID) {
        self._attributeDescriptions.set(iRole, iDesc)
      } else {
        self._attributeDescriptions.delete(iRole)
      }
    }
  }))
  .actions(self => ({
    setPointsNeedUpdating(needUpdating: boolean) {
      self.pointsNeedUpdating = needUpdating
    }
  }))
  .views(self => ({
    filterCase(data: IDataSet, caseID: string, caseArrayNumber?: number) {
      const hasY2 = !!self._attributeDescriptions.get('rightNumeric'),
        numY = self._yAttributeDescriptions.length,
        descriptions = {...self.attributeDescriptions}
      if (hasY2 && caseArrayNumber === self._yAttributeDescriptions.length) {
        descriptions.y = self._attributeDescriptions.get('rightNumeric') ?? descriptions.y
      } else if (caseArrayNumber != null && caseArrayNumber < numY) {
        descriptions.y = self._yAttributeDescriptions[caseArrayNumber]
      }
      delete descriptions.rightNumeric
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
    }
  }))
  .views(self => ({
    get attributes() {
      return self.places.map(place => self.attributeID(place)).filter(attrID => !!attrID) as string[]
    },
    get uniqueAttributes() {
      return Array.from(new Set<string>(this.attributes))
    },
    get tipAttributes(): RoleAttrIDPair[] {
      return TipAttrRoles
        .map(role => {
          return {role, attributeID: self.attributeID(role) || ''}
        })
        .filter(pair => !!pair.attributeID)
    },
    get uniqueTipAttributes() {
      const tipAttributes = this.tipAttributes,
        idCounts: Record<string, number> = {}
      tipAttributes.forEach((aPair: RoleAttrIDPair) => {
        idCounts[aPair.attributeID] = (idCounts[aPair.attributeID] || 0) + 1
      })
      return tipAttributes.filter((aPair: RoleAttrIDPair) => {
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
      return self.filteredCases?.length ?? 0  // filteredCases is an array of CaseArrays
    },
    get hasY2Attribute() {
      return !!self.attributeID('rightNumeric')
    },
    /**
     * Note that in order to eliminate a selected case from the graph's selection, we have to check that it is not
     * present in any of the case sets, not just the 0th one.
     */
    get selection() {
      if (!self.dataset || !self.filteredCases || !self.filteredCases[0]) return []
      const selection = Array.from(self.dataset.selection),
        allGraphCaseIds = self.graphCaseIDs
      return selection.filter((caseId: string) => allGraphCaseIds.has(caseId))
    }
  }))
  .views(self => (
    {
      // Note that we have to go through each of the filteredCases in order to return all the values
      valuesForAttrRole(role: GraphAttrRole): string[] {
        const attrID = self.attributeID(role),
          dataset = self.dataset,
          allGraphCaseIds = Array.from(self.graphCaseIDs),
          allValues = attrID ? allGraphCaseIds.map((anID: string) => String(dataset?.getValue(anID, attrID)))
            : []
        return allValues.filter(aValue => aValue !== '')
      },
      numericValuesForAttrRole(role: GraphAttrRole): number[] {
        return this.valuesForAttrRole(role).map((aValue: string) => Number(aValue))
          .filter((aValue: number) => isFinite(aValue))
      },
      get numericValuesForYAxis() {
        const allGraphCaseIds = Array.from(self.graphCaseIDs),
          allValues: number[] = []

        return self.yAttributeIDs.reduce((acc: number[], yAttrID: string) => {
          const values = allGraphCaseIds.map((anID: string) => Number(self.dataset?.getValue(anID, yAttrID)))
          return acc.concat(values)
        }, allValues)
      },
      /**
       * Todo: This method is inefficient since it has to go through all the cases in the graph to determine
       * which categories are present. It should be replaced by some sort of functionality that allows
       * caching of the categories that have been determined to be valid.
       * @param role
       */
      categorySetForAttrRole(role: GraphAttrRole): string[] {
        let categoryArray: string[] = []
        if (self.metadata) {
          const attributeID = self.attributeID(role) || '',
            categorySet = getCategorySet(self.metadata, attributeID),
            validValues: Set<string> = new Set(this.valuesForAttrRole(role))
          categoryArray = (categorySet?.values || ['__main__']).filter((aValue: string) => validValues.has(aValue))
        }
        if (categoryArray.length === 0) {
          categoryArray = ['__main__']
        }
        return categoryArray
      },
      numRepetitionsForPlace(place: GraphPlace) {
        let numRepetitions = 1
        switch (place) {
          case 'left':
            numRepetitions = Math.max(this.categorySetForAttrRole('rightSplit').length, 1)
            break
          case 'bottom':
            numRepetitions = Math.max(this.categorySetForAttrRole('topSplit').length, 1)
        }
        return numRepetitions
      }
    }))
  .views(self => ({
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
        const categories = Array.from(self.categorySetForAttrRole('legend'))
        caseDataArray.sort((cd1: CaseData, cd2: CaseData) => {
          const cd1_Value = self.dataset?.getStrValue(cd1.caseID, legendAttrID) ?? '',
            cd2_value = self.dataset?.getStrValue(cd2.caseID, legendAttrID) ?? ''
          return categories.indexOf(cd1_Value) - categories.indexOf(cd2_value)
        })
      }
      return caseDataArray
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
    }
  }))
  .extend(self => {
    // TODO: This is a hack to get around the fact that MST doesn't seem to cache this as expected
    // when implemented as simple view.
    let quantileScale: ScaleQuantile<string> | undefined = undefined

    return {
      views: {
        get legendQuantileScale() {
          if (!quantileScale) {
            quantileScale = scaleQuantile(self.numericValuesForAttrRole('legend'), schemeBlues[5])
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
          legendValue = id && legendID ? self.dataset?.getStrValue(id, legendID) : null
        return legendValue == null ? ''
          : legendType === 'categorical' ? self.getLegendColorForCategory(legendValue)
            : legendType === 'numeric' ? self.getLegendColorForNumericValue(Number(legendValue))
              : ''
      },
      /**
       * Called to determine whether the categories on an axis should be centered.
       * If the attribute is playing a primary role, then it should be centered.
       * If it is a secondary role, then it should not be centered.
       * 'top' and 'rightCat' are always centered.
       */
      categoriesForAxisShouldBeCentered(place: AxisPlace) {
        const role = graphPlaceToAttrRole[place],
          primaryRole = self.primaryRole
        return primaryRole === role || !['left', 'bottom'].includes(place)
      },
      graphPlaceCanAcceptAttributeIDDrop(place: GraphPlace, dataSet?: IDataSet, idToDrop?: string) {
        const role = graphPlaceToAttrRole[place],
          typeToDropIsNumeric = !!idToDrop && dataSet?.attrFromID(idToDrop)?.type === 'numeric',
          xIsNumeric = self.attributeType('x') === 'numeric',
          existingID = self.attributeID(role)
        // only drops on left/bottom axes can change data set
        if (dataSet?.id !== self.dataset?.id && !['left', 'bottom'].includes(place)) {
          return false
        }
        if (place === 'yPlus') {
          return xIsNumeric && typeToDropIsNumeric && !!idToDrop && !self.yAttributeIDs.includes(idToDrop)
        } else if (place === 'rightNumeric') {
          return xIsNumeric && typeToDropIsNumeric && !!idToDrop && existingID !== idToDrop
        } else if (['top', 'rightCat'].includes(place)) {
          return !typeToDropIsNumeric && !!idToDrop && existingID !== idToDrop
        } else {
          return !!idToDrop && existingID !== idToDrop
        }
      }
    }))
  .actions(self => ({
    handleAction(actionCall: ISerializedActionCall) {
      // forward all actions from dataset except "setCaseValues" which requires intervention
      if (actionCall.name === "setCaseValues") return
      self.handlers.forEach(handler => handler(actionCall))
    },
    handleSetCaseValues(actionCall: ISerializedActionCall, cases: IFilteredChangedCases) {
      if (!isSetCaseValuesAction(actionCall)) return
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
            if (key === "legend") {
              self.invalidateQuantileScale()
            }
          }
        }
      } else {
        self.invalidateQuantileScale()
      }
    }
  }))
  .actions(self => ({
    _addNewFilteredCases() {
      self.dataset && self.filteredCases
        ?.push(new FilteredCases({
          casesArrayNumber: self.filteredCases.length,
          source: self.dataset, filter: self.filterCase,
          onSetCaseValues: self.handleSetCaseValues
        }))
      self.setPointsNeedUpdating(true)
    },
    setDataset(dataset: IDataSet | undefined, metadata: ISharedCaseMetadata | undefined) {
      self.actionHandlerDisposer?.()
      self.dataset = dataset
      self.metadata = metadata
      self.actionHandlerDisposer = onAnyAction(self.dataset, self.handleAction)
      self.filteredCases = []
      if (dataset) {
        self.filteredCases[0] = new FilteredCases({
          source: dataset, filter: self.filterCase,
          onSetCaseValues: self.handleSetCaseValues
        })
        // make sure there are enough filteredCases to hold all the y attributes
        while (self.filteredCases.length < self._yAttributeDescriptions.length) {
          this._addNewFilteredCases()
        }
        // A y2 attribute is optional, so only add a new filteredCases if there is one.
        if (self.hasY2Attribute) {
          this._addNewFilteredCases()
        }
      }
      self.invalidateQuantileScale()
    },
    setPrimaryRole(role: GraphAttrRole) {
      if (role === 'x' || role === 'y') {
        self.primaryRole = role
      }
    },
    clearAttributes() {
      self._attributeDescriptions.clear()
      self._yAttributeDescriptions.clear()
    },
    setAttribute(role: GraphAttrRole, desc?: IAttributeDescriptionSnapshot) {

      // For 'x' and 'y' roles, if the given attribute is already present on the other axis, then
      // move whatever attribute is assigned to the given role to that axis.
      if (['x', 'y'].includes(role)) {
        const otherRole = role === 'x' ? 'y' : 'x',
          otherDesc = self.attributeDescriptionForRole(otherRole)
        if (otherDesc?.attributeID === desc?.attributeID) {
          const currentDesc = self.attributeDescriptionForRole(role) ?? {attributeID: '', type: 'categorical'}
          self._setAttributeDescription(otherRole, currentDesc)
        }
      }
      if (role === 'y') {
        self._yAttributeDescriptions.clear()
        if (desc && desc.attributeID !== '') {
          self._yAttributeDescriptions.push(desc)
        }
      } else if (role === 'rightNumeric') {
        this.setY2Attribute(desc)
      } else {
        self._setAttributeDescription(role, desc)
      }
      self.filteredCases?.forEach((aFilteredCases) => {
        aFilteredCases.invalidateCases()
      })
      if (role === 'legend') {
        self.invalidateQuantileScale()
      }
    },
    addYAttribute(desc: IAttributeDescriptionSnapshot) {
      self._yAttributeDescriptions.push(desc)
      this._addNewFilteredCases()
    },
    setY2Attribute(desc?: IAttributeDescriptionSnapshot) {
      const isNewAttribute = !self._attributeDescriptions.get('rightNumeric'),
        isEmpty = !desc?.attributeID
      self._setAttributeDescription('rightNumeric', desc)
      if (isNewAttribute) {
        this._addNewFilteredCases()
      } else if (isEmpty) {
        self.filteredCases?.pop() // remove the last one because it is the array
        self.setPointsNeedUpdating(true)
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
