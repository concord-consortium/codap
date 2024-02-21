import { appState } from "../models/app-state"
import { IDataSet } from "../models/data/data-set"
import { getSharedDataSets } from "../models/shared/shared-data-utils"
import { ActionName, DIResources, DIResourceSelector, maybeString } from "./data-interactive-types"

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
  result.type = ''
  selectors?.forEach(selector => {
    const match = clauseRE.exec(selector)
    const resourceType = match?.[1]
    const resourceName = match?.[2]
    if (resourceType) {
      // TODO: any type
      (result as any)[resourceType] = resourceName || ""
      result.type = resourceType
    }
  })

  return result
}

/**
 *
 * @param {object} resourceSelector Return value from parseResourceSelector
 * @param {string} action           Action name: get, create, update, delete, notify
 * @returns {{interactiveFrame: DG.DataInteractivePhoneHandler}}
 */
export function resolveResources(resourceSelector: DIResourceSelector, action: ActionName) {
  function resolveContext(selector?: maybeString, myContext?: IDataSet) {
    if (!selector) {
      return
    }
    if (selector === '#default') {
      return myContext;
    } else {
      const document = appState.document
      return document.getContextByName(resourceSelector.dataContext)
        || (!isNaN(Number(resourceSelector.dataContext))
          && document.getContextByID(resourceSelector.dataContext))
        || null
    }
  }

  const result: DIResources = { interactiveFrame: this.controller}

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
    result.dataContext = resolveContext(resourceSelector.dataContext, this.controller?.context)
  }

  const dataContext = result.dataContext;

  if (resourceSelector.component) {
    result.component = appState.document.getComponentByName(resourceSelector.component)
      || (!isNaN(Number(resourceSelector.component))
        && appState.document.getComponentByID(resourceSelector.component))
  }

  if (resourceSelector.global) {
    result.global = DG.globalsController.getGlobalValueByName(resourceSelector.global)
      || DG.globalsController.getGlobalValueByID(resourceSelector.global)
  }

  if (resourceSelector.dataContextList) {
    result.dataContextList = (getSharedDataSets(appState.document).map(sharedDataSet => sharedDataSet.dataSet) as IDataSet[])
      .map(dataSet => {
        return {
          name: dataSet.name,
          guid: dataSet.id,
          title: dataSet.name
        }
      })
  }

  if (resourceSelector.collection) {
    result.collection = dataContext &&
      (dataContext.getCollectionByName(resourceSelector.collection)
        || (!isNaN(Number(resourceSelector.collection))
          && dataContext.getCollection(resourceSelector.collection)))
  }

  const collection = result.collection;

  if (resourceSelector.attribute || resourceSelector.attributeLocation) {
    const attrKey = resourceSelector.attribute?'attribute':'attributeLocation';
    const attrName = resourceSelector[attrKey];
    result[attrKey] = (
      (
        dataContext && (
            dataContext.getAttributeByName(attrName) ||
            dataContext.getAttributeByName(dataContext.canonicalizeName(attrName))
        )
      ) ||
      (
        !isNaN(attrName) &&
        collection && collection.getAttributeByID(attrName)
      )
    );
  }

  if (resourceSelector.caseByID) {
    result.caseByID = dataContext.getCaseByID(resourceSelector.caseByID);
  }

  if (resourceSelector.caseByIndex) {
    result.caseByIndex = collection && collection.getCaseAt(Number(resourceSelector.caseByIndex));
  }

  if (resourceSelector.caseSearch) {
    result.caseSearch = collection && collection.searchCases(resourceSelector.caseSearch);
  }

  if (resourceSelector.caseFormulaSearch) {
    result.caseFormulaSearch = collection && collection.searchCasesByFormula(resourceSelector.caseFormulaSearch);
  }

  if (resourceSelector.item) {
    const dataSet = result.dataContext && result.dataContext.get('dataSet');
    result.item = dataSet && serializeItem(dataSet,
        dataSet.getDataItem(Number(resourceSelector.item)));
  }

  if (resourceSelector.itemByID) {
    const dataSet = result.dataContext && result.dataContext.get('dataSet');
    result.itemByID = dataSet &&
        serializeItem(dataSet,dataSet.getDataItemByID(resourceSelector.itemByID));
  }

  if (resourceSelector.itemCount != null) {
    result.itemCount = result.dataContext && result.dataContext.get('itemCount');
  }

  if (resourceSelector.itemSearch) {
    const dataSet = result.dataContext && result.dataContext.get('dataSet');
    result.itemSearch = dataSet && dataSet.getItemsBySearch(
        resourceSelector.itemSearch) ;
  }

  if (resourceSelector.itemByCaseID) {
    var myCase = result.dataContext && result.dataContext.getCaseByID(resourceSelector.itemByCaseID);
    const dataSet = result.dataContext && result.dataContext.get('dataSet');
    result.itemByCaseID = dataSet && myCase && serializeItem(dataSet, myCase.get('item'));
  }

  DG.ObjectMap.forEach(resourceSelector, function (key, value) {
    // Make sure we got values for every non-terminal selector.
    if (SC.none(result[key]) && (key !== 'type') && (key !== resourceSelector.type)) {
      throw (new Error('Unable to resolve %@: %@'.loc(key, value)));
      //DG.log('Unable to resolve %@: %@'.loc(key, value));
    }
  });
  return result;
}
