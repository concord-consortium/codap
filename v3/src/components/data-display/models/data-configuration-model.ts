import {scaleQuantile, ScaleQuantile, schemeBlues} from "d3"
import {comparer, reaction} from "mobx"
import {applyUndoableAction} from "../../../models/history/apply-undoable-action"
import {addDisposer, getSnapshot, Instance, ISerializedActionCall, SnapshotIn, types} from "mobx-state-tree"
import {cachedFnWithArgsFactory, onAnyAction} from "../../../utilities/mst-utils"
import {AttributeType, attributeTypes} from "../../../models/data/attribute"
import {DataSet, IDataSet} from "../../../models/data/data-set"
import {ICase} from "../../../models/data/data-set-types"
import {idOfChildmostCollectionForAttributes} from "../../../models/data/data-set-utils"
import {ISharedCaseMetadata, SharedCaseMetadata} from "../../../models/shared/shared-case-metadata"
import {isSetCaseValuesAction} from "../../../models/data/data-set-actions"
import {FilteredCases, IFilteredChangedCases} from "../../../models/data/filtered-cases"
import {typedId, uniqueId} from "../../../utilities/js-utils"
import {missingColor} from "../../../utilities/color-utils"
import {CaseData} from "../d3-types"
import {AttrRole, TipAttrRoles, graphPlaceToAttrRole} from "../data-display-types"
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

export type RoleAttrIDPair = { role: AttrRole, attributeID: string }

export interface IAttributeDescriptionSnapshot extends SnapshotIn<typeof AttributeDescription> {
}

export const kUnknownDataConfigurationType = "unknownDataConfigurationType"
export const kDataConfigurationType = "dataConfigurationType"

