// ==========================================================================
//                      DG.CollectionRecord Unit Test
//
//  Copyright (c) 2014 by The Concord Consortium, Inc. All rights reserved.
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.
// ==========================================================================
/**
 * Created by jsandoe on 10/23/14.
 */

module('DG.CollectionRecord', {
  setup: function () {
    DG.Document.createDocument();
  },
  teardown: function () {
    DG.activeDocument = null;
    DG.store = DG.ModelStore.create();
  }
});

test('test DG.CollectionRecord', function () {
  var tParentProps = {
      name: 'Collection A',
      description: 'A parent collection'
    },
    tChildProps = {
      name: 'Collection B',
      description: 'A child collection'
    },
    tContext = DG.activeDocument.createContext({}),
    tParentCollection = tContext.createCollection(tParentProps),
    tParentID = tParentCollection.get('id'),
    tFoundInDocument,
    tFoundInStore,
    tChildCollection, tChildID;
  ok(tParentCollection, 'Can create parent CollectionRecord');
  ok(tParentID, 'Parent CollectionRecord has ID');
  tFoundInDocument = tContext.collections[tParentID];
  tFoundInStore = DG.store.find(DG.Collection, tParentID);
  equals(tFoundInDocument && tFoundInDocument.get('id'), tParentID,
    'Newly created parent collection should be findable in context.');
  equals(tFoundInStore && tFoundInStore.get('id'), tParentID,
    'Newly created parent collection should be findable in store.');

  tChildProps.parent = tParentCollection;
  ok(tParentCollection, 'Can create child CollectionRecord');
  tChildCollection = tContext.createCollection(tChildProps);
  ok(tParentID, 'Child CollectionRecord has ID');
  tChildID = tChildCollection.get('id');

  tFoundInDocument = tContext.collections[tChildID];
  tFoundInStore = DG.store.find(DG.Collection, tChildID);
  equals(tFoundInDocument && tFoundInDocument.get('id'), tChildID,
    'Newly created child collection should be findable in context');
  equals(tFoundInStore && tFoundInStore.get('id'), tChildID,
    'Newly created child collection should be findable in store');

  // verify that the parent's children array is updated
  equals(tParentCollection.children.length, 1, 'Child is registered with parent.');
  ok(!tChildCollection.isAncestorOf(tParentCollection), 'Child is not ancestor of parent.');
  ok(tChildCollection.isDescendantOf(tParentCollection), 'Child is descendant of parent.');
  ok(tParentCollection.isAncestorOf(tChildCollection), 'Parent is ancestor of child.');
  ok(!tParentCollection.isDescendantOf(tChildCollection), 'Parent is not descendant of child.');

  equals(tParentCollection.get('name'), tParentProps.name, 'Can get collection name.');
  equals(tParentCollection.get('description'), tParentProps.description, 'Can get collection description.');

  // ToDo: caseIDToIndexMap untested

  // getAttributeByName tested in test_attribute_model

  DG.CollectionRecord.destroyCollection(tFoundInDocument);

  // When finding by ID, a record that has been destroyed will be returned,
  // so we have to check status as well as whether or not anything was returned.
  tFoundInDocument = tContext.collections[tChildID];
  ok(!tFoundInDocument, 'Destroyed child collection is not findable in context.');
  tFoundInStore = DG.store.find(DG.Collection, tChildID);
  ok(!tFoundInStore, 'Destroyed child context is not findable in store.');
  // make sure the child collection is no longer in the parent record
  equals(tParentCollection.children.length, 0, 'Child is removed from parent.');

});
