import { appState } from "../models/app-state"
import { IAttribute } from "../models/data/attribute"
import { isCollectionModel } from "../models/data/collection"
import { GlobalValueManager } from "../models/global/global-value-manager"
import { getSharedDataSets } from "../models/shared/shared-data-utils"
import { ITileModel } from "../models/tiles/tile-model"
import { toV3CaseId, toV3GlobalId, toV3ItemId } from "../utilities/codap-utils"
import { ActionName, DIResources, DIResourceSelector, DIParsedOperand } from "./data-interactive-types"
import { getAttribute, getCollection } from "./data-interactive-utils"
import { findTileFromV2Id, parseSearchQuery } from "./resource-parser-utils"

/**
 * A resource selector identifies a CODAP resource. It is either a group
 * resource or an individual resource. This routine parses a resource
 * selector into its component parts and builds an equivalent object.
 *
 *   * Base resources: [interactiveFrame, logMessage]
 *   * Doc resources: [dataContext, component, global]
 *   * DataContext resources: [collection, attributes]
 *   * Collection resources: [case]
 *
 *   Some examples of resource selectors:
 *    * "dataContext[DataCard]", or
 *    * "dataContext[DataCard2].collection[Measurements].attribute"
 *
 *   These would parse to objects, respectively:
 *    * {dataContext: 'DataCard', type: 'dataContext'}
 *    * {dataContext: 'DataCard2', collection: 'Measurements', attribute: null, type: 'attribute'}
 *
 * @param iResource {string}
 * @returns {{}}
 */
export function parseResourceSelector(iResource: string) {
  // selects phrases like 'aaaa[bbbb]' or 'aaaa' in a larger context
  // var selectorRE = /(([\w]+)(?:\[\s*([#\w][^\]]*)\s*\])?)/g;
  const selectorRE = /(([\w]+)(?:\[\s*([^\]]+)\s*])?)/g
  // selects complete strings matching the pattern 'aaaa[bbbb]' or 'aaaa'
  // var clauseRE =   /^([\w]+)(?:\[\s*([^\]][^\]]*)\s*\])?$/;
  const clauseRE =   /^([\w]+)(?:\[\s*([^\]]+)\s*])?$/
  const result: DIResourceSelector = {}
  const selectors = iResource.match(selectorRE)
  selectors?.forEach(selector => {
    const match = clauseRE.exec(selector)
    const resourceType = match?.[1] as keyof DIResourceSelector | undefined
    const resourceName = match?.[2]
    if (resourceType) {
      result[resourceType] = resourceName
      result.type = resourceType
    }
  })

  return result
}

/**
 *
 * @param {DIResourceSelector} resourceSelector  ResourceSelector returned by parseResourceSelector
 * @param {string} action                        Action name: get, create, update, delete, notify
 * @param {ITileModel} interactiveFrame          Model of web view tile communicating with plugin
 * @returns {{interactiveFrame: DG.DataInteractivePhoneHandler}}
 */
