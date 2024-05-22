import { appState } from "../models/app-state"
import { IAttribute } from "../models/data/attribute"
import { isCollectionModel } from "../models/data/collection"
import { GlobalValueManager } from "../models/global/global-value-manager"
// import { IDataSet } from "../models/data/data-set"
import { getSharedDataSets } from "../models/shared/shared-data-utils"
import { getTilePrefixes } from "../models/tiles/tile-content-info"
import { ITileModel } from "../models/tiles/tile-model"
import { toV3AttrId, toV3CaseId, toV3GlobalId, toV3Id, toV3TileId } from "../utilities/codap-utils"
import { ActionName, DIResources, DIResourceSelector } from "./data-interactive-types"
import { canonicalizeAttributeName, getCollection } from "./data-interactive-utils"

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
    // We look for every possible v3 id the component might have (because each tile type has a different prefix).
    // Is there a better way to do this?
    const possibleIds =
      [component, toV3TileId(component), ...getTilePrefixes().map(prefix => toV3Id(prefix, component))]
    const componentId = possibleIds.find(id => document.content?.getTile(id))
    if (componentId) result.component = document.content?.getTile(componentId)
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
      result.collectionList = [...Array.from(dataContext.collections), dataContext.ungrouped]
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
    const canonicalAttrName = canonicalizeAttributeName(attrNameOrId)
    result[attrKey] =
      // check collection first in case of ambiguous names in data set
      collectionModel?.getAttributeByName(attrNameOrId) || collectionModel?.getAttributeByName(canonicalAttrName) ||
      dataContext?.getAttributeByName(attrNameOrId) || dataContext?.getAttributeByName(canonicalAttrName) ||
      dataContext?.getAttribute(toV3AttrId(attrNameOrId)) // in case it's an id
  }

  if ("attributeList" in resourceSelector) {
    const attributeList: IAttribute[] = []
    const attributes = collectionModel?.attributes ?? dataContext?.ungroupedAttributes ?? []
    attributes.forEach(attribute => {
      if (attribute) attributeList.push(attribute)
    })
    result.attributeList = attributeList
  }

  const getCaseById = (caseId: string) =>
    dataContext?.pseudoCaseMap.get(caseId)?.pseudoCase ?? dataContext?.getCase(caseId)
  
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

  // if (resourceSelector.caseSearch) {
  //   result.caseSearch = collection && collection.searchCases(resourceSelector.caseSearch);
  // }

  // if (resourceSelector.caseFormulaSearch) {
  //   result.caseFormulaSearch = collection && collection.searchCasesByFormula(resourceSelector.caseFormulaSearch);
  // }

  // if (resourceSelector.item) {
  //   const dataSet = result.dataContext && result.dataContext.get('dataSet');
  //   result.item = dataSet && serializeItem(dataSet,
  //       dataSet.getDataItem(Number(resourceSelector.item)));
  // }

  // if (resourceSelector.itemByID) {
  //   const dataSet = result.dataContext && result.dataContext.get('dataSet');
  //   result.itemByID = dataSet &&
  //       serializeItem(dataSet,dataSet.getDataItemByID(resourceSelector.itemByID));
  // }

  // if (resourceSelector.itemSearch) {
  //   const dataSet = result.dataContext && result.dataContext.get('dataSet');
  //   result.itemSearch = dataSet && dataSet.getItemsBySearch(
  //       resourceSelector.itemSearch) ;
  // }

  // if (resourceSelector.itemByCaseID) {
  //   var myCase = result.dataContext && result.dataContext.getCaseByID(resourceSelector.itemByCaseID);
  //   const dataSet = result.dataContext && result.dataContext.get('dataSet');
  //   result.itemByCaseID = dataSet && myCase && serializeItem(dataSet, myCase.get('item'));
  // }

  // DG.ObjectMap.forEach(resourceSelector, function (key, value) {
  //   // Make sure we got values for every non-terminal selector.
  //   if (SC.none(result[key]) && (key !== 'type') && (key !== resourceSelector.type)) {
  //     throw (new Error('Unable to resolve %@: %@'.loc(key, value)));
  //     //DG.log('Unable to resolve %@: %@'.loc(key, value));
  //   }
  // });
  return result
}
