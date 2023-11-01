import {getSnapshot, Instance, SnapshotIn, types} from "mobx-state-tree"
import {AttributeType} from "../../../models/data/attribute"
import {IDataSet} from "../../../models/data/data-set"
import {ICase} from "../../../models/data/data-set-types"
import {ISharedCaseMetadata} from "../../../models/shared/shared-case-metadata"
import {typedId} from "../../../utilities/js-utils"
import {graphPlaceToAttrRole} from "../graphing-types"
import {AxisPlace} from "../../axis/axis-types"
import {GraphPlace} from "../../axis-graph-shared"
import {AttributeDescription, DataConfigurationModel, IAttributeDescriptionSnapshot, IDataConfigurationModel}
  from "../../data-display/models/data-configuration-model"
import {GraphAttrRole, PrimaryAttrRoles} from "../../data-display/data-display-types"

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
    },
    isCaseInSubPlot(subPlotKey: Record<string, string>, caseData: Record<string, any>) {
      const numOfKeys = Object.keys(subPlotKey).length
      let matchedValCount = 0
      Object.keys(subPlotKey).forEach(key => {
        if (subPlotKey[key] === caseData[key]) matchedValCount++
      })
      return matchedValCount === numOfKeys
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
    subPlotCases(subPlotKey: Record<string, string>) {
      const casesInPlot = [] as ICase[]
      self.filteredCases?.forEach(aFilteredCases => {
        aFilteredCases.caseIds.forEach((id) => {
          const caseData = self.dataset?.getCase(id)
          if (caseData) {
            self.isCaseInSubPlot(subPlotKey, caseData) && casesInPlot.push(caseData)
          }
        })
      })
      return casesInPlot
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
    isCaseInSubplot(cellKey: Record<string, string>, caseData: Record<string, any>) {
      // Subplots are determined by categorical attributes on the top or right. When there is more than one subplot,
      // a case is included if its value(s) for those attribute(s) match the keys for the subplot being considered.
      if (self.hasSingleSubplot) return true

      const topAttrID = self.attributeID("topSplit")
      const rightAttrID = self.attributeID("rightSplit")
      return (!topAttrID || (topAttrID && cellKey[topAttrID] === caseData[topAttrID])) &&
        (!rightAttrID || (rightAttrID && cellKey[rightAttrID] === caseData[rightAttrID]))
    },
    isCaseInCell(cellKey: Record<string, string>, caseData: Record<string, any>) {
      const numOfKeys = Object.keys(cellKey).length
      let matchedValCount = 0
      Object.keys(cellKey).forEach(key => {
        if (cellKey[key] === caseData[key]) matchedValCount++
      })
      return matchedValCount === numOfKeys
    }
  }))
  .views(self => ({
    subPlotCases(cellKey: Record<string, string>) {
      const casesInPlot: ICase[] = []
      self.filteredCases?.forEach(aFilteredCases => {
        aFilteredCases.caseIds.forEach((id) => {
          const caseData = self.dataset?.getCase(id)
          const caseAlreadyMatched = casesInPlot.find(aCase => aCase.__id__ === id)
          if (caseData && !caseAlreadyMatched) {
            self.isCaseInCell(cellKey, caseData) && casesInPlot.push(caseData)
          }
        })
      })
      return casesInPlot
    },
    rowCases(cellKey: Record<string, string>) {
      const casesInRow: ICase[] = []
      const leftAttrID = self.attributeID("y")
      const leftAttrType = self.attributeType("y")
      const leftValue = leftAttrID ? cellKey[leftAttrID] : ""
      const rightAttrID = self.attributeID("rightSplit")
      const rightValue = rightAttrID ? cellKey[rightAttrID] : ""

      self.filteredCases?.forEach(aFilteredCases => {
        aFilteredCases.caseIds.forEach(id => {
          const caseData = self.dataset?.getCase(id)
          if (!caseData) return

          const isLeftMatch = !leftAttrID || leftAttrType !== "categorical" ||
            (leftAttrType === "categorical" && leftValue === caseData[leftAttrID])
          const isRightMatch = !rightAttrID || rightValue === caseData[rightAttrID]

          if (isLeftMatch && isRightMatch) {
            casesInRow.push(caseData)
          }
        })
      })
      return casesInRow
    },
    columnCases(cellKey: Record<string, string>) {
      const casesInCol: ICase[] = []
      const bottomAttrID = self.attributeID("x")
      const bottomAttrType = self.attributeType("x")
      const bottomValue = bottomAttrID ? cellKey[bottomAttrID] : ""
      const topAttrID = self.attributeID("topSplit")
      const topValue = topAttrID ? cellKey[topAttrID] : ""

      self.filteredCases?.forEach(aFilteredCases => {
        aFilteredCases.caseIds.forEach(id => {
          const caseData = self.dataset?.getCase(id)
          if (!caseData) return

          const isBottomMatch = !bottomAttrID || bottomAttrType !== "categorical" ||
            (bottomAttrType === "categorical" && bottomValue === caseData[bottomAttrID])
          const isTopMatch = !topAttrID || topValue === caseData[topAttrID]

          if (isBottomMatch && isTopMatch) {
            casesInCol.push(caseData)
          }
        })
      })
      return casesInCol
    },
    cellCases(cellKey: Record<string, string>) {
      const casesInCell: ICase[] = []

      self.filteredCases?.forEach(aFilteredCases => {
        aFilteredCases.caseIds.forEach(id => {
          const caseData = self.dataset?.getCase(id)
          if (!caseData) return

          if (self.isCaseInSubplot(cellKey, caseData)) {
            casesInCell.push(caseData)
          }
        })
      })
      return casesInCell
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
    setDataset(dataset: IDataSet | undefined, metadata: ISharedCaseMetadata | undefined) {
      self._setDataset(dataset, metadata)
      if (dataset && self.filteredCases) {
        // make sure there are enough filteredCases to hold all the y attributes
        while (self.filteredCases.length < self._yAttributeDescriptions.length) {
          self._addNewFilteredCases()
        }
        // A y2 attribute is optional, so only add a new filteredCases if there is one.
        if (self.hasY2Attribute) {
          self._addNewFilteredCases()
        }
      }
      self.invalidateQuantileScale()
    },
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
  .actions(self => {
    const baseRemoveAttributeFromRole = self.removeAttributeFromRole
    return {
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

export function isGraphDataConfigurationModel(model: IDataConfigurationModel): model is IGraphDataConfigurationModel {
  return model.type === kGraphDataConfigurationType
}
