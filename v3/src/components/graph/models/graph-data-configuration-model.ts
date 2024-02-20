import {addDisposer, getSnapshot, Instance, SnapshotIn, types} from "mobx-state-tree"
import {comparer, reaction} from "mobx"
import {AttributeType} from "../../../models/data/attribute"
import {IDataSet} from "../../../models/data/data-set"
import {typedId} from "../../../utilities/js-utils"
import {cachedFnFactory, cachedFnWithArgsFactory} from "../../../utilities/mst-utils"
import {AxisPlace} from "../../axis/axis-types"
import {GraphPlace} from "../../axis-graph-shared"
import {AttributeDescription, DataConfigurationModel, IAttributeDescriptionSnapshot, IDataConfigurationModel}
  from "../../data-display/models/data-configuration-model"
import {GraphAttrRole, graphPlaceToAttrRole, PrimaryAttrRoles} from "../../data-display/data-display-types"
import {updateCellKey} from "../adornments/adornment-utils"
import { isFiniteNumber } from "../../../utilities/math-utils"

export const kGraphDataConfigurationType = "graphDataConfigurationType"

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
  })
  .views(self => ({
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
    get attributeDescriptionsStr() {
      return JSON.stringify(this.attributeDescriptions)
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
    placeCanHaveZeroExtent(place: GraphPlace) {
      return ['rightNumeric', 'legend', 'top', 'rightCat'].includes(place) &&
        self.attributeID(graphPlaceToAttrRole[place]) === ''
    },
    placeCanShowClickHereCue(place: GraphPlace) {
      const role = graphPlaceToAttrRole[place]
      return ['left', 'bottom'].includes(place) && !self.attributeID(role)
    },
    placeAlwaysShowsClickHereCue(place: GraphPlace) {
      return this.placeCanShowClickHereCue(place) &&
        !self.attributeID(graphPlaceToAttrRole[place === 'left' ? 'bottom' : 'left'])
    },
    placeShouldShowClickHereCue(place: GraphPlace, tileHasFocus: boolean) {
      return this.placeAlwaysShowsClickHereCue(place) ||
        (this.placeCanShowClickHereCue(place) && tileHasFocus)
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
      const selection = Array.from(self.dataset.selection),
        allGraphCaseIds = self.graphCaseIDs
      return selection.filter((caseId: string) => allGraphCaseIds.has(caseId))
    }
  }))
  .views(self => (
    {
      get numericValuesForYAxis() {
        const allGraphCaseIds = Array.from(self.graphCaseIDs),
          allValues: number[] = []

        return self.yAttributeIDs.reduce((acc: number[], yAttrID: string) => {
          const values = allGraphCaseIds.map((anID: string) => Number(self.dataset?.getValue(anID, yAttrID)))
          return acc.concat(values)
        }, allValues)
      },
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
    get hasExactlyTwoPerpendicularCategoricalAttrs() {
      const attrTypes = self.attrTypes
      const xHasCategorical = attrTypes.bottom === "categorical" || attrTypes.top === "categorical"
      const yHasCategorical = attrTypes.left === "categorical" || attrTypes.right === "categorical"
      const hasOnlyTwoCategorical = this.categoricalAttrCount === 2
      return hasOnlyTwoCategorical && xHasCategorical && yHasCategorical
    },
    get hasSingleSubplot() {
      // A graph has a single subplot if it has one or fewer categorical attributes, or if it has exactly two
      // categorical attributes on axes that are perpendicular to each other.
      return this.categoricalAttrCount <= 1 || this.hasExactlyTwoPerpendicularCategoricalAttrs
    }
  }))
  .views(self => ({
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
      const yCat = yCats[index % yCatCount]
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
    isCaseInSubPlot(cellKey: Record<string, string>, caseData: Record<string, any>) {
      const numOfKeys = Object.keys(cellKey).length
      let matchedValCount = 0
      Object.keys(cellKey).forEach(key => {
        if (cellKey[key] === caseData[key]) matchedValCount++
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
      const category = self.dataset?.getStrValue(anID, self.secondaryAttributeID) ?? "__main__"
      const extraCategory = self.dataset?.getStrValue(anID, extraSecondaryAttrID) ?? "__main__"
      const extraPrimaryCategory = self.dataset?.getStrValue(anID, extraPrimaryAttrID) ?? "__main__"
      const key: Record<string, string> = {}
      self.secondaryAttributeID && (key[self.secondaryAttributeID] = category)
      extraSecondaryAttrID && (key[extraSecondaryAttrID] = extraCategory)
      extraPrimaryAttrID && (key[extraPrimaryAttrID] = extraPrimaryCategory)
      return key
    },
    subPlotCases: cachedFnWithArgsFactory({
      key: (cellKey: Record<string, string>) => JSON.stringify(cellKey),
      calculate: (cellKey: Record<string, string>) => {
        return self.allPlottedCases().filter((caseId) => {
          const caseData = self.dataset?.getCase(caseId, { numeric: false }) || { __id__: caseId }
          return self.isCaseInSubPlot(cellKey, caseData)
        })
      }
    }),
    cellCases: cachedFnWithArgsFactory({
      key: (cellKey: Record<string, string>) => JSON.stringify(cellKey),
      calculate: (cellKey: Record<string, string>) => {
        const rightAttrID = self.attributeID("rightSplit")
        const rightValue = rightAttrID ? cellKey[rightAttrID] : ""
        const topAttrID = self.attributeID("topSplit")
        const topAttrType = self.attributeType("topSplit")
        const topValue = topAttrID ? cellKey[topAttrID] : ""

        return self.allPlottedCases().filter(caseId => {
          const caseData = self.dataset?.getCase(caseId)
          if (!caseData) return false
          const isRightMatch = !rightAttrID || rightValue === caseData[rightAttrID]
          const isTopMatch = !topAttrID || topAttrType !== "categorical" ||
            (topAttrType === "categorical" && topValue === caseData[topAttrID])

          return isRightMatch && isTopMatch
        })
      }
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
          const caseData = self.dataset?.getCase(caseId)
          if (!caseData) return false

          const isLeftMatch = !leftAttrID || leftAttrType !== "categorical" ||
            (leftAttrType === "categorical" && leftValue === caseData[leftAttrID])
          const isRightMatch = !rightAttrID || rightValue === caseData[rightAttrID]
          const isTopMatch = !topAttrID || topValue === caseData[topAttrID]

          return isLeftMatch && isRightMatch && isTopMatch
        })
      }
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
          const caseData = self.dataset?.getCase(caseId)
          if (!caseData) return false

          const isBottomMatch = !bottomAttrID || bottomAttrType !== "categorical" ||
            (bottomAttrType === "categorical" && bottomValue === caseData[bottomAttrID])
          const isTopMatch = !topAttrID || topValue === caseData[topAttrID]
          const isRightMatch = !rightAttrID || rightValue === caseData[rightAttrID]

          return isBottomMatch && isTopMatch && isRightMatch
        })
      }
    })
  }))
  .views(self => ({
    casesInRange(min: number, max: number, attrId: string, cellKey: Record<string, string>) {
      return self.subPlotCases(cellKey)?.filter(caseId => {
        const caseValue = self.dataset?.getNumeric(caseId, attrId)
        if (isFiniteNumber(caseValue) && caseValue >= min && caseValue <= max) {
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
        const role = graphPlaceToAttrRole[place],
          primaryRole = self.primaryRole
        return primaryRole === role || !['left', 'bottom'].includes(place)
      },
      placeCanAcceptAttributeIDDrop(place: GraphPlace, dataSet?: IDataSet, idToDrop?: string) {
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
  .actions(self => {
    const baseHandleDataSetChange = self.handleDataSetChange
    return {
      handleDataSetChange(data?: IDataSet) {
        baseHandleDataSetChange(data)
        if (data) {
          // make sure there are enough filteredCases to hold all the y attributes
          while (self.filteredCases.length < self._yAttributeDescriptions.length) {
            self._addNewFilteredCases()
          }
          // A y2 attribute is optional, so only add a new filteredCases if there is one.
          if (self.hasY2Attribute) {
            self._addNewFilteredCases()
          }
        }
      }
    }
  })
  .actions(self => ({
    setPrimaryRole(role: GraphAttrRole) {
      if (role === 'x' || role === 'y') {
        self.primaryRole = role
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
      self._setAttribute(role, desc)
    },
    addYAttribute(desc: IAttributeDescriptionSnapshot) {
      self._yAttributeDescriptions.push(desc)
      self._addNewFilteredCases()
    },
    setY2Attribute(desc?: IAttributeDescriptionSnapshot) {
      const isNewAttribute = !self._attributeDescriptions.get('rightNumeric'),
        isEmpty = !desc?.attributeID
      self._setAttributeDescription('rightNumeric', desc)
      if (isNewAttribute) {
        self._addNewFilteredCases()
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
      self._setAttributeType(role, type, plotNumber)
    },
  }))
  .actions(self => ({
    clearGraphSpecificCasesCache() {
      self.allPlottedCases.invalidate()
      self.subPlotCases.invalidateAll()
      self.rowCases.invalidateAll()
      self.columnCases.invalidateAll()
      self.cellCases.invalidateAll()
    }
  }))
  .actions(self => {
    const baseClearCasesCache = self.clearCasesCache
    return {
      clearCasesCache() {
        self.clearGraphSpecificCasesCache()
        baseClearCasesCache()
      }
    }
  })
  .actions(self => {
    const baseAfterCreate = self.afterCreate
    const baseRemoveAttributeFromRole = self.removeAttributeFromRole
    return {
      afterCreate() {
        addDisposer(self, reaction(
          () => self.getAllCellKeys(),
          () => self.clearGraphSpecificCasesCache(),
          {
            name: "GraphDataConfigurationModel.afterCreate.reaction [getAllCellKeys]",
            equals: comparer.structural
          }
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