export const DataConfigurationModel = types
  .model('DataConfigurationModel', {
    id: types.optional(types.identifier, () => typedId("DCON")),
    type: types.optional(types.string, kDataConfigurationType),
    // keys are GraphAttrRoles, excluding y role
    _attributeDescriptions: types.map(AttributeDescription),
    dataset: types.safeReference(DataSet),
    metadata: types.safeReference(SharedCaseMetadata),
    hiddenCases: types.array(types.string),
  })
  .volatile(() => ({
    actionHandlerDisposer: undefined as (() => void) | undefined,
    filteredCases: [] as FilteredCases[],
    handlers: new Map<string, (actionCall: ISerializedActionCall) => void>(),
    pointsNeedUpdating: false,
    casesChangeCount: 0
  }))
  .views(self => ({
    get isEmpty() {
      return self._attributeDescriptions.size === 0
    },
    get attributeDescriptions() {
      return getSnapshot(self._attributeDescriptions) as Record<AttrRole, IAttributeDescriptionSnapshot>
    },
    get attributeDescriptionsStr() {
      return JSON.stringify(this.attributeDescriptions)
    },
    attributeDescriptionForRole(role: AttrRole) {
      return this.attributeDescriptions[role]
    },
    attributeID(role: AttrRole) {

      const defaultCaptionAttributeID = () => {
        // We find the childmost collection and return the first attribute in that collection. If there is no
        // childmost collection, we return the first attribute in the dataset.
        const attrIDs = ['x', 'y', 'rightNumeric', 'topSplit', 'rightSplit', 'legend']
            .map(
              aRole => this.attributeID(aRole as AttrRole)
            )
            .filter(id => !!id),
          childmostCollectionID = idOfChildmostCollectionForAttributes(attrIDs, self.dataset)
        if (childmostCollectionID) {
          const childmostCollection = self.dataset?.getGroupedCollection(childmostCollectionID),
            childmostCollectionAttributes = childmostCollection?.attributes
          if (childmostCollectionAttributes?.length) {
            const firstAttribute = childmostCollectionAttributes[0]
            return firstAttribute?.id
          }
        }
        return self.dataset?.ungroupedAttributes[0]?.id
      }

      let attrID = this.attributeDescriptionForRole(role)?.attributeID
      if ((role === "caption") && !attrID) {
        attrID = defaultCaptionAttributeID() || ""
      }
      return attrID
    },
    attributeType(role: AttrRole) {
      const desc = this.attributeDescriptionForRole(role)
      if (desc?.type) {
        return desc.type
      }
      const attrID = this.attributeID(role)
      const attr = attrID ? self.dataset?.attrFromID(attrID) : undefined
      return attr?.type
    },
    get places() {
      const places = new Set<string>(Object.keys(this.attributeDescriptions))
      self.dataset?.attributes.length && places.add("caption")
      return Array.from(places) as AttrRole[]
    },
    rolesForAttribute(attrID: string) {
      const roles: AttrRole[] = []
      self._attributeDescriptions.forEach((desc, role) => {
        if (desc?.attributeID === attrID) {
          roles.push(role as AttrRole)
        }
      })
      return roles
    },
    get hiddenCasesSet() {
      return new Set(self.hiddenCases)
    },
  }))
  .actions(self => ({
    clearFilteredCases() {
      self.filteredCases.forEach(aFilteredCases => aFilteredCases.destroy())
      self.filteredCases = []
    },
    beforeDestroy() {
      this.clearFilteredCases()

      self.actionHandlerDisposer?.()
    },
    _setAttributeDescription(iRole: AttrRole, iDesc?: IAttributeDescriptionSnapshot) {
      if (iDesc?.attributeID) {
        self._attributeDescriptions.set(iRole, iDesc)
      } else {
        self._attributeDescriptions.delete(iRole)
      }
    },
    setPointsNeedUpdating(needUpdating: boolean) {
      self.pointsNeedUpdating = needUpdating
    }
  }))
  .views(self => ({
    _caseHasValidValuesForDescriptions(data: IDataSet, caseID: string,
                                       descriptions: Record<string, {attributeID:string}>) {
      return Object.entries(descriptions).every(([role, {attributeID}]) => {
        // can still plot the case without a caption or a legend
        if (["caption", "legend"].includes(role)) return true
        switch (self.attributeType(role as AttrRole)) {
          case "numeric":
            return isFinite(data.getNumeric(caseID, attributeID) ?? NaN)
          default:
            // for now, all other types must just be non-empty
            return !!data.getValue(caseID, attributeID)
        }
      })
    },
    // This function can be called either here in this base class or in a subclass to handle the situation in which
    // caseArrayNumber === 0.
    _filterCase(data: IDataSet, caseID: string) {
      // If the case is hidden we don't plot it
      if (self.hiddenCasesSet.has(caseID)) return false
      const descriptions = {...self.attributeDescriptions}
      return this._caseHasValidValuesForDescriptions(data, caseID, descriptions)
    },
  }))
  .views(self => ({
    filterCase(data: IDataSet, caseID: string, caseArrayNumber?: number) {
      return self._filterCase(data, caseID)
    }
  }))
  .views(self => ({
    get attributes() {
      return self.places.map(place => self.attributeID(place)).filter(attrID => !!attrID)
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
    get allCaseIDs() {
      const allCaseIds = new Set<string>()
      // todo: We're bypassing get caseDataArray to avoid infinite recursion. Is it necessary?
      self.filteredCases.forEach(aFilteredCases => {
        if (aFilteredCases) {
          aFilteredCases.caseIds.forEach(id => allCaseIds.add(id))
        }
      })
      return allCaseIds
    },
    /**
     * Note that in order to eliminate a selected case from the graph's selection, we have to check that it is not
     * present in any of the case sets, not just the 0th one.
     */
    get selection() {
      if (!self.dataset || !self.filteredCases[0]) return []
      const selection = Array.from(self.dataset.selection),
        allGraphCaseIds = this.allCaseIDs
      return selection.filter((caseId: string) => allGraphCaseIds.has(caseId))
    },
    /**
     * Note that in order to eliminate a selected case from the graph's selection, we have to check that it is not
     * present in any of the case sets, not just the 0th one.
     */
    get unselectedCases() {
      if (!self.dataset || !self.filteredCases[0]) return []
      const selection = self.dataset.selection,
        allGraphCaseIds = Array.from(this.allCaseIDs)
      return allGraphCaseIds.filter((caseId: string) => !selection.has(caseId))
    }
  }))
  .views(self => ({
    // Note that we have to go through each of the filteredCases in order to return all the values
    valuesForAttrRole: cachedFnWithArgsFactory({
      key: (role: AttrRole) => role,
      calculate: (role: AttrRole) => {
        const attrID = self.attributeID(role)
        const dataset = self.dataset
        const allCaseIDs = Array.from(self.allCaseIDs)
        const allValues = attrID ? allCaseIDs.map((anID: string) => dataset?.getStrValue(anID, attrID)) : []
        return allValues.filter(aValue => aValue) as string[]
      }
    })
  }))
  .views(self => ({
    numericValuesForAttrRole(role: AttrRole): number[] {
      return self.valuesForAttrRole(role).map((aValue: string) => Number(aValue))
        .filter((aValue: number) => isFinite(aValue))
    },
    categorySetForAttrRole(role: AttrRole) {
      if (self.metadata) {
        const attributeID = self.attributeID(role) || ''
        return self.metadata.getCategorySet(attributeID)
      }
    },
    /**
     * @param role
     * @param emptyCategoryArray
     */
    categoryArrayForAttrRole: cachedFnWithArgsFactory({
      key: (role: AttrRole, emptyCategoryArray = ['__main__']) => JSON.stringify({ role, emptyCategoryArray }),
      calculate: (role: AttrRole, emptyCategoryArray = ['__main__']) => {
        let categoryArray = Array.from(new Set(self.valuesForAttrRole(role)))
        if (categoryArray.length === 0) {
          categoryArray = emptyCategoryArray
        }
        return categoryArray
      }
    })
  }))
  .views(self => ({
    getUnsortedCaseDataArray(caseArrayNumber: number): CaseData[] {
      return (self.filteredCases[caseArrayNumber]?.caseIds || []).map(id => {
        return {plotNum: caseArrayNumber, caseID: id}
      })
    },
    getCaseDataArray(caseArrayNumber: number) {
      const caseDataArray = this.getUnsortedCaseDataArray(caseArrayNumber),
        legendAttrID = self.attributeID('legend')
      if (legendAttrID) {
        const categories = Array.from(self.categoryArrayForAttrRole('legend'))
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
      self.filteredCases.forEach((aFilteredCases, index) => {
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
        const categorySet = self.categorySetForAttrRole('legend')
        return categorySet?.colorForCategory(cat) ?? missingColor
      },

      getLegendColorForNumericValue(value: number): string {
        return self.legendQuantileScale(value)
      },

      selectCasesForLegendValue(aValue: string, extend = false) {
        const dataset = self.dataset,
          legendID = self.attributeID('legend'),
          collectionGroup = dataset?.getCollectionForAttribute(legendID || '')
        let selection: string[] = []
        if (collectionGroup) {
          const parentCases = dataset?.getCasesForCollection(collectionGroup.id)
          parentCases?.forEach((aCase: ICase) => {
            if (dataset?.getValue(aCase.__id__, legendID || '') === aValue) {
              selection?.push(aCase.__id__)
            }
          })
        } else {
          selection = legendID ? self.caseDataArray.filter((aCaseData: CaseData) => {
              return dataset?.getValue(aCaseData.caseID, legendID) === aValue
            }).map((aCaseData: CaseData) => aCaseData.caseID)
            : []
        }
        if (selection) {
          if (extend) dataset?.selectCases(selection)
          else dataset?.setSelectedCases(selection)
        }
      },
      allCasesForCategoryAreSelected: cachedFnWithArgsFactory({
        key: (cat: string) => cat,
        calculate: (cat: string) => {
          const dataset = self.dataset
          const legendID = self.attributeID('legend')
          const selection = (legendID && self.caseDataArray.filter((aCaseData: CaseData) =>
            dataset?.getValue(aCaseData.caseID, legendID) === cat
          ).map((aCaseData: CaseData) => aCaseData.caseID)) ?? []
          return selection.length > 0 && (selection as Array<string>).every(anID => dataset?.isCaseSelected(anID))
        }
      }),
      selectedCasesForLegendQuantile(quantile: number) {
        const dataset = self.dataset,
          legendID = self.attributeID('legend'),
          thresholds = self.legendQuantileScale.quantiles(),
          min = quantile === 0 ? -Infinity : thresholds[quantile - 1],
          max = quantile === thresholds.length ? Infinity : thresholds[quantile]
        return legendID
          ? self.caseDataArray.filter((aCaseData: CaseData) => {
            const value = dataset?.getNumeric(aCaseData.caseID, legendID)
            return value !== undefined && value >= min && value < max
          }).map((aCaseData: CaseData) => aCaseData.caseID)
          : []
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
      placeCanHaveZeroExtent(place: GraphPlace) {
        return ['rightNumeric', 'legend', 'top', 'rightCat'].includes(place) &&
          !self.attributeID(graphPlaceToAttrRole[place])
      },
      // GraphDataConfigurationModel overrides this. Here we only have to worry about the 'legend' role.
      placeCanAcceptAttributeIDDrop(place: GraphPlace, dataSet?: IDataSet, idToDrop?: string) {
        if (idToDrop) {
          const desc = self.attributeDescriptionForRole('legend')
          return !desc || desc.attributeID !== idToDrop
        }
        return false
      },
      getLegendColorForCase(id: string): string {
        const legendID = self.attributeID('legend')
        const legendType = self.attributeType('legend')
        if (!id || !legendID) {
          return ''
        }
        const legendValue = self.dataset?.getStrValue(id, legendID)
        if (!legendValue) {
          return ''
        }
        switch (legendType) {
          case 'categorical':
            return self.getLegendColorForCategory(legendValue)
          case 'numeric':
            return self.getLegendColorForNumericValue(Number(legendValue))
          default:
            return ''
        }
      }
    }))
  .actions(self => ({
    clearCasesCache() {
      self.valuesForAttrRole.invalidateAll()
      self.categoryArrayForAttrRole.invalidateAll()
      self.allCasesForCategoryAreSelected.invalidateAll()
      // increment observable change count
      ++self.casesChangeCount
    }
  }))
  .actions(self => ({
    /**
     * This is called when the user swaps categories in the legend, but not when the user swaps categories
     * by dragging categories on an axis.
     * @param role
     */
    storeAllCurrentColorsForAttrRole(role: AttrRole) {
      const categorySet = self.categorySetForAttrRole(role)
      if (categorySet) {
        categorySet.storeAllCurrentColors()
      }
    },
    swapCategoriesForAttrRole(role: AttrRole, catIndex1: number, catIndex2: number) {
      const categoryArray = self.categoryArrayForAttrRole(role),
        numCategories = categoryArray.length,
        categorySet = self.categorySetForAttrRole(role)
      if (catIndex2 < catIndex1) {
        const temp = catIndex1
        catIndex1 = catIndex2
        catIndex2 = temp
      }
      if (categorySet && numCategories > catIndex1 && numCategories > catIndex2) {
        const cat1 = categoryArray[catIndex1],
          beforeCat = catIndex2 < numCategories - 1 ? categoryArray[catIndex2 + 1] : undefined
        categorySet.move(cat1, beforeCat)
      }
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
    },
    _updateFilteredCasesCollectionID() {
      const childmostCollectionID = idOfChildmostCollectionForAttributes(self.attributes, self.dataset)
      self.filteredCases.forEach((aFilteredCases) => {
        aFilteredCases.setCollectionID(childmostCollectionID)
      })
    },
    _invalidateCases() {
      self.filteredCases.forEach((aFilteredCases) => {
        aFilteredCases.invalidateCases()
      })
      self.clearCasesCache()
    },
    _addNewFilteredCases() {
      if (self.dataset) {
        this._updateFilteredCasesCollectionID()
        self.filteredCases.push(new FilteredCases({
          source: self.dataset,
          casesArrayNumber: self.filteredCases.length,
          filter: self.filterCase,
          collectionID: idOfChildmostCollectionForAttributes(self.attributes, self.dataset),
          onSetCaseValues: this.handleSetCaseValues
        }))
        self.setPointsNeedUpdating(true)
      }
    },
    _setAttribute(role: AttrRole, desc?: IAttributeDescriptionSnapshot) {
      this._updateFilteredCasesCollectionID()
      self.clearCasesCache()
    },
    _setAttributeType(role: AttrRole, type: AttributeType, plotNumber = 0) {
      self.filteredCases?.forEach((aFilteredCases) => {
        aFilteredCases.invalidateCases()
      })
    },
    handleDataSetAction(actionCall: ISerializedActionCall) {
      const cacheClearingActions = ["setCaseValues", "addCases", "removeCases", "removeAttribute"]
      if (cacheClearingActions.includes(actionCall.name)) {
        self.clearCasesCache()
      }
      // forward all actions from dataset except "setCaseValues" which requires intervention
      if (actionCall.name === "setCaseValues") return
      if (actionCall.name === "invalidateCollectionGroups") {
        this._updateFilteredCasesCollectionID()
        this._invalidateCases()
      }
      self.handlers.forEach(handler => handler(actionCall))
    },
  }))
  .actions(self => ({
    handleDataSetChange(data?: IDataSet) {
      self.actionHandlerDisposer?.()
      self.actionHandlerDisposer = undefined
      self.clearCasesCache()
      self.clearFilteredCases()
      if (data) {
        self.actionHandlerDisposer = onAnyAction(data, self.handleDataSetAction)
        self.filteredCases[0] = new FilteredCases({
          source: data,
          filter: self.filterCase,
          collectionID: idOfChildmostCollectionForAttributes(self.attributes, data),
          onSetCaseValues: self.handleSetCaseValues
        })
      }
    }
  }))
  .actions(self => ({
    afterCreate() {
      // respond to change of dataset
      addDisposer(self, reaction(
        () => self.dataset,
        data => self.handleDataSetChange(data),
        {name: "DataConfigurationModel.afterCreate.reaction [dataset]", fireImmediately: true }
      ))
      // respond to change of legend attribute
      addDisposer(self, reaction(
        () => JSON.stringify(self.attributeDescriptionForRole("legend")),
        () => {
          self.invalidateQuantileScale()
          self.clearCasesCache()
        },
        {name: "DataConfigurationModel.afterCreate.reaction [legend attribute]"}
      ))
      // Invalidate cache when selection changes.
      addDisposer(self, reaction(
        () => self.dataset?.selection.values(),
        () =>  self.allCasesForCategoryAreSelected.invalidateAll(),
        {
          name: "DataConfigurationModel.afterCreate.reaction [allCasesForCategoryAreSelected invalidate cache]",
          equals: comparer.structural
        }
      ))
      // invalidate caches when hiddenCases changes
      addDisposer(self, reaction(
        () => self.hiddenCases.length,
        count => self._invalidateCases()
      ))
    },
    setDataset(dataset: IDataSet | undefined, metadata: ISharedCaseMetadata | undefined) {
      self.dataset = dataset
      self.metadata = metadata
    },
    clearAttributes() {
      self._attributeDescriptions.clear()
    },
    setAttribute(role: AttrRole, desc?: IAttributeDescriptionSnapshot) {
      self._setAttributeDescription(role, desc)
      self._setAttribute(role, desc)
      self.setPointsNeedUpdating(true)
    },
    setAttributeType(role: AttrRole, type: AttributeType, plotNumber = 0) {
      self._attributeDescriptions.get(role)?.setType(type)
      self._setAttributeType(role, type, plotNumber)
    },
    addNewHiddenCases(hiddenCases: string[]) {
      self.hiddenCases.push(...hiddenCases)
    },
    clearHiddenCases() {
      self.hiddenCases.replace([])
    }
  }))
  .actions(self => ({
    removeAttributeFromRole(role: AttrRole, attrID: string) {
      self.setAttribute(role)
    },
  }))
  .views(self => ({
    onAction(handler: (actionCall: ISerializedActionCall) => void) {
      const id = uniqueId()
      self.handlers.set(id, handler)
      return () => {
        self.handlers.delete(id)
      }
    }
  }))
  // performs the specified action so that response actions are included and undo/redo strings assigned
  .actions(applyUndoableAction)

export interface IDataConfigurationModel extends Instance<typeof DataConfigurationModel> {
}

export interface IDataConfigurationModelSnapshot extends SnapshotIn<typeof DataConfigurationModel> {
}
