import {comparer, reaction} from "mobx"
import {addDisposer, getSnapshot, Instance, SnapshotIn, types} from "mobx-state-tree"
import { AttributeType, isCategoricalAttributeType } from "../../../models/data/attribute-types"
import {IDataSet} from "../../../models/data/data-set"
import {typedId} from "../../../utilities/js-utils"
import { isFiniteNumber } from "../../../utilities/math-utils"
import { cachedFnFactory, cachedFnWithArgsFactory, safeGetSnapshot } from "../../../utilities/mst-utils"
import {GraphPlace} from "../../axis-graph-shared"
import {AxisPlace} from "../../axis/axis-types"
import { CaseData, CaseDataWithSubPlot } from "../../data-display/d3-types"
import {
  AttrRole, GraphAttrRole, graphPlaceToAttrRole, ICaseSubsetDescription, kMain, kOther, PrimaryAttrRoles
} from "../../data-display/data-display-types"
import {
  AttributeDescription, DataConfigurationModel, IAttributeDescriptionSnapshot, IDataConfigurationModel
} from "../../data-display/models/data-configuration-model"
import {updateCellKey} from "../adornments/utilities/adornment-utils"

export const kGraphDataConfigurationType = "graphDataConfigurationType"

interface ILegalAttributeOptions {
  allowSameAttr?: boolean
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

export const GraphDataConfigurationModel = DataConfigurationModel
  .named('GraphDataConfigurationModel')
  .props({
    id: types.optional(types.identifier, () => typedId("GDCON")),
    type: types.optional(types.literal(kGraphDataConfigurationType), kGraphDataConfigurationType),
    // determines stacking direction in categorical-categorical, for instance
    primaryRole: types.maybe(types.enumeration([...PrimaryAttrRoles])),
    // all attributes for (left) y role
    _yAttributeDescriptions: types.array(AttributeDescription),
    showMeasuresForSelection: types.maybe(types.boolean),
  })
  .views(self => ({
    get secondaryRole(): Maybe<'x' | 'y'> {
      return self.primaryRole === 'x' ? 'y'
        : self.primaryRole === 'y' ? 'x'
          : undefined
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
      const descriptions: Partial<Record<AttrRole, IAttributeDescriptionSnapshot>> =
        {...getSnapshot(self._attributeDescriptions)}
      delete descriptions.rightNumeric
      if (self._yAttributeDescriptions.length > 0) {
        descriptions.y = safeGetSnapshot(self._yAttributeDescriptions[0])
      }
      return descriptions
    },
    get attributeDescriptionsStr() {
      return JSON.stringify(this.attributeDescriptions)
    },
    /**
     * For the 'y' role we return the first y-attribute, for 'rightNumeric' we return the last y-attribute.
     * For all other roles we return the attribute description for the role.
     */
    attributeDescriptionForRole(role: GraphAttrRole) {
      return role === 'y' ? safeGetSnapshot(this.yAttributeDescriptions[0])
        : role === 'rightNumeric' ? self._attributeDescriptions.get('rightNumeric')
          : this.attributeDescriptions[role]
    },
    placeCanHaveZeroExtent(place: GraphPlace) {
      return ['rightNumeric', 'legend', 'top', 'rightCat'].includes(place) &&
        self.attributeID(graphPlaceToAttrRole[place]) === ''
    },
    placeCanShowClickHereCue(place: GraphPlace, pointsFusedIntoBars = false) {
      const role = graphPlaceToAttrRole[place]
      const isSecondaryRole = (place === 'left' || place === 'bottom') && self.primaryRole !== role
      return ['left', 'bottom'].includes(place) && !self.attributeID(role) && !(isSecondaryRole && pointsFusedIntoBars)
    },
    placeAlwaysShowsClickHereCue(place: GraphPlace) {
      return this.placeCanShowClickHereCue(place) &&
        !self.attributeID(graphPlaceToAttrRole[place === 'left' ? 'bottom' : 'left'])
    },
    get allYAttributeDescriptions() {
      const yAttributeDescriptions = getSnapshot(self._yAttributeDescriptions)
      const _y2AttributeDescription = self._attributeDescriptions.get("rightNumeric")
      const y2AttributeDescription = _y2AttributeDescription
                                        ? { y2AttributeDescription: getSnapshot(_y2AttributeDescription) }
                                        : undefined
      return { yAttributeDescriptions, ...y2AttributeDescription }
    }
  }))
  .views(self => {
    const baseRolesForAttribute = self.rolesForAttribute
    return {
      rolesForAttribute(attrID: string) {
        const roles = baseRolesForAttribute(attrID)
        if (self.yAttributeIDs.includes(attrID)) {
          // role depends on whether there are attributes remaining
          roles.push(self.yAttributeDescriptions.length > 1 ? "yPlus" : "y")
        }
        return roles
      }
    }
  })
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
    },
    get primaryAttributeType(): AttributeType {
      return self.primaryRole && self.attributeType(self.primaryRole) || "categorical"
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
    },
    synchronizeFilteredCases(descriptions?: {
      yAttributeDescriptions: IAttributeDescriptionSnapshot[], y2AttributeDescription?: IAttributeDescriptionSnapshot
    }) {
      const { yAttributeDescriptions, y2AttributeDescription } = descriptions ?? self.allYAttributeDescriptions
      const yAttrCount = yAttributeDescriptions.length + (y2AttributeDescription ? 1 : 0)
      const filteredCasesRequired = Math.max(1, yAttrCount)
      // remove any extraneous filteredCases
      while (self.filteredCases.length > filteredCasesRequired) {
        self.filteredCases.pop()?.destroy()
      }
      // add any required filteredCases
      while (self.dataset && self.filteredCases.length < filteredCasesRequired) {
        self._addNewFilteredCases()
      }
    },
    setShowMeasuresForSelection(showMeasuresForSelection: boolean) {
      self.showMeasuresForSelection = showMeasuresForSelection
    }
  }))
  .views(self => ({
    /**
     * We override the base implementation to handle the case where there are multiple y-attributes. We only have
     * to do this when caseArrayNumber is not zero; i.e. when the plot has multiple y-attributes.
     */
    filterCase(data: IDataSet, caseID: string, caseArrayNumber?: number) {
      // If the case is hidden we don't plot it
      if (self.hiddenCasesSet.has(caseID) || self.filteredOutCaseIds.has(caseID)) return false
      if (caseArrayNumber === 0 || caseArrayNumber === undefined) {
        return self._filterCase(data, caseID)
      }
      // Note that this excludes `rightNumeric` (see `attributeDescriptions` above)
      const descriptions = {...self.attributeDescriptions}
      // If a 'rightNumeric' attribute exists and caseArrayNumber is >= the length of _yAttributeDescriptions, then
      // we are looking at the rightNumeric attribute. Delete the y attribute description and add the rightNumeric one.
      // Otherwise, replace the y attribute description with the one at the given index.
      if (caseArrayNumber >= self._yAttributeDescriptions.length) {
        delete descriptions.y
        const rightNumeric = self.attributeDescriptionForRole('rightNumeric')
        if (rightNumeric) {
          descriptions.rightNumeric = rightNumeric
        }
      } else {
        descriptions.y = self._yAttributeDescriptions[caseArrayNumber]
      }
      return self._caseHasValidValuesForDescriptions(data, caseID, descriptions)
    }
  }))
  .views(self => ({
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
      if (!self.dataset || !self.filteredCases?.[0]) return []
      return Array.from(self.graphCaseIDs).filter(caseId => self.dataset?.isCaseSelected(caseId))
    }
  }))
  .views(self => (
    {
      numRepetitionsForPlace(place: GraphPlace) {
        // numRepetitions is the number of times an axis is repeated in the graph
        let numRepetitions = 1
        switch (place) {
          case 'left':
            numRepetitions = Math.max(self.categoryArrayForAttrRole('rightSplit').length, 1)
            break
          case 'bottom':
            numRepetitions = Math.max(self.categoryArrayForAttrRole('topSplit').length, 1)
        }
        return numRepetitions
      },
      get attrTypes() {
        return {
          bottom: self.attributeType("x"),
          left: self.attributeType("y"),
          top: self.attributeType("topSplit"),
          right: self.attributeType("rightSplit")
        }
      }
    }))
  .views(self => ({
    /**
     * For the purpose of computing percentages, we need to know the total number of cases we're counting.
     * A "subplot" contains the cases being considered. Subplots are always defined by topSplit and/or rightSplit
     * categorical attributes rather than any categorical attributes on the left or bottom.
     * A "cell" is defined by zero or more categorical attributes within a subplot.
     * A percentage is the percentage of cases within a subplot that are within a given cell.
     */
    get categoricalAttrCount() {
      const attrTypes = self.attrTypes
      return Object.values(attrTypes).filter(a => a === "categorical").length
    },
    get categoricalRoles(): AttrRole[] {
      return (["legend", "x", "y", "topSplit", "rightSplit"] as const).filter((role) => {
        return isCategoricalAttributeType(self.attributeType(role))
      })
    },
    get categoricalAttrs(): Array<{ role: AttrRole, attrId: string }> {
      const roles: Array<Maybe<AttrRole>> = [self.primaryRole, self.secondaryRole, "topSplit", "rightSplit"]
      return roles.filter(role => !!role).filter(role => {
        return self.attributeType(role) === "categorical"
      }).map(role => ({ role, attrId: self.attributeID(role) }))
    },
    get hasExactlyOneCategoricalAxis() {
      const attrTypes = self.attrTypes
      const xHasCategorical = attrTypes.bottom === "categorical" || attrTypes.top === "categorical"
      const yHasCategorical = attrTypes.left === "categorical"
      return (xHasCategorical && !yHasCategorical) || (!xHasCategorical && yHasCategorical)
    },
    get leftBottomCategoricalAttrCount() {
      const attrTypes = self.attrTypes
      return (isCategoricalAttributeType(attrTypes.left) ? 1 : 0) + (isCategoricalAttributeType(attrTypes.bottom)
        ? 1 : 0)
    }
  }))
  .views(self => ({
    get categoricalAttrsWithChangeCounts() {
      return self.categoricalAttrs.map(attrEntry => {
        const attr = self.dataset?.getAttribute(attrEntry.attrId)
        return { ...attrEntry, changeCount: attr?.changeCount ?? 0 }
      })
    },
    getCategoriesOptions() {
      // Helper used often by adornments that usually ask about the same categories and their specifics.
      const xAttrType = self.attributeType("x")
      const yAttrType = self.attributeType("y")
      return {
        xAttrId: self.attributeID("x"),
        xAttrType,
        xCats: xAttrType === "categorical" ? self.categoryArrayForAttrRole("x", []) : [""],
        yAttrId: self.attributeID("y"),
        yAttrType,
        yCats: yAttrType === "categorical" ? self.categoryArrayForAttrRole("y", []) : [""],
        topAttrId: self.attributeID("topSplit"),
        topCats: self.categoryArrayForAttrRole("topSplit", []) ?? [""],
        rightAttrId: self.attributeID("rightSplit"),
        rightCats: self.categoryArrayForAttrRole("rightSplit", []) ?? [""],
      }
    }
  }))
  .views(self => ({
    categoricalValueForCaseInRole(caseID: string, role: AttrRole) {
      const attrID = self.attributeID(role),
        categoryArray = self.categoryArrayForAttrRole(role),
        strValue = attrID ? self.dataset?.getStrValue(caseID, attrID) : ""
      return !attrID ? kMain
        : strValue && (strValue === '' || categoryArray?.includes(strValue)) ? strValue : kOther
    },
    categorySpecForCase(caseID: string, extraPrimaryAttrRole: AttrRole, extraSecondaryAttrRole: AttrRole) {
      const hasExtraPrimary = !!self.attributeID(extraPrimaryAttrRole),
        hasExtraSecondary = !!self.attributeID(extraSecondaryAttrRole)
      return {
        primary: (self.primaryRole && this.categoricalValueForCaseInRole(caseID, self.primaryRole)) ?? '',
        secondary: (self.secondaryRole &&
          this.categoricalValueForCaseInRole(caseID, self.secondaryRole)) || kMain,
        extraPrimary: (hasExtraPrimary &&
          this.categoricalValueForCaseInRole(caseID, extraPrimaryAttrRole)) || kMain,
        extraSecondary: (hasExtraSecondary &&
          this.categoricalValueForCaseInRole(caseID, extraSecondaryAttrRole)) || kMain
      }
    },
  }))
  .views(self => ({
    cellMap: cachedFnWithArgsFactory({
      key: (extraPrimaryAttrRole: AttrRole, extraSecondaryAttrRole: AttrRole,
            binWidth = 0, minValue = 0, totalNumberOfBins = 0) => {
        return totalNumberOfBins === 0 ? kMain
          : JSON.stringify({
            bw: binWidth, min: minValue, tnb: totalNumberOfBins
          })      },
      calculate: (extraPrimaryAttrRole: AttrRole, extraSecondaryAttrRole: AttrRole,
                  binWidth = 0, minValue = 0, totalNumberOfBins = 0) => {
        type BinMap = Record<string, Record<string, Record<string, Record<string, number>>>>
        const valueQuads = (self.getCaseDataArray(0) || []).map((aCaseData: CaseData) => {
            return self.categorySpecForCase(aCaseData.caseID, extraPrimaryAttrRole, extraSecondaryAttrRole)
          }),
          bins: BinMap = {}

        valueQuads?.forEach((aValue: any) => {
          const primaryValue = totalNumberOfBins > 0
            ? Math.floor((Number(aValue.primary) - minValue) / binWidth)
            : aValue.primary
          if (bins[aValue.extraPrimary] === undefined) {
            bins[aValue.extraPrimary] = {}
          }
          if (bins[aValue.extraPrimary][aValue.extraSecondary] === undefined) {
            bins[aValue.extraPrimary][aValue.extraSecondary] = {}
          }
          if (bins[aValue.extraPrimary][aValue.extraSecondary][primaryValue] === undefined) {
            bins[aValue.extraPrimary][aValue.extraSecondary][primaryValue] = {}
          }
          if (bins[aValue.extraPrimary][aValue.extraSecondary][primaryValue][aValue.secondary] === undefined) {
            bins[aValue.extraPrimary][aValue.extraSecondary][primaryValue][aValue.secondary] = 0
          }
          bins[aValue.extraPrimary][aValue.extraSecondary][primaryValue][aValue.secondary]++
        })

        return bins
      },
      name: 'cellMap'
    })
  }))
  .views(self => ({
    maxOverAllCells(extraPrimaryAttrRole: AttrRole, extraSecondaryAttrRole: AttrRole) {
      const bins = self.cellMap(extraPrimaryAttrRole, extraSecondaryAttrRole)
      // Find and return the maximum value in the bins
      return Object.keys(bins).reduce((epMax, epKey) => {
        return Math.max(epMax, Object.keys(bins[epKey]).reduce((esMax, esKey) => {
          return Math.max(esMax, Object.keys(bins[epKey][esKey]).reduce((pMax, pKey) => {
            return Math.max(pMax, Object.keys(bins[epKey][esKey][pKey]).reduce((sMax, sKey) => {
              return Math.max(sMax, bins[epKey][esKey][pKey][sKey])
            }, 0))
          }, 0))
        }, 0))
      }, 0)
    },
    maxPercentAllCells(extraPrimaryAttrRole: AttrRole, extraSecondaryAttrRole: AttrRole) {
      if (self.attributeID('legend')) return 100  // because we divide the full bar into categories
      const bins = self.cellMap(extraPrimaryAttrRole, extraSecondaryAttrRole)
      // Each ep/es pair defines a "subPlot" with a total number of cases and a cell with a max percentage
      let maxPercent = 0
      for (const epKey in bins) {
        const epBin = bins[epKey]
        for (const esKey in epBin) {
          const esBin = epBin[esKey]
          let numCasesInSubPlot = 0
          let maxCasesInCell = 0
          for (const pKey in esBin) {
            const pBin = esBin[pKey]
            for (const sKey in pBin) {
              const sBin = pBin[sKey]
              numCasesInSubPlot += sBin
              maxCasesInCell = Math.max(maxCasesInCell, sBin)
            }
          }
          const subPlotMaxPercent = numCasesInSubPlot === 0 ? 0
            : Math.max(maxPercent, 100 * maxCasesInCell / numCasesInSubPlot)
          maxPercent = Math.max(maxPercent, subPlotMaxPercent)
        }
      }
      return maxPercent
    },
    maxCellLength(
      extraPrimaryAttrRole: AttrRole, extraSecondaryAttrRole: AttrRole,
      binWidth: number, minValue: number, totalNumberOfBins: number
    ) {
      const bins = self.cellMap(extraPrimaryAttrRole, extraSecondaryAttrRole, binWidth, minValue, totalNumberOfBins)
      // Find and return the length of the record in bins with the most elements
      let maxInBin = 0
      for (const epKey in bins) {
        const epBin = bins[epKey]
        for (const esKey in epBin) {
          const esBin = epBin[esKey]
          for (const pKey in esBin) {
            const pBin = esBin[pKey]
            for (const sKey in pBin) {
              const sBin = pBin[sKey]
              maxInBin = Math.max(maxInBin, sBin)
            }
          }
        }
      }
      return maxInBin
    },
    cellKey(index: number) {
      const { xAttrId, xCats, yAttrId, yCats, topAttrId, topCats, rightAttrId, rightCats } = self.getCategoriesOptions()
      const rightCatCount = rightCats.length || 1
      const yCatCount = yCats.length || 1
      const xCatCount = xCats.length || 1
      let cellKey: Record<string, string> = {}

      // Determine which categories are associated with the cell's axes using the provided index value and
      // the attributes and categories present in the graph.
      const topIndex = Math.floor(index / (rightCatCount * yCatCount * xCatCount))
      const topCat = topCats[topIndex]
      cellKey = updateCellKey(cellKey, topAttrId, topCat)
      const rightIndex = Math.floor(index / (yCatCount * xCatCount)) % rightCatCount
      const rightCat = rightCats[rightIndex]
      cellKey = updateCellKey(cellKey, rightAttrId, rightCat)
      const yIndex = Math.floor(index / xCatCount) % yCatCount
      const yCat = yCats[yIndex]
      cellKey = updateCellKey(cellKey, yAttrId, yCat)
      const xCat = xCats[index % xCatCount]
      cellKey = updateCellKey(cellKey, xAttrId, xCat)

      return cellKey
    },
    getAllCellKeys() {
      const { xCats, yCats, topCats, rightCats } = self.getCategoriesOptions()
      const topCatCount = topCats.length || 1
      const rightCatCount = rightCats.length || 1
      const xCatCount = xCats.length || 1
      const yCatCount = yCats.length || 1
      const columnCount = topCatCount * xCatCount
      const rowCount = rightCatCount * yCatCount
      const totalCount = rowCount * columnCount
      const cellKeys: Record<string, string>[] = []
      for (let i = 0; i < totalCount; ++i) {
        cellKeys.push(this.cellKey(i))
      }
      return cellKeys
    },
    getAllCaseSubsetDescriptions() {
      const cellKeys = this.getAllCellKeys()
      const legendCategories = self.categoryArrayForAttrRole("legend") ?? [""]
      const cellSubsetDescriptions: ICaseSubsetDescription[] = []
      cellKeys.forEach(cellKey => {
        legendCategories.forEach(category => {
          cellSubsetDescriptions.push({category, cellKey})
        })
      })
      return cellSubsetDescriptions
    },
    isCaseInSubPlot(cellKey: Record<string, string>, caseData: Record<string, any>) {
      const numOfKeys = Object.keys(cellKey).length
      let matchedValCount = 0
      Object.keys(cellKey).forEach(key => {
        if (cellKey[key] === kMain || cellKey[key] === caseData[key]) matchedValCount++
      })
      return matchedValCount === numOfKeys
    },
    allPlottedCases: cachedFnFactory(() => {
      const casesInPlot = new Set<string>()
      self.filteredCases?.forEach(aFilteredCases => {
        aFilteredCases.caseIds.forEach((id) => {
          casesInPlot.add(id)
        })
      })
      return Array.from(casesInPlot)
    })
  }))
  .views(self => ({
    subPlotKey(anID: string) {
      const primaryAttrRole = self.primaryRole ?? "x"
      const primaryIsBottom = primaryAttrRole === "x"
      const extraPrimaryRole = primaryIsBottom ? "topSplit" : "rightSplit"
      const extraPrimaryAttrID = self.attributeID(extraPrimaryRole) ?? ""
      const extraSecondaryRole = primaryIsBottom ? "rightSplit" : "topSplit"
      const extraSecondaryAttrID = self.attributeID(extraSecondaryRole) ?? ""
      const category = self.dataset?.getStrValue(anID, self.secondaryAttributeID) ?? kMain
      const extraCategory = self.dataset?.getStrValue(anID, extraSecondaryAttrID) ?? kMain
      const extraPrimaryCategory = self.dataset?.getStrValue(anID, extraPrimaryAttrID) ?? kMain
      const key: Record<string, string> = {}
      self.secondaryAttributeID && (key[self.secondaryAttributeID] = category)
      extraSecondaryAttrID && (key[extraSecondaryAttrID] = extraCategory)
      extraPrimaryAttrID && (key[extraPrimaryAttrID] = extraPrimaryCategory)
      return key
    },
    subPlotCases: cachedFnWithArgsFactory({
      key: (cellKey: Record<string, string>) => JSON.stringify(cellKey),
      calculate: (cellKey: Record<string, string>) => {
        // Find attributes with value 'other' and add them to the list of attributes to filter by
        const copyOfCellKey = {...cellKey}
        const attributeIDsWithValueOther:string[] = []
        Object.keys(copyOfCellKey).forEach(attrID => {
          if (copyOfCellKey[attrID] === kOther) {
            attributeIDsWithValueOther.push(attrID)
          }
        })
        // Trim down cellKey to only include attributes with values other than 'other'
        attributeIDsWithValueOther.forEach(attrID => {
          delete copyOfCellKey[attrID]
        })
        // Find cases that are not affected by the 'other' attributes
        let targetCases = self.allPlottedCases().filter((caseId) => {
          const itemData = self.dataset?.getFirstItemForCase(caseId, { numeric: false })
          const caseData = itemData || { __id__: caseId }
          return self.isCaseInSubPlot(copyOfCellKey, caseData)
        })
        // Winnow targetCases to include only those that belong to all the 'other' attributes
        attributeIDsWithValueOther.forEach(attrID => {
          const roleForThisOtherAttr = self.roleForAttributeWithCategoryLimit(attrID)
          if (roleForThisOtherAttr) {
            targetCases = targetCases.filter((caseId) => {
              return self.categoricalValueForCaseInRole(caseId, roleForThisOtherAttr) === kOther
            })
          }
        })
        return targetCases
      },
      name: "subPlotCases"
    }),
    subPlotKeyFromExtraCategories(extraPrimaryCategory: string, extraSecondaryCategory: string) {
      const primaryAttrRole = self.primaryRole ?? "x"
      const primaryIsBottom = primaryAttrRole === "x"
      const extraPrimaryRole = primaryIsBottom ? "topSplit" : "rightSplit"
      const extraPrimaryAttrID = self.attributeID(extraPrimaryRole) ?? ""
      const extraSecondaryRole = primaryIsBottom ? "rightSplit" : "topSplit"
      const extraSecondaryAttrID = self.attributeID(extraSecondaryRole) ?? ""
      const key: Record<string, string> = {}
      extraSecondaryAttrID && (key[extraSecondaryAttrID] = extraSecondaryCategory)
      extraPrimaryAttrID && (key[extraPrimaryAttrID] = extraPrimaryCategory)
      return key
    },
    graphCellKeyFromCaseID(caseID: string) {
      const subPlotKey = this.subPlotKey(caseID)
      const primaryAttributeID = self.primaryAttributeID
      const primaryIsCategorical = isCategoricalAttributeType(self.primaryAttributeType)
      if (primaryIsCategorical) {
        const primaryCategory = self.dataset?.getStrValue(caseID, primaryAttributeID) ?? kMain
        return {
          ...subPlotKey,
          [primaryAttributeID]: primaryCategory
        }
      }
      else {
        return subPlotKey
      }
    },
    numCasesInSubPlotGivenCategories(extraPrimaryCategory: string, extraSecondaryCategory: string) {
      return this.subPlotCases(this.subPlotKeyFromExtraCategories(extraPrimaryCategory, extraSecondaryCategory)).length
    },
    numPrimaryCategoryCases(caseID: string) {
      // Determine the sub-plot to which this case belongs and return the number of cases within that sub-plot
      // that belong to the case's primary category
      const extraPrimaryAttrRole = self.primaryRole === "x" ? "topSplit" : "rightSplit",
        extraSecondaryAttrRole = self.primaryRole === "x" ? "rightSplit" : "topSplit",
        cellMap = self.cellMap(extraPrimaryAttrRole, extraSecondaryAttrRole),
        cellSpec = self.categorySpecForCase(caseID, extraPrimaryAttrRole, extraSecondaryAttrRole)
      return cellMap[cellSpec.extraPrimary]?.[cellSpec.extraSecondary]?.[cellSpec.primary]?.[cellSpec.secondary] ?? 0
    },
    cellCases: cachedFnWithArgsFactory({
      key: (cellKey: Record<string, string>) => JSON.stringify(cellKey),
      calculate: (cellKey: Record<string, string>) => {
        const rightAttrID = self.attributeID("rightSplit")
        const rightValue = rightAttrID ? cellKey[rightAttrID] : ""
        const topAttrID = self.attributeID("topSplit")
        const topAttrType = self.attributeType("topSplit")
        const topValue = topAttrID ? cellKey[topAttrID] : ""

        return self.allPlottedCases().filter(caseId => {
          const caseData = self.dataset?.getFirstItemForCase(caseId, { numeric: false })
          if (!caseData) return false
          const isRightMatch = !rightAttrID || rightValue === caseData[rightAttrID]
          const isTopMatch = !topAttrID || topAttrType !== "categorical" ||
            (topAttrType === "categorical" && topValue === caseData[topAttrID])

          return isRightMatch && isTopMatch
        })
      },
      name: "cellCases"
    }),
    rowCases: cachedFnWithArgsFactory({
      key: (cellKey: Record<string, string>) => JSON.stringify(cellKey),
      calculate: (cellKey: Record<string, string>) => {
        const leftAttrID = self.attributeID("y")
        const leftAttrType = self.attributeType("y")
        const leftValue = leftAttrID ? cellKey[leftAttrID] : ""
        const rightAttrID = self.attributeID("rightSplit")
        const rightValue = rightAttrID ? cellKey[rightAttrID] : ""
        const topAttrID = self.attributeID("topSplit")
        const topValue = topAttrID ? cellKey[topAttrID] : ""

        return self.allPlottedCases().filter(caseId => {
          const caseData = self.dataset?.getFirstItemForCase(caseId, { numeric: false })
          if (!caseData) return false

          const isLeftMatch = !leftAttrID || leftAttrType !== "categorical" ||
            (leftAttrType === "categorical" && leftValue === caseData[leftAttrID])
          const isRightMatch = !rightAttrID || rightValue === caseData[rightAttrID]
          const isTopMatch = !topAttrID || topValue === caseData[topAttrID]

          return isLeftMatch && isRightMatch && isTopMatch
        })
      },
      name: "rowCases"
    }),
    columnCases: cachedFnWithArgsFactory({
      key: (cellKey: Record<string, string>) => JSON.stringify(cellKey),
      calculate: (cellKey: Record<string, string>) => {
        const bottomAttrID = self.attributeID("x")
        const bottomAttrType = self.attributeType("x")
        const bottomValue = bottomAttrID ? cellKey[bottomAttrID] : ""
        const topAttrID = self.attributeID("topSplit")
        const topValue = topAttrID ? cellKey[topAttrID] : ""
        const rightAttrID = self.attributeID("rightSplit")
        const rightValue = rightAttrID ? cellKey[rightAttrID] : ""

        return self.allPlottedCases().filter(caseId => {
          const caseData = self.dataset?.getFirstItemForCase(caseId, { numeric: false })
          if (!caseData) return false

          const isBottomMatch = !bottomAttrID || bottomAttrType !== "categorical" ||
            (bottomAttrType === "categorical" && bottomValue === caseData[bottomAttrID])
          const isTopMatch = !topAttrID || topValue === caseData[topAttrID]
          const isRightMatch = !rightAttrID || rightValue === caseData[rightAttrID]

          return isBottomMatch && isTopMatch && isRightMatch
        })
      },
      name: "columnCases"
    }),
    filterCasesForDisplay(caseIds: string[] = []) {
      return self.showMeasuresForSelection ? caseIds.filter(caseId => self.dataset?.isCaseSelected(caseId)) : caseIds
    }
  }))
  .actions(self => {
    const baseSetNumberOfCategoriesLimitForRole = self.setNumberOfCategoriesLimitForRole
    return {
      setNumberOfCategoriesLimitForRole(role: AttrRole, limit: number) {
        if (self.numberOfCategoriesLimitByRole.get(role) !== limit) {
          self.subPlotCases.invalidateAll()
          self.cellMap.invalidateAll()
          baseSetNumberOfCategoriesLimitForRole.call(self, role, limit)
          self.categoryArrayForAttrRole.invalidate(role)
          self.categoryArrayForAttrRole.invalidate(role, [])
        }
      }
    }
  })
  .views(self => ({
    get caseDataWithSubPlot() {
      const allCaseData: CaseDataWithSubPlot[] = self.joinedCaseDataArrays
      const caseIDToSubPlot: Record<string, number> = {}
      self.getAllCellKeys().forEach((cellKey, cellIndex) => {
        self.subPlotCases(cellKey).forEach(caseID => {
          caseIDToSubPlot[caseID] = cellIndex
        })
      })
      allCaseData.forEach((caseData) => {
        caseData.subPlotNum = caseIDToSubPlot[caseData.caseID]
      })
      return allCaseData
    }
  }))
  .views(self => ({
    casesInRange(min: number, max: number, attrId: string, cellKey: Record<string, string>, inclusiveMax = true) {
      return self.subPlotCases(cellKey)?.filter(caseId => {
        const caseValue = self.dataset?.getNumeric(caseId, attrId)
        if (!isFiniteNumber(caseValue)) return false
        const isWithinRange = caseValue >= min && (inclusiveMax ? caseValue <= max : caseValue < max)
        if (isWithinRange) {
          return caseId
        }
      })
    }
  }))
  .views(self => (
    {
      /**
       * Called to determine whether the categories on an axis should be centered.
       * If the attribute is playing a primary role, then it should be centered.
       * If it is a secondary role, then it should not be centered.
       * 'top' and 'rightCat' are always centered.
       */
      categoriesForAxisShouldBeCentered(place: AxisPlace) {
        const role = graphPlaceToAttrRole[place]
        return role !== self.secondaryRole
      },
      placeCanAcceptAttributeIDDrop(
        place: GraphPlace, dataSet?: IDataSet, idToDrop?: string, options?: ILegalAttributeOptions
      ) {
        const role = graphPlaceToAttrRole[place],
          xType = self.attributeType('x') || '',
          xIsNumericOrDate = ['date', 'numeric'].includes(xType),
          existingID = self.attributeID(role),
          differentAttribute = options?.allowSameAttr || existingID !== idToDrop
        // only drops on left/bottom axes can change data set
        if (dataSet?.id !== self.dataset?.id && !['left', 'bottom'].includes(place)) {
          return false
        }

        if (!idToDrop) return false

        const typeToDropIsNumeric = dataSet?.attrFromID(idToDrop)?.type === "numeric"
        if (place === 'yPlus') {
          return xIsNumericOrDate && typeToDropIsNumeric && !self.yAttributeIDs.includes(idToDrop)
        } else if (place === 'rightNumeric') {
          return xIsNumericOrDate && typeToDropIsNumeric && differentAttribute
        } else if (['top', 'rightCat'].includes(place)) {
          return !typeToDropIsNumeric && differentAttribute
        } else {
          return differentAttribute
        }
      }
    }))
  .extend(self => {
    const superClearAttributes = self.clearAttributes

    return {
      actions: {
        clearAttributes() {
          superClearAttributes()
          self._yAttributeDescriptions.clear()
        }
      }
    }
  })
  .actions(self => ({
    setPrimaryRole(role?: GraphAttrRole) {
      if (role === 'x' || role === 'y') {
        if (role !== self.primaryRole) {
          self.primaryRole = role
          self.clearCasesCache()
        }
      }
      else {
        self.primaryRole = undefined
      }
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
      self.numericValuesForAttrRole.invalidate(role)  // No harm in invalidating even if not numeric
      self.cellMap.invalidateAll()
    },
    addYAttribute(desc: IAttributeDescriptionSnapshot, index?: number) {
      if (index != null && index >= 0) {
        self._yAttributeDescriptions.splice(index, 0, desc)
      } else {
        self._yAttributeDescriptions.push(desc)
      }
    },
    setY2Attribute(desc?: IAttributeDescriptionSnapshot) {
      self._setAttributeDescription('rightNumeric', desc)
      if (!desc?.attributeID) {
        self.setPointsNeedUpdating(true)
      } else {
        const existingFilteredCases = self.filteredCases?.[self.numberOfPlots - 1]
        existingFilteredCases?.invalidateCases()
      }
    },
    removeYAttributeAtIndex(index: number) {
      if (index >= 0) {
        self._yAttributeDescriptions.splice(index, 1)
        // remove and destroy the filtered cases for the y attribute
        self.filteredCases?.splice(index, 1)
          .forEach(aFilteredCases => aFilteredCases.destroy())
        self.filteredCases?.forEach((aFilteredCases, casesArrayNumber) => {
          aFilteredCases.setCasesArrayNumber(casesArrayNumber)
        })
        self.setPointsNeedUpdating(true)
      }
    },
    setAttributeType(role: GraphAttrRole, type: AttributeType, plotNumber = 0) {
      if (role === 'y') {
        self._yAttributeDescriptions[plotNumber]?.setType(type)
      } else {
        self._attributeDescriptions.get(role)?.setType(type)
      }
      self._setAttributeType(type, plotNumber)
    }
  }))
  .actions(self => ({
    replaceYAttribute(desc?: IAttributeDescriptionSnapshot, plotNumber = 0) {
      if (self._yAttributeDescriptions[plotNumber]) self.removeYAttributeAtIndex(plotNumber)
      if (desc) self.addYAttribute(desc, plotNumber)
    },
    replaceYAttributes(descriptions: IAttributeDescriptionSnapshot[]) {
      self._yAttributeDescriptions.clear()
      descriptions.forEach(description => {
        self.addYAttribute(description)
      })
    },
    removeYAttributeWithID(id: string) {
      const index = self._yAttributeDescriptions.findIndex((aDesc) => aDesc.attributeID === id)
      self.removeYAttributeAtIndex(index)
    },
    clearGraphSpecificCasesCache() {
      self.allPlottedCases.invalidate()
      self.subPlotCases.invalidateAll()
      self.rowCases.invalidateAll()
      self.columnCases.invalidateAll()
      self.cellCases.invalidateAll()
      self.cellMap.invalidateAll()
    },
    handleDataSetChange(data?: IDataSet) {
      self.actionHandlerDisposer?.()
      self.actionHandlerDisposer = undefined
      self._clearFilteredCases(data)
      self.synchronizeFilteredCases()
    }
  }))
  .actions(self => {
    const baseClearCasesCache = self.clearCasesCache
    return {
      clearCasesCache() {
        baseClearCasesCache()
        self.clearGraphSpecificCasesCache()
      }
    }
  })
  .actions(self => {
    const baseAfterCreate = self.afterCreate
    const baseRemoveAttributeFromRole = self.removeAttributeFromRole
    return {
      afterCreate() {
        // clear caches when primary role changes, since many caches are role-dependent
        addDisposer(self, reaction(
          () => self.primaryRole,
          () => self.clearCasesCache(),
          { name: "GraphDataConfigurationModel primaryRole reaction" }
        ))
        // synchronize filteredCases with attribute configuration
        addDisposer(self, reaction(
          () => self.allYAttributeDescriptions,
          (allYAttributeDescriptions) => self.synchronizeFilteredCases(allYAttributeDescriptions),
          { name: "GraphDataConfigurationModel yAttrDescriptions reaction", equals: comparer.structural }
        ))
        addDisposer(self, reaction(
          () => self.categoricalAttrsWithChangeCounts,
          () => self.clearCasesCache(),
          { name: "GraphDataConfigurationModel getCellKeys reaction", equals: comparer.structural }
        ))
        baseAfterCreate()
      },
      removeAttributeFromRole(role: GraphAttrRole, attrID: string) {
        if (role === "yPlus") {
          self.removeYAttributeWithID(attrID)
        }
        else {
          baseRemoveAttributeFromRole(role, attrID)
        }
      }
    }
  })

export interface IGraphDataConfigurationModel extends Instance<typeof GraphDataConfigurationModel> {
}

export interface IGraphDataConfigurationModelSnapshot extends SnapshotIn<typeof GraphDataConfigurationModel> {
}

export function isGraphDataConfigurationModel(model?: IDataConfigurationModel): model is IGraphDataConfigurationModel {
  return model?.type === kGraphDataConfigurationType
}
