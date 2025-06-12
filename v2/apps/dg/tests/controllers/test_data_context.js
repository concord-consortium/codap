/**
 * Created by jsandoe on 11/3/14.
 */
module("DG.DataContext", {
  setup: function () {
    DG.Document.createDocument();
  },
  teardown: function () {
    DG.activeDocument = null;
    DG.store = DG.ModelStore.create();
  }
});
test("test DG.DataContext", function () {
  var tDataContextRecord = DG.activeDocument.createContext({
      document: DG.activeDocument
    }),
    tDataContext = DG.DataContext.factory({
      type: tDataContextRecord.type,
      model: tDataContextRecord
    }),
    tParentCollection = tDataContext.createCollection({
      name: 'cA',
      description: 'A parent collection'
    }),
    tChildCollection = tDataContext.createCollection({
      name: 'cB',
      description: 'A child collection',
      parent: tParentCollection.getPath('collection.id')
    }), rslt;
  ok(tDataContext, 'Can create a Data Context');
  equals(tDataContext.collectionCount(), 2, 'Can get collection count.');
  equals(tDataContext.getCollectionByName('cB').get('name'), 'cB', 'Can get collection by name.');
  equals(tDataContext.getCollectionByID(tChildCollection.get('id')).get('name'), 'cB', 'Can get collection by id.');
  equals(tDataContext.getCollectionAtIndex(1).get('name'), 'cB', 'Can get collection at index.');
  equals(tDataContext.getParentCollection(tChildCollection).get('name'), 'cA', 'Can get parent of a collection.');
  equals(tDataContext.getChildCollection(tParentCollection).get('name'), 'cB', 'Can get child of a collection.');
  equals(tDataContext.get('childCollection').get('name'), 'cB', 'Can get child collection.');
  equals(tDataContext.get('parentCollection').get('name'), 'cA', 'Can get parent collection.');
  tDataContext.doCreateAttributes({
                  operation: 'createAttributes',
                  collection: tDataContext.getCollectionByName('cA'),
                  attrPropsArray: [ {name: 'attrA1'}, {name: 'attrA2'} ]
                });
  tDataContext.doCreateAttributes({
                  operation: 'createAttributes',
                  collection: tDataContext.getCollectionByName('cB'),
                  attrPropsArray: [ {name: 'attrB1'}, {name: 'attrB2'} ]
                });
  equals(tDataContext.getAttributeByName('attrB1').get('name'),'attrB1', 'Can get attributes.');
  rslt = tDataContext.doCreateCases({
                        operation: 'createCases',
                        collection: tDataContext.getCollectionByName('cA'),
                        values: [ [1, 2], [3, 4] ]
                      });
  equals(rslt.caseIDs.length, 2, 'Can create parent cases');
  ok(tDataContext.getCaseByID(rslt.caseIDs[0]), 'Can get cases by id.');
  /*
   addCollection
   applyChange
   attrFormulaDidChange
   clearContextMap
   collectionDefaults
   createStorage
   destroy
   didAddCollection
   didCreateCollection
   doCreateAttributes
   doCreateCases
   doCreateCollection
   doDeleteAttributes
   doDeleteCases
   doResetCollections
   doSelectCases
   doUpdateAttributes
   doUpdateCases
   exportCaseData
   factory
   forEachCollection
   forEachContextInMap
   getAttributeByName
   getAttrRefByID
   getAttrRefByName
   getCaseByID
   getCaseCountString
   getCaseNameForCount
   getCollectionForAttribute
   getCollectionForCase
   getContextFromCollection
   getLabelForSetOfCases
   getSelectedCases
   guaranteeCollection
   init
   performChange
   restoreFromStorage
   retrieveContextFromMap
   setCaseValuesFromArray
   storeContextInMap
   toLink
   willRemoveCollection
   willSaveContext
   _changeCount
   _collectionClients
   _contextMap
   _prevChangeCount
   changeCount
   changes
   childCollection
   collections
   id
   lastChange
   model
   newChanges
   parentCollection
   registry
   selectionChangeCount
   type
   */
});
