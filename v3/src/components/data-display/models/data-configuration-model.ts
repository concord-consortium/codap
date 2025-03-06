import {extent, scaleQuantile, scaleQuantize} from "d3"
import {comparer, observable, reaction} from "mobx"
import {
  addDisposer, getEnv, getSnapshot, hasEnv, IAnyStateTreeNode, Instance, ISerializedActionCall,
  resolveIdentifier, SnapshotIn, types
} from "mobx-state-tree"
import {applyModelChange} from "../../../models/history/apply-model-change"
import {cachedFnWithArgsFactory} from "../../../utilities/mst-utils"
import { isFiniteNumber } from "../../../utilities/math-utils"
import { stringValuesToDateSeconds } from "../../../utilities/date-utils"
import {AttributeType, attributeTypes} from "../../../models/data/attribute-types"
import {DataSet, IDataSet} from "../../../models/data/data-set"
import {ICase} from "../../../models/data/data-set-types"
import {idOfChildmostCollectionForAttributes} from "../../../models/data/data-set-utils"
import { dataDisplayGetNumericValue } from "../data-display-value-utils"
import {ISharedCaseMetadata, SharedCaseMetadata} from "../../../models/shared/shared-case-metadata"
import {isSetCaseValuesAction} from "../../../models/data/data-set-actions"
import {FilteredCases, IFilteredChangedCases} from "../../../models/data/filtered-cases"
import {Formula, IFormula} from "../../../models/formula/formula"
import {
  kDefaultHighAttributeColor, kDefaultLowAttributeColor
} from "../../../models/shared/shared-case-metadata-constants"
import {hashStringSets, typedId, uniqueId} from "../../../utilities/js-utils"
import {getChoroplethColors, missingColor, parseColor} from "../../../utilities/color-utils"
import { numericSortComparator } from "../../../utilities/data-utils"
import { AxisPlace } from "../../axis/axis-types"
import {GraphPlace} from "../../axis-graph-shared"
import { getScaleThresholds } from "../components/legend/choropleth-legend/choropleth-legend"
import {CaseData} from "../d3-types"
import {
  AttrRole, GraphAttrRole, TipAttrRoles, graphPlaceToAttrRole, kOther, kMain, GraphSplitAttrRoles
} from "../data-display-types"

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

export type GraphAttributeDescriptionsMapSnapshot = Partial<Record<GraphAttrRole, IAttributeDescriptionSnapshot>>
export type AttributeDescriptionsMapSnapshot = Partial<Record<AttrRole, IAttributeDescriptionSnapshot>>

export const kUnknownDataConfigurationType = "unknownDataConfigurationType"
export const kDataConfigurationType = "dataConfigurationType"

// A DataConfigurationModel (or a containing tile model) can be created with an environment containing
// a provisional dataset and metadata. In this case, the provisional dataset or metadata will be retrieved
// instead of the DataConfiguration's own. This allows the DI system to set up a graph tile snapshot,
// referencing the dataset and metadata as necessary, outside the main MST tree.
interface IProvisionalEnvironment {
  provisionalDataSet?: IDataSet
  provisionalMetadata?: ISharedCaseMetadata
}

export function getProvisionalDataSet(node: IAnyStateTreeNode | null) {
  const env = node && hasEnv(node) ? getEnv<IProvisionalEnvironment>(node) : {}
  return env.provisionalDataSet
}

export function getProvisionalMetadata(node: IAnyStateTreeNode | null) {
  const env = node && hasEnv(node) ? getEnv<IProvisionalEnvironment>(node) : {}
  return env.provisionalMetadata
}

