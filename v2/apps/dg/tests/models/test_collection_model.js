// ==========================================================================
//                      DG.CollectionModel Unit Test
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

module('DG.Collection', {
  setup: function () {
    DG.Document.createDocument();
  },
  teardown: function () {
    DG.activeDocument = null;
    DG.store = DG.ModelStore.create();
  }
});

test('test DG.Collection', function () {
  var tParentProps = {
      name: 'Collection A',
      description: 'A parent collection'
    },
    tChildProps = {
      name: 'Collection B',
      description: 'A child collection'
    },
    tContext = DG.activeDocument.createContext({}),
    tParentCollectionModel = tContext.createCollection(tParentProps),
    tParentID = tParentCollectionModel.get('id'),
    tChildCollectionModel, tChildID, tAttr1, tAttr2,
    tNames, tIDs, tParentCase1, tParentCase2, tCaseIDs;

  ok(tParentCollectionModel, 'Can create parent CollectionModel.');
  ok(tParentID, 'Parent CollectionModel has ID.');
  tChildProps.parent = tParentCollectionModel;
  tChildCollectionModel = tContext.createCollection(tChildProps);
  ok(tChildCollectionModel, 'Can create child CollectionModel');
  tChildID = tChildCollectionModel.get('id');
  ok(tChildID, 'Child CollectionModel has ID.');

  ok(!tChildCollectionModel.isAncestorOf(tParentCollectionModel),
    'Child is not ancestor of parent.');
  ok(tChildCollectionModel.isDescendantOf(tParentCollectionModel),
    'Child is descendant of parent.');
  ok(tParentCollectionModel.isAncestorOf(tChildCollectionModel),
    'Parent is ancestor of child.');
  ok(!tParentCollectionModel.isDescendantOf(tChildCollectionModel),
    'Parent is not descendant of child.');

  tAttr1 = tParentCollectionModel.createAttribute({ name: 'first' });
  ok(tAttr1, 'Can create attribute');
  tAttr2 = tParentCollectionModel.createAttribute({ name: 'second' });
  tNames = tParentCollectionModel.getAttributeNames();
  equals(tNames.length, 2, 'Count attribute names is correct.');
  tIDs = tParentCollectionModel.getAttributeIDs();
  equals(tIDs.length, 2, 'Count attribute IDs is correct.');
  equals(tNames[0], tAttr1.name, 'Get correct attribute names.');
  equals(tIDs[1], tAttr2.id, 'Get correct attribute ids.');

  tParentCase1 = tParentCollectionModel.createCase({values: {first: '1', second: 'a'}});
  tParentCase2 = tParentCollectionModel.createCase({values: {first: '2', second: 'b'}});
  ok(tParentCase1 && tParentCase2, 'ParentCases created');
  tCaseIDs = tParentCollectionModel.getCaseIDs();
  ok(tCaseIDs, 'Can get case ids.');
  equals(tCaseIDs.length, 2, 'Count case ids is correct.');
  // tParentCollectionModel.deleteCase(tParentCase2);
  // tCaseIDs = tParentCollectionModel.getCaseIDs();
  // equals(tCaseIDs.length, 1, 'After deleting a case, count case ids is still correct.');
});
