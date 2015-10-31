// ==========================================================================
//                        DG.Case Model Unit Test
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
 * Created by jsandoe on 10/24/14.
 */

sc_require('models/case_model');
sc_require('utilities/object_map');

module('DG.Case', {
  setup: function () {
    DG.Document.createDocument({name: 'test-doc'});
  },
  teardown: function () {
    DG.activeDocument = null;
    DG.store = DG.ModelStore.create();
  }
});

test('test DG.Case', function () {
  var tPropsParentCollection = {
      name: 'Parent Collection',
      description: 'A parent collection'
    },
    tPropsChildCollection = {
      name: 'Child Collection',
      description: 'A child collection'
    },
    tContext = DG.activeDocument.createContext({}),
    tParentCollectionModel = tContext.createCollection(tPropsParentCollection),
    tChildCollectionModel,
    tParentAttrs = [],
    tChildAttrs = [],
    tParentCase = [],
    tChildCase = [],
    tID;

  tPropsChildCollection.parent = tParentCollectionModel;
  tChildCollectionModel = tContext.createCollection(tPropsChildCollection);

  // preparation
  tParentAttrs[0] = tParentCollectionModel.createAttribute({name: 'attrP1'});
  tParentAttrs[1] = tParentCollectionModel.createAttribute({name: 'attrP2'});

  tChildAttrs[0] = tChildCollectionModel.createAttribute({name: 'attrC1'});
  tChildAttrs[1] = tChildCollectionModel.createAttribute({name: 'attrC2'});

  // creation
  tParentCase[0] = tParentCollectionModel.createCase(
    {values: {attrP1: '1', attrP2: 'a'}});
  tParentCase[1] = tParentCollectionModel.createCase({values: {attrP1: '2'}});
  ok(tParentCase[0] && tParentCase[1], 'Can create parent Cases.');
  tChildCase[0] = tChildCollectionModel.createCase(
    {values: ['3', 'c'], parent: tParentCase[0]});
  tChildCase[1] = tChildCollectionModel.createCase({
    values: ['4', 'd'], parent: tParentCase[0]});
  tChildCase[2] = tChildCollectionModel.createCase({
    values: ['5', 'e'], parent: tParentCase[1]});
  ok(tChildCase[0] && tChildCase[1] && tChildCase[2],
    'Can create child Cases.');
  equals(tParentCase[0].get('children').length, 2, 'Parent has a reference to children.');
  equals(tParentCase[1].get('children').length, 1, 'Parent has a reference to children.');

  // access
  tID = tParentCase[0].id;
  equals(DG.store.find(DG.Case, tID), tParentCase[0],
    'Can find Case through DG.store.find');

  // properties
  ok(tParentCase[0].hasValue(tParentAttrs[0].id),
    'Can determine if case has value.');
  ok(!tParentCase[1].hasValue(tParentAttrs[1].id),
    'Can determine if case missing value.');
  equals(tParentCase[0].getValue(tParentAttrs[0].id), '1',
    'Can get case value.');
  equals(tParentCase[0].getStrValue(tParentAttrs[0].id), '1',
    'Can get string case value.');
  equals(tParentCase[0].getNumValue(tParentAttrs[0].id), 1,
    'Can get numeric case value.');
  tParentCase[0].beginCaseValueChanges();
  tParentCase[0].setValue(tParentAttrs[0].id, '11');
  tParentCase[0].endCaseValueChanges();
  equals(tParentCase[0].getValue(tParentAttrs[0].id), '11',
    'Can change case value.');

  ok(!tParentCase[0].get('parent'), 'Parent case has no parent');
  ok(tChildCase[1].get('parent'), 'Child case has parent');

  // deletion
  DG.Case.destroyCase(tParentCase[0]);
  ok(SC.empty(DG.store.find(DG.Case, tID)),
    'Cannot find deleted Case through DG.store.find');

});