export const DataConfigurationModel = types
  .model('DataConfigurationModel', {
    id: types.optional(types.identifier, () => typedId("DCON")),
    type: types.optional(types.string, kDataConfigurationType),
    // keys are AttrRoles, excluding y role
    _attributeDescriptions: types.map(AttributeDescription),
    dataset: types.safeReference(DataSet, {
      get(identifier: string, parent: IAnyStateTreeNode | null): any {
        return getProvisionalDataSet(parent) ?? resolveIdentifier<typeof DataSet>(DataSet, parent, identifier)
      },
      set(dataSet: IDataSet) {
        return dataSet.id
      }
    }),
    metadata: types.safeReference(SharedCaseMetadata, {
      get(identifier: string, parent: IAnyStateTreeNode | null): any {
        return getProvisionalMetadata(parent) ??
          resolveIdentifier<typeof SharedCaseMetadata>(SharedCaseMetadata, parent, identifier)
      },
      set(metadata: ISharedCaseMetadata) {
        return metadata.id
      }
    }),
    hiddenCases: types.array(types.string),
    displayOnlySelectedCases: types.maybe(types.boolean),
    filterFormula: types.maybe(Formula)
  })
  .volatile(() => ({
    actionHandlerDisposer: undefined as (() => void) | undefined,
    filteredCases: observable.array<FilteredCases>([], { deep: false }),
    handlers: new Map<string, (actionCall: ISerializedActionCall) => void>(),
    pointsNeedUpdating: false,
    casesChangeCount: 0,
    // cached result of filter formula evaluation for each case ID
    filteredOutCaseIds: observable.set<string>(),
    filterFormulaError: "",
    // The following is set in useSubAxis:setupCategories based on how many fit in available space
    numberOfCategoriesLimitByRole: observable.map<AttrRole, Maybe<number>>()
  }))
  .views(self => ({
    get axisAttributeIDs() {
      // Note that 'caption' and 'legend' are not roles we include here
      return (['x', 'y', 'rightNumeric', 'topSplit', 'rightSplit', 'lat', 'long', 'polygon'] as const)
        .map(aRole => this.attributeID(aRole))
        .filter(id => !!id)
    },
    get childmostCollectionIDForAxisAttributes() {
        return idOfChildmostCollectionForAttributes(this.axisAttributeIDs, self.dataset)
    },
    get isEmpty() {
      return self._attributeDescriptions.size === 0
    },
    get attributeDescriptions() {
      return getSnapshot(self._attributeDescriptions) as AttributeDescriptionsMapSnapshot
    },
    get attributeDescriptionsStr() {
      return JSON.stringify(this.attributeDescriptions)
    },
    attributeDescriptionForRole(role: AttrRole) {
      return this.attributeDescriptions[role]
    },
    // returns empty string (rather than undefined) for roles without attributes
    attributeID(role: AttrRole) {
      const defaultCaptionAttributeID = () => {
        // We find the childmost collection and return the first attribute in that collection. If there is no
        // childmost collection, we return the first attribute in the dataset.
        const attrIDs = (['x', 'y', 'rightNumeric', 'topSplit', 'rightSplit', 'legend', 'lat', 'long'] as const)
            .map(aRole => this.attributeID(aRole))
            .filter(id => !!id),
          childmostCollectionID = idOfChildmostCollectionForAttributes(attrIDs, self.dataset)
        if (childmostCollectionID) {
          const childmostCollection = self.dataset?.getCollection(childmostCollectionID),
            childmostCollectionAttributes = childmostCollection?.attributes
          if (childmostCollectionAttributes?.length) {
            const firstAttribute = childmostCollectionAttributes[0]
            return firstAttribute?.id
          }
        }
        return self.dataset?.childCollection.attributes[0]?.id
      }

      let attrID = this.attributeDescriptionForRole(role)?.attributeID || ""
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
    roleForAttributeWithCategoryLimit(attrID: string) {
      return GraphSplitAttrRoles.find(role => {
        return self.numberOfCategoriesLimitByRole.get(role) !== undefined
      })
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
      self.filteredCases.clear()
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
                                       descriptions: AttributeDescriptionsMapSnapshot) {
      return Object.entries(descriptions).every(([role, {attributeID}]) => {
        // can still plot the case without a caption or a legend
        if (["caption", "legend"].includes(role)) return true
        switch (self.attributeType(role as AttrRole)) {
          // TODO: handle "date" type
          case "numeric":
            return isFiniteNumber(data.getNumeric(caseID, attributeID))
          case "categorical":
            // Treat 0 as a string and return true for all non-empty strings
            return !!data.getStrValue(caseID, attributeID)
          default: {
            // for now, all other types must just be non-empty
            const value = data.getValue(caseID, attributeID)
            return value != null && value !== ""
          }
        }
      })
    },
    // This function can be called either here in this base class or in a subclass to handle the situation in which
    // caseArrayNumber === 0.
    _filterCase(data: IDataSet, caseID: string) {
      // If the case is hidden or filtered out we don't plot it.
      // Also, if displayOnlySelectedCases is true, we only plot selected cases.
      if (self.hiddenCasesSet.has(caseID) || self.filteredOutCaseIds.has(caseID) ||
        (self.displayOnlySelectedCases && self.dataset && !self.dataset.isCaseSelected(caseID))) {
        return false
      }
      return this._caseHasValidValuesForDescriptions(data, caseID, self.attributeDescriptions)
    },
  }))
  .views(self => ({
    filterCase(data: IDataSet, caseID: string, caseArrayNumber?: number) {
      return self._filterCase(data, caseID)
    }
  }))
  .views(self => ({
    get hasFilterFormula() {
      return !!self.filterFormula && !self.filterFormula.empty
    },
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
    /**
     * Return all cases that are plotted at least once:
     * - set aside cases in the dataset should be excluded
     * - cases filtered by the filter formula in the dataset should be excluded
     * - cases hidden in the visualization should be excluded
     * - cases filtered by the filter formula in the visualization should be excluded
     * - cases that do not have valid values for the configured role attribute descriptions. An example is
     *   when a case has a non-numeric value for a numeric axis. If the case can be shown multiple times,
     *   all instances have to be invalid for it to be excluded.
     */
    get visibleCaseIds() {
      const allCaseIds = new Set<string>()
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
      if (!self.dataset) return []
      return Array.from(this.visibleCaseIds).filter(caseId => self.dataset?.isCaseSelected(caseId))
    },
    /**
     * This returns an array of the visible cases that are unselected.
     * If displayOnlySelectedCases is enabled, this will return an empty set.
     */
    get unselectedCases() {
      if (!self.dataset) return []
      return Array.from(this.visibleCaseIds).filter(caseId => !self.dataset?.isCaseSelected(caseId))
    }
  }))
  .views(self => ({
    // Note that we have to go through each of the filteredCases in order to return all the values
    valuesForAttrRole: cachedFnWithArgsFactory({
      key: (role: AttrRole) => role,
      calculate: (role: AttrRole) => {
        const attrID = self.attributeID(role)
        const dataset = self.dataset
        const allCaseIDs = Array.from(self.visibleCaseIds)
        const allValues = attrID ? allCaseIDs.map((anID: string) => dataset?.getStrValue(anID, attrID)) : []
        return allValues.filter(aValue => aValue) as string[]
      },
      name: "valuesForAttrRole"
    })
  }))
  .views(self => ({
    /**
     * This returns just values which can be converted to numbers for the
     * attribute of this role. It does not include all cases, see `visibleCaseIds`.
     * TODO: it seems better if this included unselected cases when displayOnlySelectedCases is enabled
     */
    numericValuesForAttrRole: cachedFnWithArgsFactory({
      key: (role: AttrRole) => role,
      calculate: (role: AttrRole) => {
        const attrID = self.attributeID(role)
        const dataset = self.dataset
        const allCaseIDs = Array.from(self.visibleCaseIds)
        const allValues = attrID
          ? allCaseIDs.map((anID: string) => {
            const value = dataDisplayGetNumericValue(dataset, anID, attrID)
            return isFiniteNumber(value) ? value : null
          }) : []
        return allValues.filter(aValue => aValue != null)
      },
      name: "numericValuesForAttrRole"
    }),
    categorySetForAttrRole(role: AttrRole) {
      if (self.metadata) {
        const attributeID = self.attributeID(role) || ''
        return self.metadata.getCategorySet(attributeID)
      }
    },
    get categoricalRoles(): AttrRole[] {
      return self.attributeType("legend") === "categorical" ? ["legend"] : []
    }
  }))
  .views(self => ({
    /**
     * @param role
     * @param emptyCategoryArray
     */
    categoryArrayForAttrRole: cachedFnWithArgsFactory<(role: AttrRole, emptyCategoryArray?: string[]) => string[]>({
      key: (role: AttrRole, emptyCategoryArray = [kMain]) => JSON.stringify({ role, emptyCategoryArray }),
      calculate: (role: AttrRole, emptyCategoryArray = [kMain]) => {
        const valuesSet = new Set(self.valuesForAttrRole(role)),
          categoryLimitForRole = self.numberOfCategoriesLimitByRole.get(role)
        if (valuesSet.size === 0) return emptyCategoryArray

        let resultArray: string[] = []
        // category set maintains the canonical order of categories
        const allCategorySet = self.categorySetForAttrRole(role)
        // if we don't have a category set just return the values
        if (!allCategorySet && valuesSet.size > 0) {
          resultArray = Array.from(valuesSet)
        }
        else {
          // return the categories in canonical order
          allCategorySet?.values.forEach(category => {
            if (valuesSet.has(category)) {
              resultArray.push(category)
            }
          })
          if (categoryLimitForRole && resultArray.length > categoryLimitForRole) {
            resultArray.length = categoryLimitForRole
            resultArray[categoryLimitForRole - 1] = kOther
          }
        }
        return resultArray
      },
      name: "categoryArrayForAttrRole"
    }),
    get allCategoriesForRoles() {
      const categories: Map<AttrRole, string[]> = new Map()
      const roles = self.categoricalRoles
      roles.forEach(role => {
        const categorySet = self.categorySetForAttrRole(role)
        if (categorySet) {
          categories.set(role, categorySet.valuesArray)
        }
      })
      return categories
    }
  }))
  .views(self => ({
    getUnsortedCaseDataArray(caseArrayNumber: number): CaseData[] {
      return (self.filteredCases[caseArrayNumber]?.caseIds || []).map(id => {
        return {plotNum: caseArrayNumber, caseID: id}
      })
    }
  }))
  .views(self => ({
    // Note that we have to go through each of the filteredCases in order to return all the values
    getCaseDataArray: cachedFnWithArgsFactory({
      key: (caseArrayNumber: number) => String(caseArrayNumber),
      calculate: (caseArrayNumber: number) => {
        const caseDataArray = self.getUnsortedCaseDataArray(caseArrayNumber),
          legendAttrID = self.attributeID('legend')
        if (legendAttrID) {
          if (self.attributeType("legend") === "numeric") {
            caseDataArray.sort((cd1: CaseData, cd2: CaseData) => {
              const cd1Value = self.dataset?.getNumeric(cd1.caseID, legendAttrID) ?? NaN,
                cd2Value = self.dataset?.getNumeric(cd2.caseID, legendAttrID) ?? NaN
              return numericSortComparator({a: cd1Value, b: cd2Value, order: "desc"})
            })
          } else {
            const categories = Array.from(self.categoryArrayForAttrRole('legend'))
            caseDataArray.sort((cd1: CaseData, cd2: CaseData) => {
              const cd1Value = self.dataset?.getStrValue(cd1.caseID, legendAttrID) ?? '',
                cd2Value = self.dataset?.getStrValue(cd2.caseID, legendAttrID) ?? ''
              return categories.indexOf(cd1Value) - categories.indexOf(cd2Value)
            })
          }
        }
        return caseDataArray
      },
      name: "getCaseDataArray"
    }),
    get joinedCaseDataArrays() {
      const joinedCaseData: CaseData[] = []
      self.filteredCases.forEach((aFilteredCases, index) => {
          aFilteredCases.caseIds.forEach(
            (id) => joinedCaseData.push({plotNum: index, caseID: id}))
        }
      )
      return joinedCaseData
    },
    get lowColor() {
      const attrId = self.attributeID("legend")
      return self.metadata?.getAttributeColorRange(attrId).low
    },
    get highColor() {
      const attrId = self.attributeID("legend")
      return self.metadata?.getAttributeColorRange(attrId).high
    }
  }))
  .views(self => ({
    // observable hash of rendered case ids
    get caseDataHash() {
      return hashStringSets(self.filteredCases.map(cases => cases.caseIds))
    },
    get choroplethColors() {
      return getChoroplethColors(
        self.lowColor ?? kDefaultLowAttributeColor,
        self.highColor ?? kDefaultHighAttributeColor
      )
    }
  }))
  .views(self => ({
    get legendNumericColorScale() {
      // TODO: Handle the displayOnlySelectedCases better. What we would like to do is
      // to basically ignore displayOnlySelectedCases when computing the legend bins.
      // This way the legend will not jump around when the user is selecting different
      // cases when in displayOnlySelectedCases mode.
      // There are several criteria besides displayOnlySelectedCases which impact which
      // cases are shown on the visualization:
      // - set aside cases in the dataset should be excluded
      // - cases filtered by the filter formula in the dataset should be excluded
      // - cases hidden in the visualization should be excluded
      // - cases filtered by the filter formula in the visualization should be excluded
      // - cases that are not plottable on at least one of the plots of the visualization
      //   should be excluded
      // All of these criteria are handled by numericValuesForAttrRole("legend") but it also
      // excludes unselected cases if displayOnlySelectedCases is enabled.
      // It would make sense for numericValuesForAttrRole to ignore the
      // displayOnlySelectedCases criteria. It is used here and also to compute the axis extents.
      // The axes should also not jump around when using displayOnlySelectedCases.
      // Implementing this is hard because of the last bullet. Handling the "not plottable"
      // cases is done by the FilteredCases system which is overridden by the
      // GraphDataConfigurationModel in order to handle graphs with multiple y axes. This
      // FilterCases system is also what implements displayOnlySelectedCases.
      // The best solution might be to separate the displayOnlySelectedCases from FilterCases,
      // perhaps by renaming it PlottableCases and then apply the displayOnlySelectedCases
      // criteria further up chain of filters.
      const values = self.numericValuesForAttrRole("legend") ?? []

      const legendAttrId = self.attributeID("legend")
      const binningType = self.metadata?.getAttributeBinningType(legendAttrId)
      switch (binningType) {
        case "quantize": {
          const extents = extent(values)
          if (extents[0] == null || extents[1] == null) {
            return scaleQuantize([], self.choroplethColors)
          }
          return scaleQuantize(extents, self.choroplethColors)

        }
        case "quantile":
        default:
          return scaleQuantile(values, self.choroplethColors)
      }
    },
  }))
  .views(self => (
    {
      getLegendColorForCategory(cat: string): string {
        const categorySet = self.categorySetForAttrRole('legend')
        return categorySet?.colorForCategory(cat) ?? missingColor
      },

      getLegendColorForNumericValue(value: number): string {
        return self.legendNumericColorScale(value)
      },

      getLegendColorForDateValue(value: string): string {
        const dateValueArray = stringValuesToDateSeconds([value])
        return self.legendNumericColorScale(dateValueArray[0])
      },

      getCasesForCategoryValues(
        primaryAttrRole: AttrRole, primaryValue: string, secondaryValue?: string, primarySplitValue?: string,
        secondarySplitValue?: string, legendCat?: string, extend = false
      ) {
        const dataset = self.dataset,
          primaryAttrID = self.attributeID(primaryAttrRole),
          secondaryAttrRole = primaryAttrRole === "x" ? "y" : "x",
          extraPrimaryAttrRole = primaryAttrRole === "x" ? "topSplit" : "rightSplit",
          extraSecondaryAttrRole = primaryAttrRole === "x" ? "rightSplit" : "topSplit",
          secondaryAttrID = self.attributeID(secondaryAttrRole),
          extraPrimaryAttrID = self.attributeID(extraPrimaryAttrRole),
          extraSecondaryAttrID = self.attributeID(extraSecondaryAttrRole)

        return primaryAttrID
          ? self.getCaseDataArray(0).filter((aCaseData: CaseData) => {
            return dataset?.getStrValue(aCaseData.caseID, primaryAttrID) === primaryValue &&
              (secondaryValue === kMain ||
                dataset?.getStrValue(aCaseData.caseID, secondaryAttrID) === secondaryValue) &&
              (primarySplitValue === kMain ||
                dataset?.getStrValue(aCaseData.caseID, extraPrimaryAttrID) === primarySplitValue) &&
              (secondarySplitValue === kMain ||
                dataset?.getStrValue(aCaseData.caseID, extraSecondaryAttrID) === secondarySplitValue) &&
              (!legendCat ||
                dataset?.getStrValue(aCaseData.caseID, self.attributeID("legend")) === legendCat)
          }).map((aCaseData: CaseData) => aCaseData.caseID)
          : []
      },

      getCasesForLegendValue(aValue: string) {
        const dataset = self.dataset,
          legendID = self.attributeID('legend'),
          collectionGroup = dataset?.getCollectionForAttribute(legendID || '')
        let caseIDs: string[] = []
        if (collectionGroup) {
          const parentCases = dataset?.getCasesForCollection(collectionGroup.id)
          parentCases?.forEach((aCase: ICase) => {
            if (dataset?.getStrValue(aCase.__id__, legendID || '') === aValue) {
              caseIDs?.push(aCase.__id__)
            }
          })
        } else {
          caseIDs = legendID ? self.getCaseDataArray(0).filter((aCaseData: CaseData) => {
              return dataset?.getStrValue(aCaseData.caseID, legendID) === aValue
            }).map((aCaseData: CaseData) => aCaseData.caseID)
            : []
        }
        return caseIDs
      },
      allCasesForCategoryAreSelected: cachedFnWithArgsFactory({
        key: (cat: string) => cat,
        calculate: (cat: string) => {
          const dataset = self.dataset
          const legendID = self.attributeID('legend')
          const selection = (legendID && self.getCaseDataArray(0).filter((aCaseData: CaseData) =>
            dataset?.getStrValue(aCaseData.caseID, legendID) === cat
          ).map((aCaseData: CaseData) => aCaseData.caseID)) ?? []
          return selection.length > 0 && (selection as Array<string>).every(anID => dataset?.isCaseSelected(anID))
        },
        name: "allCasesForCategoryAreSelected"
      }),
      getCasesInLegendRange(min: number, max: number) {
        const dataset = self.dataset
        const legendID = self.attributeID('legend')
        return legendID
          ? self.getCaseDataArray(0).filter((aCaseData: CaseData) => {
            const value = dataDisplayGetNumericValue(dataset, aCaseData.caseID, legendID)
            return value !== undefined && value >= min && value < max
          }).map((aCaseData: CaseData) => aCaseData.caseID)
          : []

      }
    }))
  .views(self => (
    {
      getCasesForLegendBin(bin: number) {
        const scale = self.legendNumericColorScale
        const thresholds = getScaleThresholds(scale)
        const min = bin === 0 ? -Infinity : thresholds[bin - 1]
        const max = bin === thresholds.length ? Infinity : thresholds[bin]
        return self.getCasesInLegendRange(min, max)
      }
    }))
  .views(self => (
    {
      casesInBinAreSelected(quantile: number): boolean {
        const selection = self.getCasesForLegendBin(quantile)
        return !!(selection.length > 0 && selection?.every((anID: string) => self.dataset?.isCaseSelected(anID)))
      }
    }))
  .views(self => (
    {
      /**
       * Called to determine whether the categories on an axis should be centered.
       */
      categoriesForAxisShouldBeCentered(place: AxisPlace) {
        return true
      },
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
      /**
       * This is a domain which can be monitored by reactions without having to
       * request the color for every case to see if the colors have changed.
       * For numeric and date it is an actual d3 color scale.
       * For categorical it is a map of categories to colors
       * The color type is not handled yet.
       */
      get legendColorDomain() {
        const legendType = self.attributeType('legend')
        switch (legendType) {
          case "categorical": {
            const categorySet = self.categorySetForAttrRole('legend')
            return categorySet?.colorMap
          }
          case "numeric":
          case "date":
            return self.legendNumericColorScale
          case "color":
            // TODO: we need to be watching for any changes to the legend attribute values
            return 0
          default:
            return 0
        }
      },
      getLegendColorForCase(id: string): string {

        const collectionOfLegendIsMoreChildmost = () => {
          const legendCollectionID = self.dataset?.getCollectionForAttribute(legendID)?.id,
            legendCollectionIndex = self.dataset?.getCollectionIndex(legendCollectionID) ?? 0,
            childmostCollectionID = idOfChildmostCollectionForAttributes(self.axisAttributeIDs, self.dataset),
            childmostCollectionIndex = self.dataset?.getCollectionIndex(childmostCollectionID) ?? 0
          return legendCollectionIndex > childmostCollectionIndex
        }

        const legendID = self.attributeID('legend')
        // todo: When user deletes we are not currently deleting the legend attribute ID. But we should.
        const legendAttribute = self.dataset?.getAttribute(legendID)
        if (!id || !legendID || !legendAttribute) {
          return ''
        }
        const legendType = self.attributeType('legend')
        if (collectionOfLegendIsMoreChildmost()) {
          return missingColor
        }
        const legendValue = self.dataset?.getStrValue(id, legendID)
        if (!legendValue) {
          return missingColor
        }
        switch (legendType) {
          case 'categorical':
            return self.getLegendColorForCategory(legendValue)
          case 'numeric':
            return self.getLegendColorForNumericValue(Number(legendValue))
          case 'date':
            return self.getLegendColorForDateValue(legendValue)
          case 'color':
            return parseColor(legendValue, { colorNames: true }) ? legendValue : missingColor
          case 'checkbox':
            return self.getLegendColorForCategory(legendValue)
          default:
            return ''
        }
      }
    }))
  .actions(self => ({
    clearCasesCache() {
      self.valuesForAttrRole.invalidateAll()
      self.numericValuesForAttrRole.invalidateAll()
      self.categoryArrayForAttrRole.invalidateAll()
      self.allCasesForCategoryAreSelected.invalidateAll()
      self.getCaseDataArray.invalidateAll()
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
    // This will only swap the categories if they are neighbors.
    // If the categories are not next to each other the behavior is complex,
    // so it is best to read the code to understand what will happen.
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
      const [affectedCases] = actionCall.args
      // this is called by the FilteredCases object with additional information about
      // whether the value changes result in adding/removing any cases from the filtered set
      // a single call to setCaseValues can result in up to three calls to the handlers
      if (cases.added.length) {
        const newCases = self.dataset?.getItems(cases.added)
        self.handlers.forEach(handler => handler({name: "addCases", args: [newCases]}))
      }
      if (cases.removed.length) {
        self.handlers.forEach(handler => handler({name: "removeCases", args: [cases.removed]}))
      }
      if (cases.changed.length) {
        const idSet = new Set(cases.changed)
        const changedCases = affectedCases.filter(aCase => idSet.has(aCase.__id__))
        self.handlers.forEach(handler => handler({name: "setCaseValues", args: [changedCases]}))
        ++self.casesChangeCount
      }
    },
    _updateFilteredCasesCollectionID() {
      const childmostCollectionID = idOfChildmostCollectionForAttributes(self.axisAttributeIDs, self.dataset)
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
    _clearFilteredCases(dataset: IDataSet | undefined) {
      self.filteredCases.forEach((aFilteredCases) => {
        aFilteredCases.destroy()
      })
      self.filteredCases.clear()
      if (dataset) {
        self.filteredCases[0] = new FilteredCases({
          source: dataset,
          filter: self.filterCase,
          collectionID: idOfChildmostCollectionForAttributes(self.attributes, dataset),
          onSetCaseValues: this.handleSetCaseValues
        })
      }
    },
    _setAttributeType(type: AttributeType, plotNumber = 0) {
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
    setLegendColorForCategory(cat: string, color: string) {
      const categorySet = self.categorySetForAttrRole('legend')
      categorySet?.setColorForCategory(cat, color)
    },
    setNumberOfCategoriesLimitForRole(role: AttrRole, limit: number | undefined) {
      if (limit !== undefined && limit <= 0) {
        limit = undefined
      }
      self.numberOfCategoriesLimitByRole.set(role, limit)
      self.categoryArrayForAttrRole.invalidate(role)
    },
  }))
  .actions(self => ({
    clearFilterFormula() {
      self.filterFormula = undefined
      self.filteredOutCaseIds.clear()
      self.filterFormulaError = ""
      self._invalidateCases()
    }
  }))
  .actions(self => ({
    setFilterFormula(display: string) {
      if (display) {
        if (!self.filterFormula) {
          self.filterFormula = Formula.create({ display })
        }
        else {
          self.filterFormula.setDisplayExpression(display)
        }
      } else {
        self.clearFilterFormula()
      }
    },
    updateFilterFormulaResults(filterFormulaResults: { itemId: string, result: boolean }[], { replaceAll = false }) {
      if (replaceAll) {
        self.filteredOutCaseIds.clear()
      }
      filterFormulaResults.forEach(({ itemId, result }) => {
        if (result === false) {
          self.filteredOutCaseIds.add(itemId)
        }
        else {
          self.filteredOutCaseIds.delete(itemId)
        }
      })
      self._invalidateCases()
    },
    setFilterFormulaError(error: string) {
      self.filterFormulaError = error
    }
  }))
  .actions(self => ({
    handleDataSetChange(data?: IDataSet) {
      self.actionHandlerDisposer?.()
      self.actionHandlerDisposer = undefined
      self._clearFilteredCases(data)
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
      addDisposer(self, reaction(
        () => self.allCategoriesForRoles,
        () => self.clearCasesCache(),
        {
          name: "DataConfigurationModel.afterCreate.reaction [allCategoriesForRoles]",
          equals: comparer.structural
        }
      ))
      addDisposer(self, reaction(
        () => {
          const legendCategorySet = self.categorySetForAttrRole("legend")
          return legendCategorySet?.valuesArray
        },
        () => self.clearCasesCache(),
        {
          name: "DataConfigurationModel.afterCreate.reaction [allCategoriesForRoles]",
          equals: comparer.structural
        }
      ))
      // respond to change of legend attribute
      addDisposer(self, reaction(
        () => JSON.stringify(self.attributeDescriptionForRole("legend")),
        () => {
          self.clearCasesCache()
        },
        {name: "DataConfigurationModel.afterCreate.reaction [legend attribute]"}
      ))
      // Invalidate cache when selection changes.
      addDisposer(self, reaction(
        () => self.dataset?.selection.values(),
        () => {
          if (self.displayOnlySelectedCases) {
            self.clearCasesCache()
          } else {
            self.allCasesForCategoryAreSelected.invalidateAll()
          }
        },
        {
          name: "DataConfigurationModel.afterCreate.reaction [allCasesForCategoryAreSelected invalidate cache]",
          equals: comparer.structural
        }
      ))
      // invalidate caches when set of visible cases changes
      addDisposer(self, reaction(
        () => self.caseDataHash,
        () => self._invalidateCases(),
        { name: "DataConfigurationModel.afterCreate.reaction [add/remove/hide cases]" }
      ))
      // invalidate filtered cases when childmost collection changes
      addDisposer(self, reaction(
        () => self.childmostCollectionIDForAxisAttributes,
        () => self._clearFilteredCases(self.dataset),
        { name: "DataConfigurationModel.afterCreate.reaction [childmost collection]" }
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
      self.setPointsNeedUpdating(true)
      self.numericValuesForAttrRole.invalidate(role)  // No harm in invalidating even if not numeric
    },
    setAttributeType(role: AttrRole, type: AttributeType, plotNumber = 0) {
      self._attributeDescriptions.get(role)?.setType(type)
      self._setAttributeType(type, plotNumber)
    },
    addNewHiddenCases(hiddenCases: string[]) {
      self.hiddenCases.push(...hiddenCases)
    },
    clearHiddenCases() {
      self.hiddenCases.replace([])
    },
    setHiddenCases(hiddenCases: string[]) {
      self.hiddenCases.replace(hiddenCases)
    },
    setDisplayOnlySelectedCases(displayOnlySelectedCases: boolean) {
      self.displayOnlySelectedCases = displayOnlySelectedCases || undefined
      self.clearCasesCache()
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
  .actions(applyModelChange)

export interface IDataConfigurationModel extends Instance<typeof DataConfigurationModel> {
}

export interface IDataConfigurationModelSnapshot extends SnapshotIn<typeof DataConfigurationModel> {
}

export interface IDataConfigurationWithFilterFormula extends IDataConfigurationModel {
  filterFormula: IFormula
}

export function isFilterFormulaDataConfiguration(dataConfig?: IDataConfigurationModel):
  dataConfig is IDataConfigurationWithFilterFormula {
    return !!dataConfig?.hasFilterFormula
  }
