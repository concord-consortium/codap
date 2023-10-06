import {scaleQuantile, ScaleQuantile, schemeBlues} from "d3"
import {getSnapshot, Instance, ISerializedActionCall, SnapshotIn, types} from "mobx-state-tree"
import {AttributeType, attributeTypes} from "../../../models/data/attribute"
import {DataSet, IDataSet} from "../../../models/data/data-set"
import {ICase} from "../../../models/data/data-set-types"
import {idOfChildmostCollectionForAttributes} from "../../../models/data/data-set-utils"
import {ISharedCaseMetadata, SharedCaseMetadata} from "../../../models/shared/shared-case-metadata"
import {isSetCaseValuesAction} from "../../../models/data/data-set-actions"
import {FilteredCases, IFilteredChangedCases} from "../../../models/data/filtered-cases"
import {typedId, uniqueId} from "../../../utilities/js-utils"
import {missingColor} from "../../../utilities/color-utils"
import {onAnyAction} from "../../../utilities/mst-utils"
import {CaseData} from "../d3-types"
import {GraphAttrRole, graphPlaceToAttrRole, PrimaryAttrRoles, TipAttrRoles} from "../../graph/graphing-types"
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
    dataset: types.safeReference(DataSet),
    metadata: types.safeReference(SharedCaseMetadata),
  })
  .volatile(() => ({
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

      const defaultCaptionAttributeID = () => {
        // We find the childmost collection and return the first attribute in that collection. If there is no
        // childmost collection, we return the first attribute in the dataset.
        const attrIDs = ['x', 'y', 'rightNumeric', 'topSplit', 'rightSplit', 'legend']
            .map(
              aRole => this.attributeID(aRole as GraphAttrRole)
            )
            .filter(id => !!id) as string[],
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
        attrID = defaultCaptionAttributeID()
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
      if (!self.dataset || !self.filteredCases?.[0]) return []
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
      categorySetForAttrRole(role: GraphAttrRole) {
        if (self.metadata) {
          const attributeID = self.attributeID(role) || ''
          return self.metadata.getCategorySet(attributeID)
        }
      },
      /**
       * Todo: This method is inefficient since it has to go through all the cases in the graph to determine
       * which categories are present. It should be replaced by some sort of functionality that allows
       * caching of the categories that have been determined to be valid.
       * @param role
       */
      categoryArrayForAttrRole(role: GraphAttrRole, emptyCategoryArray = ['__main__']): string[] {
        let categoryArray: string[] = []
        if (self.metadata) {
          const attributeID = self.attributeID(role) || '',
            categorySet = self.metadata.getCategorySet(attributeID),
            validValues: Set<string> = new Set(this.valuesForAttrRole(role))
          categoryArray = (categorySet?.values || emptyCategoryArray)
            .filter((aValue: string) => validValues.has(aValue))
        }
        if (categoryArray.length === 0) {
          categoryArray = emptyCategoryArray
        }
        return categoryArray
      },
      numRepetitionsForPlace(place: GraphPlace) {
        // numRepetitions is the number of times an axis is repeated in the graph
        let numRepetitions = 1
        switch (place) {
          case 'left':
            numRepetitions = Math.max(this.categoryArrayForAttrRole('rightSplit').length, 1)
            break
          case 'bottom':
            numRepetitions = Math.max(this.categoryArrayForAttrRole('topSplit').length, 1)
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
      const isSubplotMatch = (!topAttrID || (topAttrID && cellKey[topAttrID] === caseData[topAttrID])) &&
        (!rightAttrID || (rightAttrID && cellKey[rightAttrID] === caseData[rightAttrID]))

      return isSubplotMatch
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
        }
        else {
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
      getLegendColorForCase(id: string): string {
        const legendID = self.attributeID('legend'),
          legendType = self.attributeType('legend'),
          legendValue = id && legendID ? self.dataset?.getStrValue(id, legendID) : null
        return legendValue == null ? ''
          : legendType === 'categorical' ? self.getLegendColorForCategory(legendValue)
            : legendType === 'numeric' ? self.getLegendColorForNumericValue(Number(legendValue))
              : ''
      },
      categorySetForPlace(place: AxisPlace) {
        if (self.metadata) {
          const role = graphPlaceToAttrRole[place]
          return self.metadata.getCategorySet(self.attributeID(role) ?? '')
        }
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
      if (actionCall.name === "invalidateCollectionGroups") {
        this._updateFilteredCasesCollectionID()
        this._invalidateCases()
      }
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
    },
    _updateFilteredCasesCollectionID() {
      const childmostCollectionID = idOfChildmostCollectionForAttributes(self.attributes, self.dataset)
      self.filteredCases?.forEach((aFilteredCases) => {
        aFilteredCases.setCollectionID(childmostCollectionID)
      })
    },
    _invalidateCases() {
      self.filteredCases?.forEach((aFilteredCases) => {
        aFilteredCases.invalidateCases()
      })
    },
    _addNewFilteredCases() {
      if (self.dataset) {
        this._updateFilteredCasesCollectionID()
        self.filteredCases?.push(new FilteredCases({
          source: self.dataset,
          casesArrayNumber: self.filteredCases.length,
          filter: self.filterCase,
          collectionID: idOfChildmostCollectionForAttributes(self.attributes, self.dataset),
          onSetCaseValues: this.handleSetCaseValues
        }))
        self.setPointsNeedUpdating(true)
      }
    }
  }))
  .actions(self => ({
    setDataset(dataset: IDataSet | undefined, metadata: ISharedCaseMetadata | undefined) {
      self.actionHandlerDisposer?.()
      self.actionHandlerDisposer = undefined
      self.dataset = dataset
      self.metadata = metadata
      self.filteredCases = []
      if (dataset) {
        self.actionHandlerDisposer = onAnyAction(self.dataset, self.handleAction)
        self.filteredCases[0] = new FilteredCases({
          source: dataset,
          filter: self.filterCase,
          collectionID: idOfChildmostCollectionForAttributes(self.attributes, dataset),
          onSetCaseValues: self.handleSetCaseValues
        })
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
      self._updateFilteredCasesCollectionID()
      if (role === 'legend') {
        self.invalidateQuantileScale()
      }
    },
    addYAttribute(desc: IAttributeDescriptionSnapshot) {
      // multiple Y only supported for numeric axes
      self._yAttributeDescriptions.push({ ...desc, type: 'numeric' })
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
        self._updateFilteredCasesCollectionID()
        self.setPointsNeedUpdating(true)
      }
    },
    setAttributeType(role: GraphAttrRole, type: AttributeType, plotNumber = 0) {
      if (role === 'y') {
        self._yAttributeDescriptions[plotNumber]?.setType(type)
      } else {
        self._attributeDescriptions.get(role)?.setType(type)
      }
      self._invalidateCases()
    }
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
  .actions(self => ({
    /**
     * This is called when the user swaps categories in the legend, but not when the user swaps categories
     * by dragging categories on an axis.
     * @param role
     */
    storeAllCurrentColorsForAttrRole(role: GraphAttrRole) {
      const categorySet = self.categorySetForAttrRole(role)
      if (categorySet) {
        categorySet.storeAllCurrentColors()
      }
    },
    swapCategoriesForAttrRole(role: GraphAttrRole, catIndex1: number, catIndex2: number) {
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