export function resolveResources(
  _resourceSelector: DIResourceSelector | string, action: ActionName, interactiveFrame: ITileModel
) {
  const resourceSelector = typeof _resourceSelector === "string"
    ? parseResourceSelector(_resourceSelector) : _resourceSelector
  const document = appState.document
  function resolveContext(selector?: string) {
    if (!selector) {
      return
    }
    const dataSets = getSharedDataSets(document).map(sharedDataSet => sharedDataSet.dataSet)
    if (selector === '#default') {
      return dataSets[0]
    }
    return dataSets.find(dataSet => dataSet.matchNameOrId(selector))
  }

  const result: DIResources = { interactiveFrame }

  if (!resourceSelector.type || [
    'component', 'componentList', 'dataContextList', 'document', 'formulaEngine', 'global', 'globalList',
    'interactiveFrame', 'logMessage', 'logMessageMonitor', 'undoableActionPerformed', 'undoChangeNotice'
  ].indexOf(resourceSelector.type) < 0) {
    // if no data context provided, and we are not creating one, the
    // default data context is implied
    if (!resourceSelector.dataContext) {
      if (action !== 'create' ||
          (resourceSelector.type !== 'dataContext' &&
          resourceSelector.type !== 'dataContextFromURL')) {
        resourceSelector.dataContext = '#default'
      }
      // set a flag in the result, so we can recognize this context as special.
      result.isDefaultDataContext = true
    }
    result.dataContext = resolveContext(resourceSelector.dataContext)
  }

  const dataContext = result.dataContext

  if (resourceSelector.component) {
    // TODO Get tile by name?
    const { component } = resourceSelector
    result.component = findTileFromV2Id(component)
  }

  if (resourceSelector.global) {
    const globalManager = document.content?.getFirstSharedModelByType(GlobalValueManager)
    result.global = globalManager?.getValueByName(resourceSelector.global) ||
      globalManager?.getValueById(toV3GlobalId(resourceSelector.global))
  }

  if ("dataContextList" in resourceSelector) {
    result.dataContextList =
      getSharedDataSets(document).map(sharedDataSet => sharedDataSet.dataSet)
  }

  if ("collectionList" in resourceSelector) {
    if (dataContext) {
      result.collectionList = [...dataContext.collections]
    }
  }

  if (resourceSelector.collection) {
    result.collection = getCollection(dataContext, resourceSelector.collection)
  }

  const collection = result.collection
  const collectionModel = isCollectionModel(collection) ? collection : undefined

  if (resourceSelector.attribute || resourceSelector.attributeLocation) {
    const attrKey = resourceSelector.attribute ? 'attribute' : 'attributeLocation'
    const attrNameOrId = resourceSelector[attrKey] ?? ""
    result[attrKey] = getAttribute(attrNameOrId, dataContext, collectionModel)
  }

  if ("attributeList" in resourceSelector) {
    const attributeList: IAttribute[] = []
    const attributes = collectionModel?.attributes ?? []
    attributes.forEach(attribute => {
      if (attribute) attributeList.push(attribute)
    })
    result.attributeList = attributeList
  }

  const getCaseById = (caseId: string) =>
    dataContext?.caseInfoMap.get(caseId)?.groupedCase

  if (resourceSelector.caseByID) {
    const caseId = toV3CaseId(resourceSelector.caseByID)
    result.caseByID = getCaseById(caseId)
  }

  if (resourceSelector.caseByIndex && collection) {
    const index = Number(resourceSelector.caseByIndex)
    if (!isNaN(index)) {
      const caseId = dataContext?.getCasesForCollection(collection.id)[index]?.__id__
      if (caseId) {
        result.caseByIndex = getCaseById(caseId)
      }
    }
  }

  const getOperandValue = (itemIndex?: number, operand?: DIParsedOperand) => {
    if (operand?.attr && itemIndex != null) return operand.attr.value(itemIndex)

    return operand?.value
  }

  if (resourceSelector.caseSearch && collection && dataContext) {
    const { func, left, right, valid } = parseSearchQuery(resourceSelector.caseSearch, collection)
    if (valid) {
      result.caseSearch = []
      dataContext.getCasesForCollection(collection.id).forEach(caseGroup => {
        const aCase = dataContext.caseInfoMap.get(caseGroup.__id__)
        const itemId = aCase?.childItemIds[0]
        const item = dataContext.getItem(itemId ?? caseGroup.__id__)
        if (item) {
          const itemIndex = dataContext.getItemIndex(item.__id__)
          if (func(getOperandValue(itemIndex, left), getOperandValue(itemIndex, right))) {
            result.caseSearch?.push(aCase?.groupedCase ?? item)
          }
        }
      })
    }
  }

  // if (resourceSelector.caseFormulaSearch) {
  //   result.caseFormulaSearch = collection && collection.searchCasesByFormula(resourceSelector.caseFormulaSearch);
  // }

  if (resourceSelector.item) {
    const index = Number(resourceSelector.item)
    if (!isNaN(index)) {
      result.item = dataContext?.getItemAtIndex(index)
    }
  }

  if (resourceSelector.itemByID) {
    const itemId = toV3ItemId(resourceSelector.itemByID)
    result.itemByID = dataContext?.getItem(itemId)
  }

  if (resourceSelector.itemSearch && dataContext) {
    const { func, left, right, valid } = parseSearchQuery(resourceSelector.itemSearch, dataContext)
    if (valid) {
      result.itemSearch = dataContext.items.filter(aCase => {
        const itemIndex = dataContext.getItemIndex(aCase.__id__)
        return func(getOperandValue(itemIndex, left), getOperandValue(itemIndex, right))
      })
    }
  }

  if (resourceSelector.itemByCaseID) {
    const caseId = toV3CaseId(resourceSelector.itemByCaseID)
    const itemId = dataContext?.caseInfoMap.get(caseId)?.childItemIds[0]
    if (itemId) result.itemByCaseID = dataContext?.getItem(itemId)
  }

  // DG.ObjectMap.forEach(resourceSelector, function (key, value) {
  //   // Make sure we got values for every non-terminal selector.
  //   if (SC.none(result[key]) && (key !== 'type') && (key !== resourceSelector.type)) {
  //     throw (new Error('Unable to resolve %@: %@'.loc(key, value)));
  //     //DG.log('Unable to resolve %@: %@'.loc(key, value));
  //   }
  // });
  return result
}
