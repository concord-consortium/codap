// ==========================================================================
//                      DG.GlobalValue Unit Test
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

module('DG.GlobalValue', {
  setup: function () {
    DG.Document.createDocument();
  },
  teardown: function () {
    DG.Document.destroyDocument(DG.activeDocument);
  }
});

test('test DG.GlobalValue', function () {
  var doc = DG.activeDocument,
    tGlobal = DG.GlobalValue.createGlobalValue({document: doc, name: 'v1', value: 0.5}),
    tGlobalID = tGlobal.get('id'),
    tFoundInDocument = DG.activeDocument.globalValues[tGlobalID],
    tFoundInStore = DG.store.find(DG.GlobalValue, tGlobalID);

  ok(tGlobal, 'Can create global object.');
  ok(tGlobalID, 'Global object has ID');
  equals(tFoundInDocument && tFoundInDocument.get('id'), tGlobalID,
    'Newly-created global value is findable in document');
  equals(tFoundInStore && tFoundInStore.get('id'), tGlobalID,
    'Newly-created global value is findable in store');

  tGlobal = DG.GlobalValue.createGlobalValue({document: doc});
  equals(tGlobal.get('name'), '', 'default name should be empty string');

  tGlobal.set('name', 'aName');
  equals(tGlobal.get('name'), 'aName', 'Can get and set "name"');

  tGlobal.set('value', 1);
  equals(tGlobal.get('value'), 1,
    'Can get and set numeric "value"');

  DG.GlobalValue.destroyGlobalValue(tFoundInDocument);

  // When finding by ID, a record that has been destroyed will be returned,
  // so we have to check status as well as whether or not anything was returned.
  tFoundInDocument = DG.activeDocument.globalValues[tGlobalID];
  ok(!tFoundInDocument, 'Destroyed global value is not findable in document');
  tFoundInStore = DG.store.find(DG.GlobalValue, tGlobalID);
  ok(!tFoundInStore, 'Destroyed global value is not findable in store');
});

