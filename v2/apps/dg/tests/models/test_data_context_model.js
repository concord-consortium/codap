// ==========================================================================
//                      DG.Context Unit Test
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
 * Created by jsandoe on 10/21/14.
 */

module('DG.Context', {
  setup: function () {
    DG.Document.createDocument();
  },
  teardown: function () {
    DG.activeDocument = null;
    DG.store = DG.ModelStore.create();
  }
});

test('test DG.Context', function () {
  var tProps = {
      document: DG.activeDocument
    },
    tObj = DG.activeDocument.createContext(tProps),
    tID = tObj.get('id'),
    tFoundInDocument = DG.activeDocument.contexts[tID],
    tFoundInStore = DG.store.find(DG.DataContextRecord, tID);

  ok(tObj, 'Can create DataContextRecord');
  ok(tID, 'DataContextRecord has ID');
  equals(tFoundInDocument && tFoundInDocument.get('id'), tID,
    'Newly created context should be findable in document.');
  equals(tFoundInStore && tFoundInStore.get('id'), tID,
    'Newly created context should be findable in store.');

  DG.DataContextRecord.destroyContext(tFoundInDocument);

  // When finding by ID, a record that has been destroyed will be returned,
  // so we have to check status as well as whether or not anything was returned.
  tFoundInDocument = DG.activeDocument.contexts[tID];
  ok(!tFoundInDocument, 'Destroyed context is not findable in document');
  tFoundInStore = DG.store.find(DG.DataContextRecord, tID);
  ok(!tFoundInStore, 'Destroyed context is not findable in store');
});
